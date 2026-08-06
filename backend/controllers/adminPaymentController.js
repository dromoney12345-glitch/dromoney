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

        const { dedupePaymentsForAdmin, aggregateUniqueRevenue } = require('../utils/paymentGuards');
        const data = dedupePaymentsForAdmin(normalized);
        const revenue = await aggregateUniqueRevenue();

        res.json({
            success: true,
            data,
            meta: {
                totalRaw: normalized.length,
                totalShown: data.length,
                totalRevenue: revenue.totalGrossRevenue,
                successCount: revenue.successCount,
            }
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

        // One successful PLATFORM_UNLOCK per user — check before save
        if (status === 'Success' && (payment.paymentType || 'PLATFORM_UNLOCK') === 'PLATFORM_UNLOCK') {
            const already = await Payment.findOne({
                user: payment.user,
                paymentType: 'PLATFORM_UNLOCK',
                status: 'Success',
                _id: { $ne: payment._id },
            });
            if (already) {
                return res.status(400).json({
                    success: false,
                    message: 'This user already has a successful platform unlock payment.',
                });
            }
        }

        payment.status = status;
        payment.remarks = remarks;
        payment.processedAt = Date.now();
        try {
            await payment.save();
        } catch (saveErr) {
            if (saveErr && saveErr.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'A payment entry for this user/plan already exists.',
                });
            }
            throw saveErr;
        }

        // If success, activate the user
        if (status === 'Success') {
            if ((payment.paymentType || 'PLATFORM_UNLOCK') === 'PLATFORM_UNLOCK') {
                const { closeSiblingPlatformPayments } = require('../utils/paymentGuards');
                await closeSiblingPlatformPayments(payment.user, payment._id);
            }

            const user = await User.findById(payment.user);
            if (user) {
                // Handle Booster Activations
                if (payment.paymentType === 'SUPPORT_BOOSTER' || payment.paymentType === 'TASK_BOOSTER') {
                    const isSupport = payment.paymentType === 'SUPPORT_BOOSTER';

                    // Both boosters can be active simultaneously

                    const expiryDate = new Date();
                    if (isSupport) {
                        expiryDate.setDate(expiryDate.getDate() + 30);
                        user.isSupportBoosterActive = true;
                        user.supportBoosterExpiry = expiryDate;
                        // Keep Task Booster if already active
                    } else {
                        expiryDate.setHours(expiryDate.getHours() + 24);
                        user.isTaskBoosterActive = true;
                        user.taskBoosterExpiry = expiryDate;
                        // Keep Support Booster if already active
                    }
                    user.isBoosterActive = !!(user.isSupportBoosterActive || user.isTaskBoosterActive);
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

                    // ── REFERRAL: ₹200 only after KYC + ₹499 unlock ──
                    const { creditReferralOnQualifiedUnlock } = require('../utils/referralReward');
                    await creditReferralOnQualifiedUnlock(user);
                }
            }

            // Emit real-time signal via global io
            if (global.io && payment.user) {
                global.io.emit(`payment_update_${payment.user.toString()}`, { status });
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
