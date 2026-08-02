const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

const BusinessIdea = require('../models/BusinessIdea');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay Order
// @route   POST /api/user/data/razorpay/create-order
// @access  Private
exports.createOrder = asyncHandler(async (req, res, next) => {
    const { amount, type, ideaId, planName: reqPlanName, planDuration: reqPlanDuration, durationInDays: reqDurationInDays } = req.body; // amount in INR
    const user = await User.findById(req.user.id);

    let finalAmount = 499; // Default for platform unlock
    let planName = 'Lifetime Access';
    let pType = 'PLATFORM_UNLOCK';
    let durationDays = reqDurationInDays || 30;

    if (type === 'BUSINESS_IDEA_UNLOCK') {
        const idea = await BusinessIdea.findById(ideaId);
        if (!idea) return next(new ErrorResponse('Business Idea not found', 404));
        if (user.unlockedIdeas.includes(ideaId)) return next(new ErrorResponse('Already unlocked', 400));
        
        finalAmount = idea.price;
        planName = `Unlock: ${idea.title}`;
        pType = 'BUSINESS_IDEA_UNLOCK';
    } else if (type === 'SUPPORT_CHAT_RENEWAL') {
        finalAmount = 150;
        planName = '3 Months Support Extension';
        pType = 'SUPPORT_CHAT_RENEWAL';
        durationDays = 90;
    } else if (type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') {
        const isSupport = type === 'SUPPORT_BOOSTER';
        
        // Both boosters can be active simultaneously
        const boosterType = type === 'SUPPORT_BOOSTER' ? 'support' : 'task';
        const Booster = require('../models/Booster');
        const booster = await Booster.findOne({ type: boosterType });
        const originalPrice = booster ? booster.price : (boosterType === 'support' ? 22 : 49);
        
        finalAmount = originalPrice * 1.04; // adding 4% markup
        planName = booster ? booster.title : (boosterType === 'support' ? 'Support Booster' : 'Task Booster');
        pType = type;
        durationDays = 30;
    } else if (type === 'BUSINESS_HUB_PLAN') {
        const { planName: pName } = req.body;
        finalAmount = amount;
        planName = pName || 'Business Hub Plan';
        pType = 'BUSINESS_HUB_PLAN';
        durationDays = reqDurationInDays || 30;
    } else {
        if (user.isPaid) return next(new ErrorResponse('Platform already unlocked.', 400));
        durationDays = 9999; // Lifetime
    }

    // Create order on Razorpay servers
    const order = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100), // convert precisely to paise integer
        currency: 'INR',
        receipt: `rcpt_${req.user.id.toString().slice(-6)}_${Date.now()}`,
        notes: {
            userId: req.user.id.toString(),
            type: pType,
            ideaId: ideaId || '',
            durationInDays: durationDays
        },
    });

    // Save a pending payment record in DB — snapshot user info for permanent audit trail
    await Payment.create({
        user: req.user.id,
        userName: user.name || '',
        userEmail: user.email || '',
        userPhone: user.phone || '',
        plan: planName,
        paymentType: pType,
        planDuration: reqPlanDuration || 'Monthly',
        durationInDays: durationDays,
        businessIdea: ideaId || null,
        amount: finalAmount,
        method: 'Razorpay',
        razorpayOrderId: order.id,
        status: 'Pending',
    });

    // Send push notification to all admins
    try {
        const { sendNotificationToAllAdmins } = require('./fcmController');
        await sendNotificationToAllAdmins({
            title: 'Manual Deposit Pending 💰',
            body: `User ${user.name} uploaded a receipt for ₹${finalAmount}. Approve or decline.`,
            data: {
                type: 'deposit_alert',
                link: '/admin/deposits'
            }
        });
    } catch (pushErr) {
        console.error('Admin push notification failed for manual deposit pending:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
    });
});

// @desc    Verify Razorpay Payment
// @route   POST /api/user/data/razorpay/verify
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return next(new ErrorResponse('Payment verification data missing', 400));
    }

    // Verify HMAC signature
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (expectedSignature !== razorpay_signature) {
        if (payment) {
            payment.status = 'Failed';
            payment.remarks = 'Signature verification failed';
            await payment.save();
        }
        return next(new ErrorResponse('Payment verification failed. Invalid signature.', 400));
    }

    // ✅ Valid payment — update record and unlock
    if (payment) {
        payment.status = 'Success';
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.processedAt = new Date();
        await payment.save();

        const user = await User.findById(req.user.id);
        if (!user) return next(new ErrorResponse('User not found during unlock', 404));

        if (payment.paymentType === 'BUSINESS_IDEA_UNLOCK' && payment.businessIdea) {
            console.log(`[PAYMENT] Unlocking Business Idea ${payment.businessIdea} for user ${user._id}`);
            // Unlock Business Idea
            if (!user.unlockedIdeas.includes(payment.businessIdea)) {
                user.unlockedIdeas.push(payment.businessIdea);
                await user.save();
            }

            // Create standard Transaction for user history
            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'debit',
                currency: 'INR',
                amount: payment.amount,
                source: payment.plan || 'Business Idea Unlock',
                status: 'Success'
            });
        } else if (payment.paymentType === 'SUPPORT_BOOSTER' || payment.paymentType === 'TASK_BOOSTER') {
            console.log(`[PAYMENT] Activating Booster ${payment.paymentType} for user ${user._id}`);
            
            const expiryDate = new Date();

            if (payment.paymentType === 'SUPPORT_BOOSTER') {
                // Event Support Kit — valid until used in one event (fallback 30 days)
                expiryDate.setDate(expiryDate.getDate() + 30);
                user.isSupportBoosterActive = true;
                user.supportBoosterExpiry = expiryDate;
                // Do NOT deactivate Task Booster — both can be active
            } else {
                expiryDate.setHours(expiryDate.getHours() + 24);
                user.isTaskBoosterActive = true;
                user.taskBoosterExpiry = expiryDate;
                // Do NOT deactivate Support Booster
            }

            // Legacy flag mirrors whichever booster is active
            user.isBoosterActive = !!(user.isSupportBoosterActive || user.isTaskBoosterActive);
            user.boosterExpiry = expiryDate;
            
            await user.save();

            // Create standard Transaction for user history
            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'debit',
                currency: 'INR',
                amount: payment.amount,
                source: payment.plan || (payment.paymentType === 'SUPPORT_BOOSTER' ? 'Event Support Kit' : 'Daily Boost Pass'),
                status: 'Success'
            });
        } else {
            console.log(`[PAYMENT] Unlocking Platform for user ${user._id}`);
            
            // Check if this user was referred by someone
            if (user.referredBy && !user.isPaid) {
                try {
                    const settings = await Settings.findOne();
                    const commission = settings ? settings.referralCommission : 200;
                    const referralSystemEnabled = settings ? settings.referralSystemEnabled : true;

                    if (referralSystemEnabled) {
                        const referrer = await User.findById(user.referredBy);
                        if (referrer) {
                            // Update Referrer Wallet
                            referrer.wallet.balance += commission;
                            referrer.wallet.referralEarnings += commission;
                            referrer.wallet.lifetimeEarnings += commission;
                            await referrer.save();

                            // Create Referral Audit Log
                            await ReferralTransaction.create({
                                referrer: referrer._id,
                                referredUser: user._id,
                                amount: commission,
                                status: 'Completed'
                            });

                            // Create standard Transaction for user history
                            const Transaction = require('../models/Transaction');
                            await Transaction.create({
                                user: referrer._id,
                                type: 'credit',
                                currency: 'INR',
                                amount: commission,
                                source: `Referral Reward: ${user.name}`,
                                status: 'Success'
                            });

                            console.log(`[REFERRAL] Credited ₹${commission} to referrer ${referrer._id} for user ${user._id}`);

                            // Send Push Notification to Referrer
                            try {
                                const { sendNotificationToUser } = require('./fcmController');
                                await sendNotificationToUser(referrer._id, {
                                    title: 'Commission Received! 💰',
                                    body: `You have earned a direct referral commission of ₹${commission} from ${user.name}'s purchase!`,
                                    data: {
                                        type: 'commission',
                                        link: '/user/income'
                                    }
                                });
                            } catch (pushErr) {
                                console.error('Push notification failed for referral commission:', pushErr.message);
                            }
                        }
                    }
                } catch (refErr) {
                    console.error('[REFERRAL ERROR] Failed to process reward:', refErr.message);
                    // We don't block the main payment success if referral fails
                }
            }

            // Set user isPaid = true (Platform Unlock)
            user.isPaid = true;
            user.unlockedAt = new Date();
            
            // If it's a Business Hub Plan, set supportExpiry
            if (payment.paymentType === 'BUSINESS_HUB_PLAN') {
                const daysToAdd = payment.durationInDays || 30;
                
                let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date() 
                    ? new Date(user.supportExpiry) 
                    : new Date();
                
                currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
                user.supportExpiry = currentExpiry;
                user.activeBusinessPlan = payment.plan || 'Premium Plan';
                user.businessPlanStatus = 'active';
            }
            
            await user.save();

            // Create standard Transaction for user history
            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'debit',
                currency: 'INR',
                amount: payment.amount,
                source: payment.plan || 'Platform Unlock',
                status: 'Success'
            });
        }

        // Send Push Notifications to User based on purchase type
        try {
            const { sendNotificationToUser } = require('./fcmController');
            if (payment.paymentType === 'SUPPORT_BOOSTER' || payment.paymentType === 'TASK_BOOSTER') {
                const boosterName = payment.paymentType === 'SUPPORT_BOOSTER' ? 'Event Support Kit' : 'Daily Boost Pass';
                await sendNotificationToUser(user._id, {
                    title: 'Utility Pass Activated! ⚡',
                    body: `Your ${boosterName} is active! Enjoy enhanced performance for the next 30 days.`,
                    data: {
                        type: 'booster',
                        link: '/user/home'
                    }
                });
            } else {
                await sendNotificationToUser(user._id, {
                    title: 'Platform Access Unlocked! 🚀',
                    body: `Your payment for ${payment.plan || 'Lifetime Access'} is confirmed. Welcome to DroMoney Premium!`,
                    data: {
                        type: 'payment',
                        link: '/user/home'
                    }
                });
            }
        } catch (pushErr) {
            console.error('[FCM] Razorpay payment push failed:', pushErr.message);
        }
    }

    res.status(200).json({
        success: true,
        message: 'Payment verified successfully!',
    });
});

// @desc    Submit Manual Payment Proof
// @route   POST /api/user/data/manual-payment
// @access  Private
exports.submitManualPayment = asyncHandler(async (req, res, next) => {
    const { amount, type, ideaId, planName: reqPlanName, planDuration: reqPlanDuration, durationInDays: reqDurationInDays, utrNumber } = req.body;

    if (!utrNumber || utrNumber.length !== 12) {
        return next(new ErrorResponse('Please provide a valid 12-digit UTR/Ref number', 400));
    }

    if (!req.file) {
        return next(new ErrorResponse('Please upload a screenshot of your payment', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    let finalAmount = parseFloat(amount);
    let planName = reqPlanName || 'Manual Payment';
    let pType = type || 'PLATFORM_UNLOCK';
    let durationDays = reqDurationInDays || 30;

    if (!reqPlanName) {
        if (pType === 'PLATFORM_UNLOCK') {
            planName = 'Lifetime Access';
            durationDays = 9999;
        } else if (pType === 'SUPPORT_BOOSTER') {
            planName = 'Support Booster';
        } else if (pType === 'TASK_BOOSTER') {
            planName = 'Task Booster';
        }
    }

    const cloudinary = require('cloudinary').v2;
    const { Readable } = require('stream');

    const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'dromoney/payments' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        Readable.from(req.file.buffer).pipe(stream);
    });

    const uploadResult = await uploadPromise;

    const payment = await Payment.create({
        user: req.user.id,
        userName: user.name || '',
        userEmail: user.email || '',
        userPhone: user.phone || '',
        plan: planName,
        paymentType: pType,
        planDuration: reqPlanDuration || 'Monthly',
        durationInDays: durationDays,
        businessIdea: ideaId || null,
        amount: finalAmount,
        method: 'Manual',
        utrNumber: utrNumber,
        screenshot: uploadResult.secure_url,
        status: 'Pending',
        processedAt: null
    });

    user.notifications = user.notifications || [];
    user.notifications.push({
        title: 'Payment Pending ⏳',
        message: 'Your payment proof has been uploaded. Please wait 10-15 mins for admin to approve your transaction.',
        type: 'info',
        createdAt: new Date()
    });
    await user.save();

    try {
        const { sendNotificationToAllAdmins } = require('./fcmController');
        await sendNotificationToAllAdmins({
            title: 'New Manual Deposit 💰',
            body: `User ${user.name} uploaded a receipt for ₹${finalAmount}. Pending approval.`,
            data: {
                type: 'deposit_alert',
                link: '/admin/payments'
            }
        });
    } catch (pushErr) {
        console.error('Admin push notification failed for manual deposit pending:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Payment proof submitted successfully! Pending admin approval.'
    });
});

// @desc    Check if user has a pending manual payment
// @route   GET /api/user/data/manual-payment/check
// @access  Private
exports.checkPendingManualPayment = asyncHandler(async (req, res, next) => {
    const { type } = req.query;
    
    let pType = type || 'PLATFORM_UNLOCK';
    
    const pendingPayment = await Payment.findOne({
        user: req.user.id,
        paymentType: pType,
        method: 'Manual',
        status: 'Pending'
    });
    
    res.status(200).json({
        success: true,
        hasPending: !!pendingPayment
    });
});

