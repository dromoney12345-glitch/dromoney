const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Get all membership payments
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        // Normalize: if user was deleted, fall back to the stored snapshot fields
        const normalized = payments.map(p => {
            const obj = p.toObject();
            if (!obj.user) {
                obj.user = {
                    _id: null,
                    name: obj.userName || 'Deleted User',
                    email: obj.userEmail || '—',
                    phone: obj.userPhone || '—',
                    isDeleted: true
                };
            }
            return obj;
        });

        res.json({
            success: true,
            data: normalized
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Verify and update payment status
// @route   PUT /api/admin/payments/:id
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        payment.status = status;
        payment.remarks = remarks;
        payment.processedAt = Date.now();
        await payment.save();

        // If success, activate the user
        if (status === 'Success') {
            const user = await User.findById(payment.user);
            if (user) {
                // Handle Booster Activations
                if (payment.paymentType === 'SUPPORT_BOOSTER' || payment.paymentType === 'TASK_BOOSTER') {
                    const isSupport = payment.paymentType === 'SUPPORT_BOOSTER';

                    // Enforce one-booster rule
                    const hasOtherBooster = isSupport ? user.isTaskBoosterActive : user.isSupportBoosterActive;
                    if (hasOtherBooster) {
                        return res.status(400).json({ success: false, message: 'User already has an active booster of the other type.' });
                    }

                    const expiryDate = new Date();
                    if (isSupport) {
                        expiryDate.setDate(expiryDate.getDate() + 30); // Fallback: Event Booster expires when event ends or weekly reset
                        user.isSupportBoosterActive = true;
                        user.supportBoosterExpiry = expiryDate;
                    } else {
                        expiryDate.setHours(expiryDate.getHours() + 24); // 24 Hours validity for ₹49 Power Booster
                        user.isTaskBoosterActive = true;
                        user.taskBoosterExpiry = expiryDate;
                    }
                    user.isBoosterActive = true;
                    user.boosterExpiry = expiryDate;
                    
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Booster Activated! ⚡',
                        message: `Your ${isSupport ? 'Event Booster' : 'Power Booster'} is now active! Enjoy ${isSupport ? 'event support benefits' : '12x coin earnings for 24 hours'}.`,
                        type: 'success',
                        isRead: false
                    });
                    await user.save();

                    // Create standard Transaction for user history
                    const Transaction = require('../models/Transaction');
                    await Transaction.create({
                        user: user._id,
                        type: 'debit',
                        currency: 'INR',
                        amount: payment.amount,
                        source: payment.plan || (isSupport ? 'Support Booster' : 'Task Booster'),
                        status: 'Success'
                    });

                    try {
                        const { sendNotificationToUser } = require('./fcmController');
                        const boosterName = isSupport ? 'Support Booster' : 'Task Booster';
                        await sendNotificationToUser(user._id, {
                            title: 'Booster Activated! ⚡',
                            body: `Your ${boosterName} is now active! Enjoy 3X coin earnings for 30 days.`,
                            data: { type: 'booster', link: '/user/home' }
                        });
                    } catch (pushErr) {
                        console.error('Push notification failed for booster activation:', pushErr.message);
                    }
                } else {
                    // Handle other payment types
                    if (payment.paymentType === 'BUSINESS_IDEA_UNLOCK' && payment.businessIdea) {
                        if (!user.unlockedIdeas.includes(payment.businessIdea)) {
                            user.unlockedIdeas.push(payment.businessIdea);
                        }
                    } else if (payment.paymentType === 'BUSINESS_HUB_PLAN') {
                        const daysToAdd = payment.durationInDays || 30;
                        let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date() 
                            ? new Date(user.supportExpiry) 
                            : new Date();
                        currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
                        user.supportExpiry = currentExpiry;
                        user.activeBusinessPlan = payment.plan || 'Premium Plan';
                        user.businessPlanStatus = 'active';
                    } else if (payment.paymentType === 'SUPPORT_CHAT_RENEWAL') {
                        const daysToAdd = payment.durationInDays || 90;
                        let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date() 
                            ? new Date(user.supportExpiry) 
                            : new Date();
                        currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
                        user.supportExpiry = currentExpiry;
                    }

                    // Default: Platform unlock
                    user.isPaid = true;

                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Platform Access Unlocked! 🚀',
                        message: `Your payment for ${payment.plan || 'Lifetime Access'} is confirmed. Welcome to DroMoney Premium!`,
                        type: 'success',
                        isRead: false
                    });

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

                    // Send Push Notification to the unlocked user
                    try {
                        const { sendNotificationToUser } = require('./fcmController');
                        await sendNotificationToUser(user._id, {
                            title: 'Platform Access Unlocked! 🚀',
                            body: `Your payment for ${payment.plan || 'Lifetime Access'} is confirmed. Welcome to DroMoney Premium!`,
                            data: {
                                type: 'payment',
                                link: '/user/home'
                            }
                        });
                    } catch (pushErr) {
                        console.error('Push notification failed for payment activation:', pushErr.message);
                    }

                    // ── REFERRAL REWARD LOGIC ──
                    // Check if user was referred by someone
                    if (user.referredBy) {
                        const Settings = require('../models/Settings');
                        const ReferralTransaction = require('../models/ReferralTransaction');
                        
                        const settings = await Settings.findOne();
                        const referrer = await User.findById(user.referredBy);

                        // Conditions: System Enabled, Referrer exists, Referrer is subscribed, Not self-referral
                        if (settings?.referralSystemEnabled && referrer && referrer.isPaid && referrer._id.toString() !== user._id.toString()) {
                            
                            try {
                                // 1. Log Transaction (Unique index on referredUser prevents duplicates)
                                await ReferralTransaction.create({
                                    referrer: referrer._id,
                                    referredUser: user._id,
                                    amount: settings.referralCommission
                                });

                                // 2. Atomic Update of Referrer Wallet
                                await User.findByIdAndUpdate(referrer._id, {
                                    $inc: {
                                        'wallet.balance': settings.referralCommission,
                                        'wallet.lifetimeEarnings': settings.referralCommission,
                                        'wallet.referralEarnings': settings.referralCommission,
                                        'referralCount': 1
                                    },
                                    $push: {
                                        notifications: {
                                            title: 'Commission Received! 💰',
                                            message: `You have earned a direct referral commission of ₹${settings.referralCommission} from ${user.name}'s purchase!`,
                                            type: 'success',
                                            isRead: false
                                        }
                                    }
                                });

                                console.log(`Referral reward of ₹${settings.referralCommission} credited to ${referrer.name} for ${user.name}`);

                                // Send Push Notification to Referrer
                                try {
                                    const { sendNotificationToUser } = require('./fcmController');
                                    await sendNotificationToUser(referrer._id, {
                                        title: 'Commission Received! 💰',
                                        body: `You have earned a direct referral commission of ₹${settings.referralCommission} from ${user.name}'s purchase!`,
                                        data: {
                                            type: 'commission',
                                            link: '/user/income'
                                        }
                                    });
                                } catch (pushErr) {
                                    console.error('Push notification failed for referral commission:', pushErr.message);
                                }
                            } catch (err) {
                                // If index unique constraint fails (code 11000), it means reward already given
                                if (err.code === 11000) {
                                    console.log('Referral reward already processed for this user');
                                } else {
                                    console.error('Referral Reward Error:', err);
                                }
                            }
                        }
                    }
                }
            }
        }

        res.json({
            success: true,
            message: `Membership ${status === 'Success' ? 'activated' : 'declined'} successfully`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
