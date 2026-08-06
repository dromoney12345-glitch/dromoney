const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const ReferralTransaction = require('../models/ReferralTransaction');
const TaskSubmission = require('../models/TaskSubmission');
const EventParticipant = require('../models/EventParticipant');
const ErrorResponse = require('../utils/errorResponse');
const { sendNotificationToUser } = require('./fcmController');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'All') {
            query['kyc.status'] = status;
        }

        const users = await User.find(query).sort('-createdAt');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Manage KYC
// @route   PUT /api/admin/users/:id/kyc
// @access  Private (Admin)
exports.manageKYC = async (req, res, next) => {
    try {
        const { status, rejectionReason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Ensure kyc object exists
        if (!user.kyc) {
            user.kyc = { status: 'Not Started' };
        }

        user.kyc.status = status;
        
        if (status === 'Approved' || status === 'Verified') {
            user.kyc.rejectionReason = ''; // Clear reason on approval
            
            // Add in-app notification
            user.notifications = user.notifications || [];
            user.notifications.push({
                title: "KYC Verified! ✅",
                message: "Congratulations! Your KYC is successfully approved. All earning routes are unlocked.",
                type: "success",
                date: new Date()
            });
        } else if (status === 'Rejected') {
            if (rejectionReason) user.kyc.rejectionReason = rejectionReason;
            
            // Add in-app notification
            user.notifications = user.notifications || [];
            user.notifications.push({
                title: "KYC Rejected ⚠️",
                message: `KYC verification failed. Reason: ${rejectionReason || 'Invalid documents or blurred image'}. Click here to re-submit your details.`,
                type: "error",
                date: new Date()
            });
        }

        // Use markModified for nested objects to ensure Mongoose detects change
        user.markModified('kyc');
        await user.save();

        // If KYC approved and user already bought ₹499, credit referrer now
        if (status === 'Approved' || status === 'Verified') {
            try {
                const { creditReferralOnQualifiedUnlock } = require('../utils/referralReward');
                await creditReferralOnQualifiedUnlock(user);
            } catch (refErr) {
                console.error('[REFERRAL] KYC approve credit failed:', refErr.message);
            }
        }

        // Send Push Notification
        try {
            const { sendNotificationToUser } = require('./fcmController');
            if (status === 'Approved' || status === 'Verified') {
                await sendNotificationToUser(user._id, {
                    title: 'KYC Verified! ✅',
                    body: 'Congratulations! Your KYC is successfully approved. All earning routes are unlocked.',
                    data: {
                        type: 'kyc',
                        link: '/user/marketing'
                    }
                });
            } else if (status === 'Rejected') {
                await sendNotificationToUser(user._id, {
                    title: 'KYC Rejected ⚠️',
                    body: `KYC verification failed. Reason: ${rejectionReason || 'Invalid documents or blurred image'}. Click here to re-submit your details.`,
                    data: {
                        type: 'kyc',
                        link: '/user/profile'
                    }
                });
            }
        } catch (pushErr) {
            console.error('Push notification failed for manageKYC:', pushErr.message);
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all users with Pending KYC
// @route   GET /api/admin/kyc/pending
// @access  Private (Admin)
exports.getPendingKyc = async (req, res, next) => {
    try {
        const users = await User.find({ 'kyc.status': { $in: ['Pending', 'pending'] } }).sort('-createdAt');
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Block/Unblock User
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
exports.toggleBlock = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // We need 'isBlocked' in User Schema. I'll add it in the next step.
        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isBlocked ? 'Blocked' : 'Unblocked'} successfully`
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get user's transaction history (Admin view)
// @route   GET /api/admin/users/:id/transactions
// @access  Private (Admin)
exports.getUserTransactions = async (req, res, next) => {
    try {
        const transactions = await Transaction.find({ user: req.params.id })
            .sort({ createdAt: -1 })
            .limit(100);

        // Group by date — compute last 7 days daily totals
        const now = new Date();
        const last7Days = [];

        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const dayTotal = transactions
                .filter(tx => {
                    const txDate = new Date(tx.createdAt);
                    return (
                        tx.currency === 'INR' &&
                        tx.type === 'credit' &&
                        tx.status === 'Success' &&
                        txDate >= dayStart &&
                        txDate <= dayEnd
                    );
                })
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            last7Days.push({
                date: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                total: parseFloat(dayTotal.toFixed(2))
            });
        }

        res.status(200).json({
            success: true,
            data: {
                transactions,
                last7Days
            }
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get complete activity report of active Future Fund users
// @route   GET /api/admin/users/future-fund/report
// @access  Private (Admin)
exports.getFutureFundReport = async (req, res, next) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } });

        if (users.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const Settings = require('../models/Settings');
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const tier1Tasks = settings.ffTier1TasksLimit || 5;
        const tier1Ads = settings.ffTier1AdsLimit || 5;
        const tier1Pct = settings.ffTier1ProfitPercent || 60;
        const tier2Pct = settings.ffTier2ProfitPercent || 40;

        let highTierCount = 0;
        let lowTierCount = 0;
        const scoredUsers = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // First pass: identify tiers and counts
        for (let user of users) {
            let adScore = user.dailyAdCount || 0;
            if (user.lastAdCountResetAt && user.lastAdCountResetAt < todayStart) adScore = 0;

            let taskScore = 0;
            if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
                taskScore = user.dailyTaskCompletions.filter(tc => new Date(tc.completedAt) >= todayStart).length;
            }

            let isHighTier = (taskScore > tier1Tasks && adScore > tier1Ads);
            let overrideProfit = user.futureFund?.overrideProfit;

            if (isHighTier) highTierCount++;
            else lowTierCount++;

            scoredUsers.push({
                id: user._id,
                name: user.name,
                email: user.email,
                referrals: user.referralCount || 0,
                lifetimeEarnings: user.wallet?.lifetimeEarnings || 0,
                breakdown: { ads: adScore, tasks: taskScore, isHighTier },
                overrideProfit: overrideProfit,
                isHighTier
            });
        }

        // Second pass: Calculate exact percentage share of the REMAINING pool
        // High Tier Pool is 60% of remaining pool. If H users, each gets (60/H)% of remaining pool.
        for (let user of scoredUsers) {
            if (user.isHighTier) {
                user.sharePercentage = highTierCount > 0 ? (tier1Pct / highTierCount) : 0;
            } else {
                user.sharePercentage = lowTierCount > 0 ? (tier2Pct / lowTierCount) : 0;
            }
            
            // If one tier is completely empty, the other tier should absorb the 100% pool
            if (highTierCount === 0 && !user.isHighTier) {
                user.sharePercentage = 100 / lowTierCount;
            }
            if (lowTierCount === 0 && user.isHighTier) {
                user.sharePercentage = 100 / highTierCount;
            }
        }

        const reportData = scoredUsers.sort((a, b) => b.sharePercentage - a.sharePercentage);

        res.status(200).json({
            success: true,
            count: reportData.length,
            data: reportData
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Distribute profit to active Future Fund users
// @route   POST /api/admin/users/future-fund/distribute
// @access  Private (Admin)
exports.distributeFutureFundProfit = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return next(new ErrorResponse('Please provide a valid amount to distribute', 400));
        }

        // Distribute to all regular users based on activity
        const users = await User.find({ role: { $ne: 'admin' } });

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No active Future Fund users found' });
        }

        // Distribute proportionally
        const Settings = require('../models/Settings');
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const tier1Tasks = settings.ffTier1TasksLimit || 5;
        const tier1Ads = settings.ffTier1AdsLimit || 5;
        const tier1Pct = settings.ffTier1ProfitPercent || 60;
        const tier2Pct = settings.ffTier2ProfitPercent || 40;

        // Calculate Tier Shares
        let highTierCount = 0;
        let lowTierCount = 0;
        let totalFixedProfit = 0;

        const scoredUsers = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        for (let user of users) {
            // Ads Score
            let adScore = user.dailyAdCount || 0;
            if (user.lastAdCountResetAt && user.lastAdCountResetAt < todayStart) adScore = 0;

            // Tasks Score
            let taskScore = 0;
            if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
                taskScore = user.dailyTaskCompletions.filter(tc => new Date(tc.completedAt) >= todayStart).length;
            }

            let isHighTier = (taskScore > tier1Tasks && adScore > tier1Ads);
            let overrideProfit = user.futureFund?.overrideProfit;

            if (overrideProfit !== null && overrideProfit !== undefined) {
                totalFixedProfit += overrideProfit;
            }
            
            if (isHighTier) highTierCount++;
            else lowTierCount++;

            scoredUsers.push({
                user: user,
                isHighTier,
                overrideProfit
            });
        }

        // Calculate pool math
        const totalPool = Number(amount);
        const remainingPool = Math.max(0, totalPool - totalFixedProfit);

        for (let item of scoredUsers) {
            let sharePercentage = item.isHighTier ? tier1Pct : tier2Pct;
            
            let shareFraction = 0;
            if (item.isHighTier) {
                shareFraction = highTierCount > 0 ? ((sharePercentage / 100) / highTierCount) : 0;
            } else {
                shareFraction = lowTierCount > 0 ? ((sharePercentage / 100) / lowTierCount) : 0;
            }

            // If one tier is empty, the other gets 100% of remaining pool
            if (highTierCount === 0 && !item.isHighTier) shareFraction = 1 / lowTierCount;
            if (lowTierCount === 0 && item.isHighTier) shareFraction = 1 / highTierCount;

            item.userShare = remainingPool * shareFraction;
            
            // Add the bonus profit on top
            if (item.overrideProfit !== null && item.overrideProfit !== undefined) {
                item.userShare += item.overrideProfit;
            }
        }

        // Distribute based on tiers
        let totalDistributed = 0;
        for (let item of scoredUsers) {
            let userShare = Math.floor(item.userShare * 100) / 100; // Keep up to 2 decimals

            if (userShare > 0) {
                item.user.wallet.balance += userShare;
                item.user.wallet.lifetimeEarnings += userShare;
                
                await Transaction.create({
                    user: item.user._id,
                    type: 'credit',
                    currency: 'INR',
                    amount: userShare,
                    source: 'Future Fund Daily Distribution',
                    status: 'Success'
                });

                await item.user.save();
                totalDistributed += userShare;

                // Send notification
                try {
                    const { sendNotificationToUser } = require('./fcmController');
                    await sendNotificationToUser(item.user._id, {
                        title: 'Future Fund Reward! 🏆',
                        body: `Based on your activity today, ₹${userShare} has been added to your wallet!`,
                        data: {
                            type: 'future_fund',
                            link: '/user/future-fund'
                        }
                    });
                } catch (err) {
                    console.error(`Failed to send FF notification to ${item.user._id}`);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully distributed ₹${totalDistributed} across ${users.length} users.`
        });

    } catch (err) {
        next(err);
    }
};

// @desc    Update user's override profit
// @route   PUT /api/admin/users/:id/future-fund/override
// @access  Private (Admin)
exports.updateOverrideProfit = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        const { profit } = req.body;
        
        // If profit is null or empty string, we remove the override
        if (profit === null || profit === '') {
            user.futureFund.overrideProfit = null;
        } else {
            user.futureFund.overrideProfit = Number(profit);
        }

        await user.save();

        res.status(200).json({
            success: true,
            data: user.futureFund.overrideProfit,
            message: 'Custom profit updated successfully'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get distribution history for Future Fund
// @route   GET /api/admin/users/future-fund/history
// @access  Private (Admin)
exports.getFutureFundHistory = async (req, res, next) => {
    try {
        const Transaction = require('../models/Transaction');
        // Group transactions by date
        const history = await Transaction.aggregate([
            { $match: { source: 'Future Fund Daily Distribution', status: 'Success' } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalAmount: { $sum: "$amount" },
                    userCount: { $sum: 1 },
                    date: { $first: "$createdAt" }
                }
            },
            { $sort: { "date": -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete User
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        console.log(`Starting cascade deletion for user: ${user.name} (${user._id})`);

        // Revert referral reward if this user was referred by someone
        const referralTx = await ReferralTransaction.findOne({ referredUser: user._id, status: 'Completed' });
        if (referralTx && referralTx.referrer) {
            const referrer = await User.findById(referralTx.referrer);
            if (referrer) {
                console.log(`Reverting referral reward of ${referralTx.amount} from referrer: ${referrer.name}`);
                
                // Deduct from referrer's wallet and referral count
                referrer.wallet.balance = Math.max(0, referrer.wallet.balance - referralTx.amount);
                referrer.wallet.referralEarnings = Math.max(0, referrer.wallet.referralEarnings - referralTx.amount);
                referrer.referralCount = Math.max(0, referrer.referralCount - 1);
                await referrer.save();

                // Delete the specific transaction record from referrer's history
                await Transaction.findOneAndDelete({
                    user: referrer._id,
                    type: 'credit',
                    currency: 'INR',
                    amount: referralTx.amount,
                    source: `Referral Reward: ${user.name}`
                });
            }
        }

        // We delete all associated data including payments
        await Promise.all([
            Payment.deleteMany({ user: user._id }),
            Transaction.deleteMany({ user: user._id }),
            Withdrawal.deleteMany({ user: user._id }),
            TaskSubmission.deleteMany({ user: user._id }),
            EventParticipant.deleteMany({ user: user._id }),
            ReferralTransaction.deleteMany({ 
                $or: [
                    { referrer: user._id }, 
                    { referredUser: user._id },
                    { referee: user._id } // compatibility fallback
                ] 
            }),
            User.findByIdAndDelete(req.params.id)
        ]);

        console.log(`Cascade deletion completed successfully for user ID: ${user._id}`);

        res.status(200).json({
            success: true,
            message: 'User and associated data deleted successfully'
        });
    } catch (err) {
        console.error('Cascade delete error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Server Error during cascade user deletion'
        });
    }
};
