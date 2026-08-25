const Notification = require('../models/Notification');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

async function persistInboxForUsers(userIds, { title, message, type, link, notificationId }) {
    const AppNotification = require('../models/AppNotification');
    const docs = userIds.map((id) => ({
        user: id,
        title,
        message,
        type: type || 'broadcast',
        step: 'admin_broadcast',
        link: link || '/user/home',
        isRead: false,
        dedupeKey: `${id}_${notificationId}`,
    }));
    for (let i = 0; i < docs.length; i += 400) {
        await AppNotification.insertMany(docs.slice(i, i + 400), { ordered: false }).catch(() => {});
    }
}

async function resolveAudienceIds(audience, userIds) {
    if (audience === 'selected' || audience === 'user') {
        return [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
    }
    const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
    return users.map((u) => String(u._id));
}

async function deliverNotification(notification) {
    const ids = await resolveAudienceIds(notification.audience, notification.userIds);
    const notificationId = `admin_${notification._id}`;
    const link = notification.targetUrl || '/user/home';

    await persistInboxForUsers(ids, {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'broadcast',
        link,
        notificationId,
    });

    if (global.io) {
        if (notification.audience === 'all') {
            global.io.emit('new_broadcast', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                createdAt: notification.createdAt,
            });
        } else {
            ids.forEach((id) => {
                global.io.emit(`user_notification_${id}`, {
                    id: notification._id,
                    title: notification.title,
                    message: notification.message,
                });
            });
        }
    }

    try {
        const { sendBroadcastNotification } = require('./fcmController');
        await sendBroadcastNotification({
            title: notification.title,
            body: notification.message,
            userIds: notification.audience === 'all' ? undefined : ids,
            data: {
                type: notification.type || 'broadcast',
                link,
                notificationId,
            },
        });
    } catch (pushErr) {
        console.error('Push broadcast failed:', pushErr.message);
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.recipients = ids.length;
    await notification.save();
    return notification;
}

exports.deliverNotification = deliverNotification;

exports.sendBroadcast = async (req, res, next) => {
    try {
        const { title, message, type, targetUrl, audience, userIds, scheduledAt } = req.body;

        if (!title || !message) {
            return next(new ErrorResponse('Please provide title and message', 400));
        }

        const audienceType = ['selected', 'user'].includes(audience) ? audience : 'all';
        const ids = audienceType === 'all' ? [] : [...new Set((userIds || []).map(String).filter(Boolean))];
        if (audienceType !== 'all' && !ids.length) {
            return next(new ErrorResponse('Select at least one user', 400));
        }

        const when = scheduledAt ? new Date(scheduledAt) : null;
        const isFuture = when && !Number.isNaN(when.getTime()) && when.getTime() > Date.now() + 15000;

        const notification = await Notification.create({
            title,
            message,
            type: type || 'broadcast',
            targetUrl,
            audience: audienceType,
            userIds: ids,
            scheduledAt: isFuture ? when : null,
            status: isFuture ? 'scheduled' : 'sent',
            recipients: 0,
        });

        if (isFuture) {
            return res.status(201).json({
                success: true,
                data: notification,
                message: `Scheduled for ${when.toISOString()}`,
            });
        }

        await deliverNotification(notification);

        res.status(201).json({
            success: true,
            data: notification,
        });
    } catch (err) {
        next(err);
    }
};

exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find().sort('-createdAt').limit(40);
        res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (err) {
        next(err);
    }
};

exports.getPublicNotifications = async (req, res, next) => {
    try {
        let query = {
            isActive: true,
            status: { $ne: 'scheduled' },
            $or: [{ audience: 'all' }, { audience: { $exists: false } }],
        };

        if (req.user) {
            query.createdAt = { $gte: req.user.createdAt };
        }

        const notifications = await Notification.find(query).sort('-createdAt').limit(10);
        res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        await notification.deleteOne();

        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (err) {
        next(err);
    }
};

exports.clearAllNotifications = async (req, res, next) => {
    try {
        await Notification.deleteMany();
        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (err) {
        next(err);
    }
};

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
            data: notification,
        });
    } catch (err) {
        next(err);
    }
};
