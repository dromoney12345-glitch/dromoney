const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Settings = require('../models/Settings');
const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

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

    // Check if already completed
    if (taskId) {
        if (mongoose.Types.ObjectId.isValid(taskId)) {
            task = await Task.findById(taskId);
        }
        if (task) {
            if (task.isDaily) {
                const today = new Date().setHours(0, 0, 0, 0);
                const alreadyDoneToday = user.dailyTaskCompletions?.some(c => 
                    String(c.taskId) === String(taskId) && 
                    new Date(c.completedAt).setHours(0, 0, 0, 0) === today
                );
                if (alreadyDoneToday) {
                    return next(new ErrorResponse('Task already completed today', 400));
                }
            } else {
                if (user.completedTasks && user.completedTasks.includes(taskId)) {
                    return next(new ErrorResponse('Task already completed', 400));
                }
            }
        }
    }

    // Booster logic (3x if active and applicable)
    let factor = 1;
    if (user.isBoosterActive || user.isTaskBoosterActive) {
        const Booster = mongoose.models.Booster || require('../models/Booster');
        const taskBooster = await Booster.findOne({ type: 'task' });
        
        let isApplicable = true;
        if (taskBooster && taskBooster.applicableTasks && taskBooster.applicableTasks.length > 0) {
            const allowed = taskBooster.applicableTasks.map(t => t.toLowerCase());
            const s = (source || '').toLowerCase();
            
            // Check source string for mini-game names
            const matchesSource = allowed.some(t => s.includes(t));
            
            // Check task type if available
            const matchesTaskType = task && task.type && allowed.includes(task.type.toLowerCase());
            
            // Check General Tasks
            const isGeneralTask = allowed.includes('general tasks') && task && !['speed tapper', 'memory master', 'quiz', 'lucky draw', 'treasure chest', 'scratch card'].some(gt => s.includes(gt) || (task.type && task.type.toLowerCase() === gt));

            if (!matchesSource && !matchesTaskType && !isGeneralTask) {
                isApplicable = false;
            }
        }
        
        if (isApplicable) {
            factor = 3;
        }
    }
    const totalAwardedCoins = amount * factor;

    // Conversion logic: 1 Coin = ₹0.1
    const coinToRupeeConversion = 0.1;
    const earningsInRupee = parseFloat((totalAwardedCoins * coinToRupeeConversion).toFixed(2));

    // Update User
    user.coins.balance += totalAwardedCoins;
    user.coins.lifetimeCoins += totalAwardedCoins;
    user.wallet.balance += earningsInRupee;
    user.wallet.lifetimeEarnings += earningsInRupee;
    user.wallet.todayEarnings += earningsInRupee;

    // Track completed tasks dynamically in database
    if (taskId) {
        if (task && task.isDaily) {
            // Add to daily completions
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
        status: 'Success'
    });

    await Transaction.create({
        user: user._id,
        type: 'credit',
        currency: 'INR',
        amount: earningsInRupee,
        source: factor > 1 ? `Speed Rewards Conversion: ${source}` : `Conversion: ${source}`,
        status: 'Success'
    });

    res.status(200).json({
        success: true,
        data: {
            coinsAwarded: totalAwardedCoins,
            inrCredited: earningsInRupee,
            newWalletBalance: user.wallet.balance,
            newCoinBalance: user.coins.balance
        }
    });
});

// @desc    Request withdrawal
// @route   POST /api/user/wallet/withdraw
// @access  Private
exports.requestWithdrawal = asyncHandler(async (req, res, next) => {
    const { amount, bankDetails } = req.body;
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
        source: 'Bank Payout',
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
        paymentMethod: 'Bank Transfer',
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
        message: 'Withdrawal request submitted successfully',
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
