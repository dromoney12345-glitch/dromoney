const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const admin = require('../config/firebaseAdmin');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

function normalizeFcmToken(raw) {
    if (raw == null) return '';
    let value = raw;
    if (typeof value === 'object') {
        value = value.token || value.fcmToken || value.data || '';
        if (typeof value === 'object' && value) {
            value = value.token || value.fcmToken || '';
        }
    }
    let token = String(value || '').trim();
    if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
    ) {
        token = token.slice(1, -1).trim();
    }
    if (token.startsWith('{')) {
        try {
            const parsed = JSON.parse(token);
            token = String(parsed.token || parsed.fcmToken || '').trim();
        } catch {
            /* keep original */
        }
    }
    if (!token || token === 'null' || token === 'undefined' || token.length < 20) {
        return '';
    }
    return token;
}

function stringifyFcmData(data = {}) {
    const out = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        out[key] = typeof value === 'string' ? value : String(value);
    });
    return out;
}

function uniqueTokens(list) {
    return [...new Set((list || []).filter((t) => t && t !== 'undefined' && t !== 'null' && String(t).length >= 20))];
}

function firebaseReady() {
    return !!(admin && admin.apps && admin.apps.length);
}

function pushPayload(title, body, tokens, data) {
    const safeTitle = String(title || 'Dromoney').slice(0, 120);
    const safeBody = String(body || '').slice(0, 500);
    const dataPayload = stringifyFcmData({
        ...(data || {}),
        title: safeTitle,
        body: safeBody,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
    });

    return {
        tokens,
        // Required for system tray when app is background / killed
        notification: {
            title: safeTitle,
            body: safeBody,
        },
        data: dataPayload,
        android: {
            priority: 'high',
            ttl: 86400000,
            notification: {
                title: safeTitle,
                body: safeBody,
                sound: 'default',
                // Must match Flutter flutter_local_notifications channel id
                channelId: 'high_importance_channel',
                priority: 'high',
                defaultSound: true,
                defaultVibrateTimings: true,
                visibility: 'public',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                // Avoid collapsing unrelated alerts into one
                tag: String(data?.notificationId || `dm_${Date.now()}`).slice(0, 64),
            },
        },
        apns: {
            headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
            },
            payload: {
                aps: {
                    alert: {
                        title: safeTitle,
                        body: safeBody,
                    },
                    sound: 'default',
                    badge: 1,
                    'content-available': 1,
                    'mutable-content': 1,
                },
            },
        },
        webpush: {
            headers: { Urgency: 'high' },
            notification: {
                title: safeTitle,
                body: safeBody,
                icon: '/logo.png',
                badge: '/logo.png',
            },
            fcmOptions: {
                link: String(data?.link || '/user/home'),
            },
        },
    };
}

// @desc    Save FCM Token
// @route   POST /api/fcm-tokens/save
// @access  Private
exports.saveToken = asyncHandler(async (req, res, next) => {
    const token = normalizeFcmToken(req.body.token || req.body.fcmToken);
    const platform = String(req.body.platform || 'web').toLowerCase();

    if (!token) {
        return next(new ErrorResponse('Please provide a token', 400));
    }

    const isMobile = platform === 'mobile' || platform === 'app' || platform === 'android' || platform === 'ios';
    const userId = req.user?._id || req.user?.id;
    const adminId = req.admin?._id || req.admin?.id;

    // Always persist mobile tokens into fcmTokenMobile (and fcmTokens for reachability)
    const add = isMobile
        ? { fcmTokenMobile: token, fcmTokens: token }
        : { fcmTokens: token };

    if (userId) {
        const before = await User.findById(userId).select('fcmTokenMobile');
        const hadMobile = (before?.fcmTokenMobile || []).length > 0;

        const updated = await User.findByIdAndUpdate(
            userId,
            { $addToSet: add },
            { new: true, select: 'fcmTokens fcmTokenMobile' }
        );
        console.log(
            `[FCM] saved ${isMobile ? 'mobile' : 'web'} token for user ${userId} ` +
            `(web=${updated?.fcmTokens?.length || 0} mobile=${updated?.fcmTokenMobile?.length || 0} suffix=${token.slice(-8)})`
        );
        try {
            const { flushPendingPushes } = require('../utils/userJourneyPush');
            await flushPendingPushes(userId);
        } catch (flushErr) {
            console.error('[FCM] Pending push flush failed:', flushErr.message);
        }

        // First mobile token ever: mark Failed logs so pending flush can retry cleanly
        if (isMobile && !hadMobile) {
            try {
                await NotificationLog.updateMany(
                    { userId, status: 'Failed' },
                    { $set: { status: 'Retry' } }
                );
            } catch {
                /* ignore */
            }
        }
    } else if (adminId) {
        const Admin = require('../models/Admin');
        await Admin.findByIdAndUpdate(adminId, { $addToSet: add });
        console.log(`[FCM] saved ${isMobile ? 'mobile' : 'web'} token for admin ${adminId}`);
    } else {
        return next(new ErrorResponse('Not authorized', 401));
    }

    res.status(200).json({
        success: true,
        message: 'Token saved successfully',
    });
});

// @desc    Remove FCM Token
// @route   POST /api/fcm-tokens/remove
// @access  Private
exports.removeToken = asyncHandler(async (req, res, next) => {
    const token = normalizeFcmToken(req.body.token || req.body.fcmToken);

    if (req.user) {
        await User.findByIdAndUpdate(req.user._id || req.user.id, {
            $pull: {
                fcmTokens: token,
                fcmTokenMobile: token,
            },
        });
    } else if (req.admin) {
        const Admin = require('../models/Admin');
        await Admin.findByIdAndUpdate(req.admin._id || req.admin.id, {
            $pull: {
                fcmTokens: token,
                fcmTokenMobile: token,
            },
        });
    }

    res.status(200).json({
        success: true,
        message: 'Token removed successfully',
    });
});

// @desc    Test Notification
// @route   POST /api/fcm-tokens/test
// @access  Private
exports.testNotification = asyncHandler(async (req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    const payload = {
        title: `Test Notification ${timestamp}`,
        body: 'This is a test notification from DroMoney 🚀',
        data: {
            type: 'test',
            id: `test_${Date.now()}`,
            link: req.admin ? '/admin/dashboard' : '/user/home',
        },
    };

    if (req.user) {
        await exports.sendNotificationToUser(req.user._id || req.user.id, payload);
    } else if (req.admin) {
        await exports.sendNotificationToAdmin(req.admin._id || req.admin.id, payload);
    }

    res.status(200).json({
        success: true,
        message: 'Test notification triggered',
    });
});

async function cleanupInvalidTokens(owner, tokens, responses, tokenFields) {
    const failedTokens = [];
    responses.forEach((resp, idx) => {
        if (resp.success) return;
        const errorCode = resp.error?.code;
        if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
        ) {
            failedTokens.push(tokens[idx]);
        }
    });
    if (!failedTokens.length) return;
    tokenFields.forEach((field) => {
        owner[field] = (owner[field] || []).filter((t) => !failedTokens.includes(t));
    });
    await owner.save();
}

// Helper Function: Send Notification to User (Duplicate-Safe)
exports.sendNotificationToUser = async (userId, payload) => {
    try {
        const notificationId = payload.data?.notificationId || `${userId}_${payload.data?.type || 'gen'}_${Date.now()}`;
        const isTest = payload.data?.type === 'test';
        const exists = await NotificationLog.findOne({ notificationId, status: 'Sent' });
        if (exists && !isTest) {
            return true;
        }

        const user = await User.findById(userId);
        if (!user) return false;

        const mobileTokens = uniqueTokens(user.fcmTokenMobile || []);
        const webTokens = uniqueTokens(user.fcmTokens || []);
        // Prefer native mobile tokens for phone tray; still include web for browsers
        const tokens = uniqueTokens(
            mobileTokens.length ? [...mobileTokens, ...webTokens] : webTokens
        );
        if (!tokens.length) {
            console.log(`[FCM-DEBUG] No tokens for user ${userId}`);
            return false;
        }

        if (!firebaseReady()) {
            console.error('[FCM] Firebase Admin not initialized — token is saved, push skipped');
            return false;
        }

        const message = pushPayload(payload.title, payload.body, tokens, {
            ...(payload.data || {}),
            notificationId,
        });

        console.log(
            `[FCM-DEBUG] Sending to ${tokens.length} tokens for user: ${userId} ` +
            `(mobile=${mobileTokens.length} web=${webTokens.length})`
        );
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM-DEBUG] Success: ${response.successCount}, Fail: ${response.failureCount}`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`[FCM-DEBUG] Token ${idx} Error:`, resp.error?.code, resp.error?.message);
                }
            });
            await cleanupInvalidTokens(user, tokens, response.responses, ['fcmTokens', 'fcmTokenMobile']);
        }

        // If only web tokens "succeeded" but user has no mobile token, treat as soft fail for queue
        const delivered = response.successCount > 0;
        if (!delivered && mobileTokens.length === 0) {
            console.log(`[FCM-DEBUG] No successful delivery and no mobile token for ${userId}`);
        }

        await NotificationLog.findOneAndUpdate(
            { notificationId },
            {
                notificationId,
                userId,
                tokens,
                title: payload.title,
                body: payload.body,
                status: delivered ? 'Sent' : 'Failed',
            },
            { upsert: true }
        );

        return delivered;
    } catch (error) {
        console.error('[FCM] sendNotificationToUser failed:', error.message);
        return false;
    }
};

exports.sendBroadcastNotification = async (payload) => {
    try {
        if (!firebaseReady()) {
            console.error('[FCM] Firebase Admin not initialized — broadcast skipped');
            return;
        }

        const query = payload.userIds?.length
            ? { _id: { $in: payload.userIds } }
            : {
                $or: [
                    { fcmTokens: { $gt: [] } },
                    { fcmTokenMobile: { $gt: [] } },
                ],
            };

        const users = await User.find(query).select('fcmTokens fcmTokenMobile');
        let allTokens = [];
        users.forEach((user) => {
            allTokens.push(...uniqueTokens([...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])]));
        });
        allTokens = uniqueTokens(allTokens);
        if (!allTokens.length) return;

        const chunkSize = 500;
        for (let i = 0; i < allTokens.length; i += chunkSize) {
            const chunk = allTokens.slice(i, i + chunkSize);
            await admin.messaging().sendEachForMulticast(
                pushPayload(payload.title, payload.body, chunk, {
                    ...(payload.data || {}),
                    notificationId: payload.data?.notificationId || `broadcast_${Date.now()}_${i}`,
                })
            );
        }
    } catch (error) {
        console.error('FCM Broadcast Error:', error);
    }
};

exports.sendNotificationToAdmin = async (adminId, payload) => {
    try {
        const notificationId = payload.data?.notificationId || `${adminId}_${payload.data?.type || 'gen'}_${Date.now()}`;
        const isTest = payload.data?.type === 'test';
        const exists = await NotificationLog.findOne({ notificationId, status: 'Sent' });
        if (exists && !isTest) return;

        const Admin = require('../models/Admin');
        const adminUser = await Admin.findById(adminId);
        if (!adminUser) return;

        const tokens = uniqueTokens([...(adminUser.fcmTokens || []), ...(adminUser.fcmTokenMobile || [])]);
        if (!tokens.length || !firebaseReady()) return;

        const response = await admin.messaging().sendEachForMulticast(
            pushPayload(payload.title, payload.body, tokens, {
                ...(payload.data || {}),
                notificationId,
            })
        );

        if (response.failureCount > 0) {
            await cleanupInvalidTokens(adminUser, tokens, response.responses, ['fcmTokens', 'fcmTokenMobile']);
        }

        await NotificationLog.create({
            notificationId,
            userId: adminId,
            tokens,
            title: payload.title,
            body: payload.body,
            status: response.successCount > 0 ? 'Sent' : 'Failed',
        }).catch(() => {});
    } catch (error) {
        console.error('FCM sendNotificationToAdmin Error:', error);
    }
};

exports.sendNotificationToAllAdmins = async (payload) => {
    try {
        const Admin = require('../models/Admin');
        const admins = await Admin.find({});
        for (const adminUser of admins) {
            await exports.sendNotificationToAdmin(adminUser._id, payload);
        }
    } catch (error) {
        console.error('FCM sendNotificationToAllAdmins Error:', error);
    }
};
