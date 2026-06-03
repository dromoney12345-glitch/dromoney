const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const ReferralTransaction = require('../models/ReferralTransaction');
const TaskSubmission = require('../models/TaskSubmission');
const EventParticipant = require('../models/EventParticipant');
const ErrorResponse = require('../utils/errorResponse');

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
