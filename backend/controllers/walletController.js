const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Settings = require('../models/Settings');
const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { getLastRenewalTick } = require('../utils/taskRenewal');

// @desc    Get user wallet and coin balance
// @route   GET /api/user/wallet/balance
// @access  Private
exports.getBalance = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('wallet coins');

    // Fetch any non-rejected withdrawal in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWithdrawal = await Withdrawal.findOne({
        user: req.user.id,
        status: { $ne: 'Rejected' },
        createdAt: { $gte: twentyFourHoursAgo }
    }).sort('-createdAt');

    // Fetch any pending withdrawal request
    const pendingWithdrawal = await Withdrawal.findOne({
        user: req.user.id,
        status: 'Pending'
    });

    res.status(200).json({
        success: true,
        data: user,
        recentWithdrawal,
        pendingWithdrawal
    });
});

// @desc    Add coins and convert to INR automatically
// @route   POST /api/user/wallet/add-coins
// @access  Private
exports.addCoins = asyncHandler(async (req, res, next) => {
    const { amount, source, taskId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const mongoose = require('mongoose');

    let task = null;
    let isEventReward = false;

    // Check if already completed
    if (taskId) {
        if (mongoose.Types.ObjectId.isValid(taskId)) {
            task = await Task.findById(taskId);
            
            if (!task) {
                // If not a Task, check if it's an Event
                const Event = require('../models/Event');
                const event = await Event.findById(taskId);
                if (event) {
                    isEventReward = true;
                    const EventParticipant = require('../models/EventParticipant');
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    
                    const participant = await EventParticipant.findOne({
                        event: event._id,
                        user: user._id,
                        createdAt: { $gte: todayDate }
                    });
                    
                    if (participant && participant.prizeStatus === 'Awarded') {
                        return next(new ErrorResponse('You have already claimed the reward for this event today', 400));
                    }
                    
                    // Mark as awarded so they can't claim again today
                    if (participant) {
                        participant.prizeStatus = 'Awarded';
                        await participant.save();
                    }
                }
            }
        }
        if (task) {
            if (task.isDaily) {
                const settings = await Settings.findOne() || {};
                const lastRenewalTick = getLastRenewalTick(settings);
                
                const alreadyDoneToday = user.dailyTaskCompletions?.some(c =>
                    String(c.taskId) === String(taskId) &&
                    new Date(c.completedAt).getTime() >= lastRenewalTick.getTime()
                );
                if (alreadyDoneToday) {
                    return next(new ErrorResponse('Task already completed today', 400));
                }
            } else {
                if (user.completedTasks && user.completedTasks.includes(taskId)) {
                    return next(new ErrorResponse('Task already completed', 400));
                }
            }
        } else if (!isEventReward) {
            // It's a mock task from frontend (e.g., id "1", "2", "3"). Treat as daily task.
            const settings = await Settings.findOne() || {};
            const lastRenewalTick = getLastRenewalTick(settings);
            
            const alreadyDoneToday = user.dailyTaskCompletions?.some(c =>
                String(c.taskId) === String(taskId) &&
                new Date(c.completedAt).getTime() >= lastRenewalTick.getTime()
            );
            if (alreadyDoneToday) {
                return next(new ErrorResponse('Task already completed today', 400));
            }
        }
    }

    // ₹49 Task Booster — NEVER on events. Only on tasks listed in admin applicableTasks.
    // Watch & Earn / ads only if admin explicitly added "Watch & Earn" (or similar).
    let factor = 1;
    const sourceLower = (source || '').toLowerCase();
    const looksLikeEventPrize =
        isEventReward ||
        sourceLower.includes('event') ||
        sourceLower.includes('quiz prize') ||
        sourceLower.includes('lucky draw') ||
        sourceLower.includes('gold production') ||
        sourceLower.includes('memory master victory');

    if (!looksLikeEventPrize && user.isTaskBoosterActive) {
        const Booster = mongoose.models.Booster || require('../models/Booster');
        const taskBooster = await Booster.findOne({ type: 'task' });

        let isApplicable = false;
        const allowed = (taskBooster?.applicableTasks || []).map((t) => String(t).toLowerCase());

        if (allowed.length === 0) {
            // No admin list → apply only to non-video general tasks
            isApplicable = task && task.type !== 'Video' && task.type !== 'Watch';
        } else {
            const matchesSource = allowed.some((t) => sourceLower.includes(t));
            const matchesTaskType = task && task.type && allowed.includes(task.type.toLowerCase());
            const isGeneralTask =
                allowed.includes('general tasks') &&
                task &&
                !['speed tapper', 'memory master', 'quiz', 'lucky draw', 'treasure chest', 'scratch card', 'video', 'watch'].includes(
                    (task.type || '').toLowerCase()
                );

            const isWatchOrAd =
                (task && (task.type === 'Video' || task.type === 'Watch')) ||
                sourceLower.includes('ad') ||
                sourceLower.includes('watch');
            const watchAllowed =
                allowed.some((t) => t.includes('watch')) ||
                allowed.includes('watch & earn') ||
                allowed.includes('watch and earn');

            if (isWatchOrAd) {
                isApplicable = watchAllowed;
            } else {
                isApplicable = matchesSource || matchesTaskType || isGeneralTask;
            }
        }

        if (isApplicable) {
            factor = 12;
            if (taskBooster?.benefits) {
                for (const b of taskBooster.benefits) {
                    const match = String(b).match(/(\d+)x/i);
                    if (match) {
                        factor = parseInt(match[1], 10);
                        break;
                    }
                }
            }
        }
    }
    const totalAwardedCoins = amount * factor;

    // Remove conversion logic - coins stay as coins and do not convert to wallet balance (Rupees)

    // Update User
    user.coins.balance += totalAwardedCoins;
    user.coins.lifetimeCoins += totalAwardedCoins;
    // user.wallet.balance is no longer updated by coins
    // user.wallet.lifetimeEarnings is no longer updated by coins
    // user.wallet.todayEarnings is no longer updated by coins

    // Track completed tasks dynamically in database
    if (taskId) {
        if ((task && task.isDaily) || !task) {
            // Add to daily completions (both real daily tasks and mock tasks)
            if (!user.dailyTaskCompletions) {
                user.dailyTaskCompletions = [];
            }
            user.dailyTaskCompletions.push({
                taskId: taskId,
                completedAt: new Date()
            });
        } else {
            // Add to one-time completed tasks
            if (!user.completedTasks) {
                user.completedTasks = [];
            }
            if (!user.completedTasks.includes(taskId)) {
                user.completedTasks.push(taskId);
            }
        }
    }

    await user.save();

    // Record Transaction
    await Transaction.create({
        user: user._id,
        type: 'credit',
        currency: 'COIN',
        amount: totalAwardedCoins,
        source: factor > 1 ? `Processing Rewards: ${source}` : source,
    });

    res.status(200).json({
        success: true,
        data: {
            coinsAwarded: totalAwardedCoins,
            newWalletBalance: user.wallet.balance,
            newCoinBalance: user.coins.balance,
            completedTasks: user.completedTasks,
            dailyTaskCompletions: user.dailyTaskCompletions
        }
    });
});

// @desc    Request withdrawal
// @route   POST /api/user/wallet/withdraw
// @access  Private
exports.requestWithdrawal = asyncHandler(async (req, res, next) => {
    const { amount, bankDetails, paymentMethod = 'Bank Transfer' } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Load dynamic settings for minWithdrawal
    const settings = await Settings.findOne();
    const minWithdrawalLimit = settings ? settings.minWithdrawal : 100;

    // 1. Check dynamic minimum amount
    if (amount < minWithdrawalLimit) {
        return next(new ErrorResponse(`Minimum withdrawal amount is ₹${minWithdrawalLimit}`, 400));
    }

    // 2. Check for 24-hour limit (only one non-rejected withdrawal request every 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWithdrawal = await Withdrawal.findOne({
        user: user._id,
        status: { $ne: 'Rejected' },
        createdAt: { $gte: twentyFourHoursAgo }
    });

    if (recentWithdrawal) {
        const diffMs = new Date(recentWithdrawal.createdAt).getTime() + (24 * 60 * 60 * 1000) - Date.now();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return next(new ErrorResponse(`You can only withdraw once every 24 hours. Please wait ${diffHours}h ${diffMins}m before trying again.`, 400));
    }

    // Check with ₹5 transaction fee
    const totalDeduction = Number(amount) + 5;

    if (user.wallet.balance < totalDeduction) {
        return next(new ErrorResponse(`Insufficient balance. You need ₹${totalDeduction} (₹${amount} withdrawal + ₹5 transaction fee) to complete this transaction`, 400));
    }

    // 3. Check for any existing pending withdrawal request to prevent race conditions
    const existingPending = await Withdrawal.findOne({ user: user._id, status: 'Pending' });
    if (existingPending) {
        return next(new ErrorResponse('You already have a pending withdrawal request. Please wait for admin approval before requesting another one.', 400));
    }

    // We DO NOT deduct the balance here anymore. It will be deducted upon admin approval.
    // Record Pending Withdrawal Transaction
    const transaction = await Transaction.create({
        user: user._id,
        type: 'withdrawal',
        currency: 'INR',
        amount: amount,
        source: paymentMethod === 'UPI' ? 'UPI Payout' : 'Bank Payout',
        status: 'Pending'
    });

    // Record Pending Transaction Fee
    const feeTransaction = await Transaction.create({
        user: user._id,
        type: 'withdrawal',
        currency: 'INR',
        amount: 5,
        source: 'Withdrawal Transaction Fee',
        status: 'Pending'
    });

    // Create corresponding Withdrawal request for Admin Dashboard
    await Withdrawal.create({
        user: user._id,
        amount: amount,
        paymentMethod: paymentMethod,
        bankDetails: bankDetails,
        status: 'Pending',
        transaction: transaction._id,
        feeTransaction: feeTransaction._id
    });

    // Send push notification to all admins
    try {
        const { sendNotificationToAllAdmins } = require('./fcmController');
        await sendNotificationToAllAdmins({
            title: 'New Withdrawal Request 💸',
            body: `User ${user.name} has requested a withdrawal of ₹${amount}. Review now.`,
            data: {
                type: 'withdrawal_alert',
                link: '/admin/withdrawals'
            }
        });
    } catch (pushErr) {
        console.error('Admin push notification failed for withdrawal request:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Transaction pending. After 10-15 min admin will approve your transaction.',
        transactionId: transaction._id,
        feeTransactionId: feeTransaction._id
    });
});

// @desc    Get transaction history
// @route   GET /api/user/wallet/transactions
// @access  Private
exports.getTransactions = asyncHandler(async (req, res, next) => {
    const transactions = await Transaction.find({ user: req.user.id }).sort('-date');

    res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
    });
});
