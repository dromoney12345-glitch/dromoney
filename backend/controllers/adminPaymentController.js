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
                } else if (payment.paymentType === 'BUSINESS_IDEA_UNLOCK') {
                    const ideaId = payment.businessIdea ? payment.businessIdea.toString() : '';
                    user.unlockedIdeas = user.unlockedIdeas || [];
                    const already = user.unlockedIdeas.some((id) => id && id.toString() === ideaId);
                    if (ideaId && !already) {
                        user.unlockedIdeas.push(payment.businessIdea);
                    }
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Business Idea Unlocked',
                        message: `Your payment for ${payment.plan || 'this business idea'} is confirmed. Only this idea is unlocked.`,
                        type: 'success',
                        isRead: false
                    });
                    await user.save();

                    const Transaction = require('../models/Transaction');
                    await Transaction.create({
                        user: user._id,
                        type: 'debit',
                        currency: 'INR',
                        amount: payment.amount,
                        source: payment.plan || 'Business Idea Unlock',
                        status: 'Success'
                    });

                    try {
                        const { sendNotificationToUser } = require('./fcmController');
                        await sendNotificationToUser(user._id, {
                            title: 'Business Idea Unlocked 🚀',
                            body: `Your payment for ${payment.plan || 'this business idea'} is confirmed.`,
                            data: { type: 'payment', link: '/user/business-ideas' }
                        });
                    } catch (pushErr) {
                        console.error('Push notification failed for idea unlock:', pushErr.message);
                    }
                } else if (payment.paymentType === 'BUSINESS_HUB_PLAN') {
                    const daysToAdd = Number(payment.durationInDays) || 30;
                    let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date()
                        ? new Date(user.supportExpiry)
                        : new Date();
                    currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
                    user.supportExpiry = currentExpiry;
                    user.activeBusinessPlan = payment.plan || 'Premium Plan';
                    user.businessPlanStatus = 'active';
                    // Unlock ONLY the idea this plan was bought for — never all ideas
                    if (payment.businessIdea) {
                        const ideaId = payment.businessIdea.toString();
                        user.unlockedIdeas = user.unlockedIdeas || [];
                        const already = user.unlockedIdeas.some((id) => id && id.toString() === ideaId);
                        if (!already) user.unlockedIdeas.push(payment.businessIdea);
                    }
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Premium Support Activated',
                        message: `${payment.plan || 'Premium Plan'} is active for this idea. Other ideas stay locked unless free or paid separately.`,
                        type: 'success',
                        isRead: false
                    });
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

                    try {
                        const { sendNotificationToUser } = require('./fcmController');
                        await sendNotificationToUser(user._id, {
                            title: 'Premium Support Activated 🚀',
                            body: `Your ${payment.plan || 'Premium Plan'} is confirmed.`,
                            data: { type: 'payment', link: '/user/business-ideas' }
                        });
                    } catch (pushErr) {
                        console.error('Push notification failed for business plan:', pushErr.message);
                    }
                } else if (payment.paymentType === 'SUPPORT_CHAT_RENEWAL') {
                    const daysToAdd = Number(payment.durationInDays) || 90;
                    let currentExpiry = user.supportExpiry && new Date(user.supportExpiry) > new Date()
                        ? new Date(user.supportExpiry)
                        : new Date();
                    currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
                    user.supportExpiry = currentExpiry;
                    user.businessPlanStatus = 'active';
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Support Chat Renewed',
                        message: `Support chat is extended by ${daysToAdd} days.`,
                        type: 'success',
                        isRead: false
                    });
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

                    try {
                        const { sendNotificationToUser } = require('./fcmController');
                        await sendNotificationToUser(user._id, {
                            title: 'Support Chat Renewed 💬',
                            body: `Your support access is extended by ${daysToAdd} days.`,
                            data: { type: 'payment', link: '/user/chat-support' }
                        });
                    } catch (pushErr) {
                        console.error('Push notification failed for support renewal:', pushErr.message);
                    }
                } else {
                    const isRenewal = payment.paymentType === 'VIRTUAL_ACCOUNT_RENEWAL';
                    const { activateVirtualWallet } = require('../utils/walletLedger');
                    await activateVirtualWallet(user, { isRenewal });

                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: isRenewal ? 'Virtual Account Renewed' : 'Virtual Account Unlocked',
                        message: isRenewal
                            ? 'Virtual Account renewed. It is now active for 6 more months.'
                            : 'Virtual Account approved. It is now active for 6 months.',
                        type: 'success',
                        isRead: false
                    });

                    await user.save();

                    const Transaction = require('../models/Transaction');
                    await Transaction.create({
                        user: user._id,
                        type: 'debit',
                        currency: 'INR',
                        amount: payment.amount,
                        source: payment.plan || (isRenewal ? 'Virtual Account Renew' : 'Platform Unlock'),
                        status: 'Success'
                    });

                    try {
                        const { notifyJourney } = require('../utils/userJourneyPush');
                        await notifyJourney(user._id, isRenewal ? 'va_renewed' : 'va_activated');
                    } catch (pushErr) {
                        console.error('Push notification failed for payment activation:', pushErr.message);
                    }

                    try {
                        const { afterVirtualAccountActivated } = require('../utils/referralReward');
                        await afterVirtualAccountActivated(user);
                    } catch (refErr) {
                        console.error('[REFERRAL] after Virtual Account activation failed:', refErr.message);
                    }
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
