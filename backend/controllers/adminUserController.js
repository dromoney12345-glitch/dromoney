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
        } else if (rejectionReason) {
            user.kyc.rejectionReason = rejectionReason;
        }

        // Use markModified for nested objects to ensure Mongoose detects change
        user.markModified('kyc');
        await user.save();

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

// @desc    Distribute profit to active Future Fund users
// @route   POST /api/admin/users/future-fund/distribute
// @access  Private (Admin)
exports.distributeFutureFundProfit = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return next(new ErrorResponse('Please provide a valid amount to distribute', 400));
        }

        // Find all users with active future fund
        const users = await User.find({ 'futureFund.status': 'active' });

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No active Future Fund users found' });
        }

        // Distribute proportionally
        const Settings = require('../models/Settings');
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const adWeight = settings.ffAdScoreWeight || 1;
        const taskWeight = settings.ffTaskScoreWeight || 1;
        const boosterMultiplier = settings.ffBoosterMultiplier || 1.5;

        // Calculate Activity Scores
        let totalActivityScore = 0;
        const scoredUsers = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        for (let user of users) {
            // Ads Score
            let adScore = user.dailyAdCount || 0;
            if (user.lastAdCountResetAt && user.lastAdCountResetAt < todayStart) {
                adScore = 0;
            }

            // Tasks Score
            let taskScore = 0;
            if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
                taskScore = user.dailyTaskCompletions.filter(tc => new Date(tc.completedAt) >= todayStart).length;
            }

            // Booster Multiplier
            let multiplier = 1.0;
            if (user.isTaskBoosterActive || user.isSupportBoosterActive) {
                multiplier = boosterMultiplier;
            }

            // Base score must be at least 1 so everyone gets a minimum piece of the pie
            let baseScore = (adScore * adWeight) + (taskScore * taskWeight);
            if (baseScore === 0) baseScore = 1;

            let finalScore = baseScore * multiplier;
            totalActivityScore += finalScore;

            scoredUsers.push({
                user: user,
                score: finalScore,
                breakdown: { ads: adScore, tasks: taskScore, multiplier }
            });
        }

        // Distribute proportionally
        let totalDistributed = 0;
        for (let item of scoredUsers) {
            let userShare = (item.score / totalActivityScore) * Number(amount);
            userShare = Math.floor(userShare * 100) / 100; // Keep up to 2 decimals

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
                        body: `Based on your activity score (${item.score.toFixed(1)}), ₹${userShare} has been added to your wallet!`,
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
            message: `Successfully distributed ₹${amount} each to ${users.length} users. Total: ₹${totalDistributed}`
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

        // Payment records are intentionally preserved for financial audit trail.
        // We only delete non-financial user data.
        await Promise.all([
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
