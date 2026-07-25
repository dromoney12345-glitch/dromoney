const TaskSubmission = require('../models/TaskSubmission');
const Task = require('../models/Task');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Submit task proof
// @route   POST /api/user/tasks/submit
// @access  Private
exports.submitTask = asyncHandler(async (req, res, next) => {
    const { taskId, proofImage, coinsReward } = req.body;

    if (!taskId || !proofImage) {
        return next(new ErrorResponse('Please provide taskId and proofImage', 400));
    }

    const task = await Task.findById(taskId);
    if (!task) {
        return next(new ErrorResponse('Task not found', 404));
    }

    // Check Admin Task Timing Window
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.taskWindowStart && settings.taskWindowEnd) {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(now.getTime() + istOffset);
        const currentTotalMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

        const [startH, startM] = settings.taskWindowStart.split(':').map(Number);
        const startTotalMins = (startH || 0) * 60 + (startM || 0);

        const [endH, endM] = settings.taskWindowEnd.split(':').map(Number);
        const endTotalMins = (endH || 0) * 60 + (endM || 0);

        // Simple check (assuming start < end, e.g., 09:00 to 17:00)
        if (startTotalMins < endTotalMins) {
            if (currentTotalMins < startTotalMins || currentTotalMins > endTotalMins) {
                return next(new ErrorResponse(`Tasks are currently unavailable. Available from ${settings.taskWindowStart} to ${settings.taskWindowEnd}`, 400));
            }
        }
    }

    const user = await User.findById(req.user.id);
    
    // Check if already submitted within the renewal period
    const renewalHours = settings.taskRenewalHours || 24;
    const cutoffTime = new Date(Date.now() - renewalHours * 60 * 60 * 1000);
    const alreadySubmitted = await TaskSubmission.findOne({
        user: req.user.id,
        task: taskId,
        createdAt: { $gte: cutoffTime }
    });

    if (alreadySubmitted) {
        return next(new ErrorResponse(`You have already submitted proof for this task recently. Please wait ${renewalHours} hours before submitting again.`, 400));
    }

    const submission = await TaskSubmission.create({
        user: req.user.id,
        task: taskId,
        proofImage,
        coinsReward: coinsReward || task.coinsReward,
        status: 'Pending'
    });

    // Send push notification to all admins
    try {
        const { sendNotificationToAllAdmins } = require('./fcmController');
        await sendNotificationToAllAdmins({
            title: 'New Task Proof Submitted 📝',
            body: `A new task proof has been submitted for "${task.title}". Review proof now.`,
            data: {
                type: 'task_submission_alert',
                link: '/admin/tasks/review'
            }
        });
    } catch (pushErr) {
        console.error('Admin push notification failed for task proof submission:', pushErr.message);
    }

    res.status(201).json({
        success: true,
        data: submission,
        message: 'Proof submitted successfully. Coins will be added after admin approval.'
    });
});

// @desc    Get all task submissions for admin
// @route   GET /api/admin/tasks/submissions
// @access  Private/Admin
exports.getAdminSubmissions = asyncHandler(async (req, res, next) => {
    const submissions = await TaskSubmission.find()
        .populate('user', 'name email phone')
        .populate('task', 'title type coinsReward')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        data: submissions
    });
});

// @desc    Approve task submission
// @route   PUT /api/admin/tasks/submissions/:id/approve
// @access  Private/Admin
exports.approveSubmission = asyncHandler(async (req, res, next) => {
    const submission = await TaskSubmission.findById(req.params.id);

    if (!submission) {
        return next(new ErrorResponse('Submission not found', 404));
    }

    if (submission.status !== 'Pending') {
        return next(new ErrorResponse('Submission is already processed', 400));
    }

    const user = await User.findById(submission.user);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const task = await Task.findById(submission.task);
    if (!task) {
        return next(new ErrorResponse('Task not found', 404));
    }

    // Calculate coins to add (apply Booster if active, but not for Video/Watch tasks)
    let factor = 1;
    if ((user.isBoosterActive || user.isTaskBoosterActive) && task.type !== 'Video' && task.type !== 'Watch') {
        const Booster = require('../models/Booster');
        const taskBooster = await Booster.findOne({ type: 'task' });
        if (!taskBooster || !taskBooster.applicableTasks || taskBooster.applicableTasks.length === 0 || taskBooster.applicableTasks.includes('General Tasks') || taskBooster.applicableTasks.includes(task.type)) {
            factor = 12; // default
            if (taskBooster && taskBooster.benefits) {
                for (const b of taskBooster.benefits) {
                    const match = b.match(/(\d+)x/i);
                    if (match) {
                        factor = parseInt(match[1]);
                        break;
                    }
                }
            }
        }
    }
    const baseCoins = submission.coinsReward || task.coinsReward || 2;
    const coinsToAdd = baseCoins * factor;

    // Remove conversion logic
    // Update balances
    user.coins.balance += coinsToAdd;
    user.coins.lifetimeCoins += coinsToAdd;

    // Track completion uniformly for 24-hour cycle
    user.dailyTaskCompletions.push({
        taskId: task._id,
        completedAt: new Date()
    });

    await user.save();

    // Record Transaction Logs
    await Transaction.create({
        user: user._id,
        type: 'credit',
        currency: 'COIN',
        amount: coinsToAdd,
        source: factor > 1 ? `Processing Rewards: Task Approved: ${task.title}` : `Task Approved: ${task.title}`,
        status: 'Success'
    });

    // Check for High Value Milestones & Notify Admins
    try {
        const totalCompleted = (user.completedTasks ? user.completedTasks.length : 0) + (user.dailyTaskCompletions ? user.dailyTaskCompletions.length : 0);
        const hasReachedEarningsMilestone = user.wallet?.lifetimeEarnings >= 5000;
        
        // Trigger for exactly 100th task completed
        if (totalCompleted === 100) {
            const { sendNotificationToAllAdmins } = require('./fcmController');
            await sendNotificationToAllAdmins({
                title: 'Milestone Achieved! 🏆',
                body: `User ${user.name} has completed their 100th task. Consider sending a reward.`,
                data: {
                    type: 'milestone_alert',
                    link: '/admin/users'
                }
            });
        }
    } catch (milestoneErr) {
        console.error('Milestone admin notification failed:', milestoneErr.message);
    }

    // Update submission status
    submission.status = 'Approved';
    await submission.save();

    // Send Push Notification
    try {
        const { sendNotificationToUser } = require('./fcmController');
        await sendNotificationToUser(submission.user, {
            title: 'Task Approved! 🌟',
            body: `Awesome work! Your task "${task.title}" has been approved. +${coinsToAdd} Coins added!`,
            data: {
                type: 'task',
                link: '/user/earn'
            }
        });
    } catch (pushErr) {
        console.error('Push notification failed for task approval:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Submission approved and coins added to user'
    });
});

// @desc    Reject task submission
// @route   PUT /api/admin/tasks/submissions/:id/reject
// @access  Private/Admin
exports.rejectSubmission = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;
    const submission = await TaskSubmission.findById(req.params.id);

    if (!submission) {
        return next(new ErrorResponse('Submission not found', 404));
    }

    if (submission.status !== 'Pending') {
        return next(new ErrorResponse('Submission is already processed', 400));
    }

    const task = await Task.findById(submission.task);
    const taskTitle = task ? task.title : 'Task';

    submission.status = 'Rejected';
    submission.rejectionReason = reason || 'Proof invalid or incomplete';
    await submission.save();

    // Send Push Notification
    try {
        const { sendNotificationToUser } = require('./fcmController');
        await sendNotificationToUser(submission.user, {
            title: 'Task Action Required ⚠️',
            body: `Your task submission for "${taskTitle}" was rejected. Please review guidelines and try again.`,
            data: {
                type: 'task',
                link: '/user/earn'
            }
        });
    } catch (pushErr) {
        console.error('Push notification failed for task rejection:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Submission rejected'
    });
});
