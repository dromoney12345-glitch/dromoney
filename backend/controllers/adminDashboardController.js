const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
exports.getStats = async (req, res, next) => {
    try {
        const Payment = require('../models/Payment');
        const ReferralTransaction = require('../models/ReferralTransaction');

        // 1. Active Users Count
        const activeUsersCount = await User.countDocuments();
        
        // 2. Advanced Revenue Tracking (Net Revenue)
        const revenueAggregation = await Payment.aggregate([
            { $match: { status: { $in: ['Success', 'success'] } } },
            { 
                $group: { 
                    _id: { $cond: [ { $eq: [{ $type: "$paymentType" }, "missing"] }, "PLATFORM_UNLOCK", "$paymentType" ] }, 
                    total: { $sum: '$amount' } 
                } 
            }
        ]);

        let platformSubGross = 0;
        let businessPlanRevenue = 0;
        let boosterRevenue = 0;
        let otherRevenue = 0;

        revenueAggregation.forEach(item => {
            const type = item._id;
            const amount = item.total || 0;
            if (type === 'PLATFORM_UNLOCK') platformSubGross += amount;
            else if (type === 'BUSINESS_HUB_PLAN') businessPlanRevenue += amount;
            else if (type === 'TASK_BOOSTER' || type === 'SUPPORT_BOOSTER') boosterRevenue += amount;
            else otherRevenue += amount;
        });

        // Calculate Referral Payouts to get Net Platform Revenue
        const referralPayoutsResult = await ReferralTransaction.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalReferralPayouts = referralPayoutsResult[0]?.total || 0;

        // Calculate Future Fund Payouts
        const Transaction = require('../models/Transaction');
        const futureFundPayoutsResult = await Transaction.aggregate([
            { $match: { source: 'Future Fund Daily Distribution', status: 'Success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalFutureFundPayouts = futureFundPayoutsResult[0]?.total || 0;

        const platformSubNet = platformSubGross;
        const totalGrossRevenue = platformSubNet + businessPlanRevenue + boosterRevenue + otherRevenue;
        
        // Total Net Revenue = Everything earned MINUS everything distributed
        const totalNetRevenue = totalGrossRevenue - totalReferralPayouts - totalFutureFundPayouts;

        const paidUsersCount = await User.countDocuments({ isPaid: true });

        // 3. Pending Payouts (Real data from pending withdrawals)
        const pendingWithdrawals = await Withdrawal.aggregate([
            { $match: { status: 'Pending' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        // 4. Verification Queue
        const pendingKycCount = await User.countDocuments({ 'kyc.status': 'Pending' });

        // 5. Coins in Market
        const totalCoins = await User.aggregate([
            { $group: { _id: null, total: { $sum: '$coins.balance' } } }
        ]);

        // 6. Active Earners (Users who earned something)
        const activeEarnersCount = await User.countDocuments({ 'wallet.lifetimeEarnings': { $gt: 0 } });

        res.status(200).json({
            success: true,
            data: {
                stats: [
                    { label: 'Active Users', value: activeUsersCount.toLocaleString(), trend: 'Live', color: 'from-sky-500 to-indigo-600' },
                    { label: 'Total Revenue', value: `₹${totalGrossRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, trend: 'Live', color: 'from-emerald-500 to-teal-600' },
                    { label: 'Coins in Market', value: (totalCoins[0]?.total || 0).toLocaleString(), trend: 'Active', color: 'from-amber-400 to-orange-600' },
                    { label: 'Pending Payouts', value: `₹${(pendingWithdrawals[0]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, trend: `${pendingWithdrawals[0]?.count || 0} requests`, color: 'from-rose-500 to-pink-600' }
                ],
                conversionFunnel: [
                    { label: 'Total Visits', value: (activeUsersCount * 3.4).toFixed(0), percent: '100%', color: 'bg-slate-200' },
                    { label: 'Registrations', value: activeUsersCount, percent: activeUsersCount > 0 ? `${((activeUsersCount / (activeUsersCount * 3.4)) * 100).toFixed(1)}%` : '0%', color: 'bg-indigo-400' },
                    { label: 'Paid Members', value: paidUsersCount, percent: activeUsersCount > 0 ? `${((paidUsersCount / activeUsersCount) * 100).toFixed(1)}%` : '0%', color: 'bg-sky-500' },
                    { label: 'Active Earners', value: activeEarnersCount, percent: paidUsersCount > 0 ? `${((activeEarnersCount / paidUsersCount) * 100).toFixed(1)}%` : '0%', color: 'bg-emerald-500' }
                ],
                revenueBreakdown: {
                    platformSubNet,
                    businessPlanRevenue,
                    boosterRevenue,
                    otherRevenue,
                    totalReferralPayouts,
                    platformSubGross,
                    totalGrossRevenue
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get Engagement Matrix Data (Daily / Weekly)
// @route   GET /api/admin/dashboard/engagement?period=daily|weekly
// @access  Private (Admin)
exports.getEngagement = async (req, res, next) => {
    try {
        const period = req.query.period === 'weekly' ? 'weekly' : 'daily';
        const now = new Date();
        const labels = [];
        const registrations = [];
        const logins = [];
        const taskCompletions = [];

        const TaskSubmission = require('../models/TaskSubmission');

        if (period === 'daily') {
            // Last 10 days
            for (let i = 9; i >= 0; i--) {
                const dayStart = new Date(now);
                dayStart.setDate(now.getDate() - i);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setHours(23, 59, 59, 999);

                const label = dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                labels.push(label);

                const regCount = await User.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } });
                registrations.push(regCount);

                const loginCount = await User.countDocuments({ updatedAt: { $gte: dayStart, $lte: dayEnd } });
                logins.push(loginCount);

                const taskCount = await TaskSubmission.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } });
                taskCompletions.push(taskCount);
            }
        } else {
            // Last 8 weeks
            for (let i = 7; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - i * 7 - 6);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() - i * 7);
                weekEnd.setHours(23, 59, 59, 999);

                const label = `W${8 - i}`;
                labels.push(label);

                const regCount = await User.countDocuments({ createdAt: { $gte: weekStart, $lte: weekEnd } });
                registrations.push(regCount);

                const loginCount = await User.countDocuments({ updatedAt: { $gte: weekStart, $lte: weekEnd } });
                logins.push(loginCount);

                const taskCount = await TaskSubmission.countDocuments({ createdAt: { $gte: weekStart, $lte: weekEnd } });
                taskCompletions.push(taskCount);
            }
        }

        res.status(200).json({
            success: true,
            data: { labels, registrations, logins, taskCompletions }
        });
    } catch (err) {
        next(err);
    }
};
// @route   GET /api/admin/dashboard/alerts
// @access  Private/Admin
exports.getDashboardAlerts = async (req, res, next) => {
    try {
        const Notification = require('../models/Notification');
        const users = await User.find().select('name isBlocked wallet kyc');
        
        // Find anomalies
        const highEarners = users.filter(u => u.wallet && u.wallet.balance > 10000);
        const blockedUsers = users.filter(u => u.isBlocked);

        const alerts = [
            ...blockedUsers.map(u => ({
                user: u.name,
                reason: 'Account blocked due to suspicious activity.',
                severity: 'high',
                time: 'Just Now'
            })),
            ...highEarners.map(u => ({
                user: u.name,
                reason: `Unusual wallet balance: ₹${u.wallet.balance}. Manual audit required.`,
                severity: 'medium',
                time: 'Active'
            }))
        ];

        // Fetch recent notifications
        const recentNotifications = await Notification.find().sort({ createdAt: -1 }).limit(5);

        res.status(200).json({
            success: true,
            data: alerts,
            recentNotifications: recentNotifications.map(n => ({
                title: n.title,
                message: n.message,
                type: n.type,
                time: new Date(n.createdAt).toLocaleDateString()
            }))
        });
    } catch (err) {
        next(err);
    }
};
