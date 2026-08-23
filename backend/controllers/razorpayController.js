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

const {
    quotePayment,
    BOOSTER_FEE_PERCENT,
    SUPPORT_CHAT_RENEWAL_FEE,
    DEFAULT_UNLOCK_FEE,
} = require('../utils/moneyQuotes');

async function resolvePaymentQuote({ type, ideaId, planName, user }) {
    const settings = (await Settings.findOne()) || {};

    if (type === 'BUSINESS_IDEA_UNLOCK') {
        const idea = await BusinessIdea.findById(ideaId);
        if (!idea) return { error: 'Business Idea not found', status: 404 };
        if (user?.unlockedIdeas?.map(String).includes(String(ideaId))) {
            return { error: 'Already unlocked', status: 400 };
        }
        const q = quotePayment({ baseAmount: Number(idea.price) > 0 ? idea.price : 199, feePercent: 0 });
        return { ...q, planName: `Unlock: ${idea.title}`, paymentType: type, durationDays: 30 };
    }

    if (type === 'SUPPORT_CHAT_RENEWAL') {
        const q = quotePayment({ baseAmount: SUPPORT_CHAT_RENEWAL_FEE, feePercent: 0 });
        return { ...q, planName: '3 Months Support Extension', paymentType: type, durationDays: 90 };
    }

    if (type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') {
        const boosterType = type === 'SUPPORT_BOOSTER' ? 'support' : 'task';
        const Booster = require('../models/Booster');
        const booster = await Booster.findOne({ type: boosterType });
        const originalPrice = booster ? booster.price : (boosterType === 'support' ? 22 : 49);
        const q = quotePayment({ baseAmount: originalPrice, feePercent: BOOSTER_FEE_PERCENT });
        return {
            ...q,
            planName: booster ? booster.title : (boosterType === 'support' ? 'Support Booster' : 'Task Booster'),
            paymentType: type,
            durationDays: 30,
        };
    }

    if (type === 'BUSINESS_HUB_PLAN') {
        const plans = settings.businessPlans || [];
        const plan = plans.find((p) => p.title === planName);
        const q = quotePayment({ baseAmount: plan ? plan.price : 0, feePercent: 0 });
        return {
            ...q,
            planName: planName || 'Business Hub Plan',
            paymentType: type,
            durationDays: plan?.durationInDays || 30,
        };
    }

    if (user?.isPaid) return { error: 'Platform already unlocked.', status: 400 };
    const unlockFee = Number(settings.registrationFee) || DEFAULT_UNLOCK_FEE;
    const q = quotePayment({ baseAmount: unlockFee, feePercent: 0 });
    return { ...q, planName: 'Lifetime Access', paymentType: 'PLATFORM_UNLOCK', durationDays: 9999 };
}

// @desc    Payable amount quote (display only — order is still created server-side)
// @route   GET /api/user/data/payment-quote
// @access  Private
exports.getPaymentQuote = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    const quote = await resolvePaymentQuote({
        type: req.query.type,
        ideaId: req.query.ideaId,
        planName: req.query.planName,
        user,
    });
    if (quote.error) return next(new ErrorResponse(quote.error, quote.status || 400));
    res.status(200).json({ success: true, data: quote });
});

// @desc    Create Razorpay Order
// @route   POST /api/user/data/razorpay/create-order
// @access  Private
exports.createOrder = asyncHandler(async (req, res, next) => {
    const { type, ideaId, planName: reqPlanName } = req.body;
    const user = await User.findById(req.user.id);

    const quote = await resolvePaymentQuote({ type, ideaId, planName: reqPlanName, user });
    if (quote.error) return next(new ErrorResponse(quote.error, quote.status || 400));

    const finalAmount = quote.payableAmount;
    const planName = quote.planName;
    const pType = quote.paymentType;
    const durationDays = quote.durationDays;

    // One pending entry per user + payment type; reuse live Razorpay order when possible
    const { assertNoDuplicatePayment, createPaymentOnce } = require('../utils/paymentGuards');

    if (pType === 'PLATFORM_UNLOCK') {
        const existingSuccess = await Payment.findOne({
            user: req.user.id,
            paymentType: 'PLATFORM_UNLOCK',
            status: 'Success',
        });
        if (existingSuccess) {
            return next(new ErrorResponse('Platform unlock payment already completed.', 400));
        }
    }

    const existingPending = await Payment.findOne({
        user: req.user.id,
        paymentType: pType,
        status: 'Pending',
    }).sort({ createdAt: -1 });

    if (existingPending) {
        if (existingPending.razorpayOrderId) {
            try {
                const existingOrder = await razorpay.orders.fetch(existingPending.razorpayOrderId);
                return res.status(200).json({
                    success: true,
                    orderId: existingOrder.id,
                    amount: existingOrder.amount,
                    currency: existingOrder.currency || 'INR',
                    keyId: process.env.RAZORPAY_KEY_ID,
                    reused: true,
                });
            } catch (_) {
                existingPending.status = 'Failed';
                existingPending.remarks = 'Stale order replaced';
                await existingPending.save();
            }
        } else {
            return next(
                new ErrorResponse(
                    'You already have a pending payment for this plan. Please wait for approval.',
                    400
                )
            );
        }
    }

    // Final guard (race / already unlocked)
    await assertNoDuplicatePayment(req.user.id, pType);

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

    // Save exactly one pending payment record
    await createPaymentOnce({
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
        if (payment.status === 'Success') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified.',
            });
        }

        // One PLATFORM_UNLOCK Success per user — never inflate revenue
        if ((payment.paymentType || 'PLATFORM_UNLOCK') === 'PLATFORM_UNLOCK') {
            const priorSuccess = await Payment.findOne({
                user: payment.user,
                paymentType: 'PLATFORM_UNLOCK',
                status: 'Success',
                _id: { $ne: payment._id },
            });
            if (priorSuccess) {
                payment.status = 'Failed';
                payment.remarks = 'Duplicate unlock blocked — revenue already counted once';
                payment.razorpayPaymentId = razorpay_payment_id;
                payment.processedAt = new Date();
                await payment.save();
                return res.status(200).json({
                    success: true,
                    message: 'Platform already unlocked. Duplicate payment ignored.',
                });
            }
        }

        payment.status = 'Success';
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.processedAt = new Date();
        try {
            await payment.save();
        } catch (saveErr) {
            if (saveErr && saveErr.code === 11000) {
                payment.status = 'Failed';
                payment.remarks = 'Duplicate unlock blocked — revenue already counted once';
                try { await payment.save(); } catch (_) { /* ignore */ }
                return res.status(200).json({
                    success: true,
                    message: 'Platform already unlocked. Duplicate payment ignored.',
                });
            }
            throw saveErr;
        }

        if ((payment.paymentType || 'PLATFORM_UNLOCK') === 'PLATFORM_UNLOCK') {
            const { closeSiblingPlatformPayments } = require('../utils/paymentGuards');
            await closeSiblingPlatformPayments(payment.user, payment._id);
        }

        const user = await User.findById(req.user.id);
        if (!user) return next(new ErrorResponse('User not found during unlock', 404));

        if (payment.paymentType === 'BUSINESS_IDEA_UNLOCK' && payment.businessIdea) {
            console.log(`[PAYMENT] Unlocking Business Idea ${payment.businessIdea} for user ${user._id}`);
            // Unlock Business Idea
            const ideaIdStr = payment.businessIdea.toString();
            const already = (user.unlockedIdeas || []).some((id) => id && id.toString() === ideaIdStr);
            if (!already) {
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
        } else if (payment.paymentType === 'BUSINESS_HUB_PLAN') {
            const daysToAdd = payment.durationInDays || 30;
            let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date()
                ? new Date(user.supportExpiry)
                : new Date();
            currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
            user.supportExpiry = currentExpiry;
            user.activeBusinessPlan = payment.plan || 'Premium Plan';
            user.businessPlanStatus = 'active';
            await user.save();

            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'debit',
                currency: 'INR',
                amount: payment.amount,
                source: payment.plan || 'Business Hub Plan',
                status: 'Success'
            });
        } else if (payment.paymentType === 'SUPPORT_CHAT_RENEWAL') {
            const daysToAdd = payment.durationInDays || 90;
            let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date()
                ? new Date(user.supportExpiry)
                : new Date();
            currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
            user.supportExpiry = currentExpiry;
            user.businessPlanStatus = 'active';
            await user.save();

            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'debit',
                currency: 'INR',
                amount: payment.amount,
                source: payment.plan || 'Support Chat Renewal',
                status: 'Success'
            });
        } else {
            console.log(`[PAYMENT] Unlocking Virtual Account for user ${user._id}`);

            const { activateVirtualWallet } = require('../utils/walletLedger');
            await activateVirtualWallet(user);
            await user.save();

            try {
                const { creditReferralOnQualifiedUnlock } = require('../utils/referralReward');
                await creditReferralOnQualifiedUnlock(user);
            } catch (refErr) {
                console.error('[REFERRAL ERROR] Failed to process reward:', refErr.message);
            }

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
                const { notifyJourney } = require('../utils/userJourneyPush');
                await notifyJourney(user._id, 'va_activated');
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
    let durationDays = parseInt(reqDurationInDays, 10) || 30;

    if (pType === 'BUSINESS_IDEA_UNLOCK') {
        const idea = await BusinessIdea.findById(ideaId);
        if (!idea) return next(new ErrorResponse('Business Idea not found', 404));
        const alreadyUnlocked = (user.unlockedIdeas || []).some((id) => id.toString() === String(ideaId));
        if (alreadyUnlocked) return next(new ErrorResponse('Idea already unlocked', 400));
        finalAmount = Number(idea.price) > 0 ? Number(idea.price) : 199;
        planName = reqPlanName || `Unlock: ${idea.title}`;
    } else if (pType === 'SUPPORT_CHAT_RENEWAL') {
        finalAmount = 150;
        planName = reqPlanName || '3 Months Support Extension';
        durationDays = 90;
    } else if (!reqPlanName) {
        if (pType === 'PLATFORM_UNLOCK') {
            planName = 'Lifetime Access';
            durationDays = 9999;
        } else if (pType === 'SUPPORT_BOOSTER') {
            planName = 'Support Booster';
        } else if (pType === 'TASK_BOOSTER') {
            planName = 'Task Booster';
        }
    }

    // One pending / one success unlock only — stop duplicate submits
    const { assertNoDuplicatePayment, createPaymentOnce } = require('../utils/paymentGuards');
    await assertNoDuplicatePayment(req.user.id, pType, { utrNumber });

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

    const payment = await createPaymentOnce({
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
        utrNumber: String(utrNumber).trim(),
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
        const { notifyJourney } = require('../utils/userJourneyPush');
        await notifyJourney(user._id, 'va_payment_pending', { skipInApp: true });
    } catch (pushErr) {
        console.error('VA pending push failed:', pushErr.message);
    }

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

