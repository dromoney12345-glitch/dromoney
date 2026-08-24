const TaskSubmission = require('../models/TaskSubmission');
const Task = require('../models/Task');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { getLastRenewalTick, getIstMinutesNow } = require('../utils/taskRenewal');

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

    // Check Admin Task Timing Window (IST)
    const settings = await Settings.findOne();
    if (settings && settings.taskWindowStart && settings.taskWindowEnd) {
        const currentTotalMins = getIstMinutesNow();

        const [startH, startM] = settings.taskWindowStart.split(':').map(Number);
        const startTotalMins = (startH || 0) * 60 + (startM || 0);

        const [endH, endM] = settings.taskWindowEnd.split(':').map(Number);
        const endTotalMins = (endH || 0) * 60 + (endM || 0);

        const inWindow = startTotalMins < endTotalMins
            ? (currentTotalMins >= startTotalMins && currentTotalMins <= endTotalMins)
            : (currentTotalMins >= startTotalMins || currentTotalMins <= endTotalMins);

        if (!inWindow) {
            return next(new ErrorResponse(`Tasks are currently unavailable. Available from ${settings.taskWindowStart} to ${settings.taskWindowEnd}`, 400));
        }
    }

    const user = await User.findById(req.user.id);
    
    // Check if already submitted within the renewal period
    const lastRenewalTick = getLastRenewalTick(settings);
    const alreadySubmitted = await TaskSubmission.findOne({
        user: req.user.id,
        task: taskId,
        createdAt: { $gte: lastRenewalTick }
    });

    if (alreadySubmitted) {
        return next(new ErrorResponse(`You have already submitted proof for this task today. Please wait for the next renewal cycle.`, 400));
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

    user.dailyTaskCompletions.push({
        taskId: task._id,
        completedAt: new Date()
    });
    user.lifetimeTasksCompleted = (user.lifetimeTasksCompleted || 0) + 1;

    try {
        const { syncFutureFundCriteria } = require('../utils/futureFund');
        const ffSettings = (await Settings.findOne()) || {};
        await syncFutureFundCriteria(user, ffSettings);
    } catch (ffErr) {
        console.error('Future Fund sync after task approval failed:', ffErr.message);
    }

    await user.save();

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
            body: `Awesome work! Your task "${task.title}" has been approved.`,
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
        message: 'Submission approved'
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
