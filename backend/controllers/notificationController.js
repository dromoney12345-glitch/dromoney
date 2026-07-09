const Notification = require('../models/Notification');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Send broadcast notification to all users
// @route   POST /api/admin/notifications/broadcast
// @access  Private/Admin
exports.sendBroadcast = async (req, res, next) => {
    try {
        const { title, message, type, targetUrl } = req.body;

        if (!title || !message) {
            return next(new ErrorResponse('Please provide title and message', 400));
        }

        // 1. Get total active users count for reporting
        const userCount = await User.countDocuments({ isBlocked: false });

        // 2. Save Notification to DB
        const notification = await Notification.create({
            title,
            message,
            type: type || 'broadcast',
            targetUrl,
            recipients: userCount
        });

        // 3. Emit Real-time signal via Socket.io (Handled in server.js or via global io)
        if (global.io) {
            global.io.emit('new_broadcast', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                createdAt: notification.createdAt
            });
        }

        // 4. Send Push Notification Broadcast to all devices via FCM
        try {
            const { sendBroadcastNotification } = require('./fcmController');
            await sendBroadcastNotification({
                title: notification.title,
                body: notification.message,
                data: {
                    type: notification.type,
                    link: notification.targetUrl || '/user/events'
                }
            });
        } catch (pushErr) {
            console.error('Push broadcast failed:', pushErr.message);
        }

        res.status(201).json({
            success: true,
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get broadcast history
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find().sort('-createdAt').limit(20);
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get latest notifications for user
// @route   GET /api/public/notifications
// @access  Public
exports.getPublicNotifications = async (req, res, next) => {
    try {
        let query = { isActive: true };
        
        // If user is logged in, don't show notifications that were created before they registered
        if (req.user) {
            query.createdAt = { $gte: req.user.createdAt };
        }

        // Fetch last 10 active broadcasts matching the query
        const notifications = await Notification.find(query).sort('-createdAt').limit(10);
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        await notification.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Clear all broadcast history
// @route   DELETE /api/admin/notifications/bulk/clear
// @access  Private/Admin
exports.clearAllNotifications = async (req, res, next) => {
    try {
        await Notification.deleteMany();
        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update a notification
// @route   PUT /api/admin/notifications/:id
// @access  Private/Admin
exports.updateNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        notification.title = req.body.title || notification.title;
        notification.message = req.body.message || notification.message;
        
        await notification.save();

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (err) {
        next(err);
    }
};
