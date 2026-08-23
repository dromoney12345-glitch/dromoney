const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const admin = require('../config/firebaseAdmin');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Save FCM Token
// @route   POST /api/fcm-tokens/save
// @access  Private
exports.saveToken = asyncHandler(async (req, res, next) => {
    const { token, platform } = req.body;

    if (!token) {
        return next(new ErrorResponse('Please provide a token', 400));
    }

    const field = (platform === 'mobile' || platform === 'app') ? 'fcmTokenMobile' : 'fcmTokens';

    if (req.user) {
        // Atomic update using $addToSet to prevent duplicates and parallel save errors
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { [field]: token }
        });
        try {
            const { flushPendingPushes } = require('../utils/userJourneyPush');
            await flushPendingPushes(req.user.id);
        } catch (flushErr) {
            console.error('[FCM] Pending push flush failed:', flushErr.message);
        }
    } else if (req.admin) {
        const Admin = require('../models/Admin');
        await Admin.findByIdAndUpdate(req.admin.id, {
            $addToSet: { [field]: token }
        });
    }

    res.status(200).json({
        success: true,
        message: 'Token saved successfully'
    });
});

// @desc    Remove FCM Token
// @route   POST /api/fcm-tokens/remove
// @access  Private
exports.removeToken = asyncHandler(async (req, res, next) => {
    const { token } = req.body;

    if (req.user) {
        // Atomic update using $pull to remove token safely
        await User.findByIdAndUpdate(req.user.id, {
            $pull: {
                fcmTokens: token,
                fcmTokenMobile: token
            }
        });
    } else if (req.admin) {
        const Admin = require('../models/Admin');
        await Admin.findByIdAndUpdate(req.admin.id, {
            $pull: {
                fcmTokens: token,
                fcmTokenMobile: token
            }
        });
    }

    res.status(200).json({
        success: true,
        message: 'Token removed successfully'
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
            link: req.admin ? '/admin/dashboard' : '/user/home'
        }
    };

    if (req.user) {
        await exports.sendNotificationToUser(req.user.id, payload);
    } else if (req.admin) {
        await exports.sendNotificationToAdmin(req.admin.id, payload);
    }

    res.status(200).json({
        success: true,
        message: 'Test notification triggered'
    });
});

// Helper Function: Send Notification to User (Duplicate-Safe)
exports.sendNotificationToUser = async (userId, payload) => {
    try {
        // Generate a unique notification ID if not provided
        const notificationId = payload.data?.notificationId || `${userId}_${payload.data?.type || 'gen'}_${Date.now()}`;

        // 1. Prevent duplicate delivery (24h window) - Bypass for test
        const isTest = payload.data?.type === 'test';
        const exists = await NotificationLog.findOne({ notificationId });
        if (exists && !isTest) {
            return true;
        }

        const user = await User.findById(userId);
        if (!user) return false;

        // Combine all tokens
        let tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
        tokens = [...new Set(tokens)]; // Remove duplicates
        tokens = tokens.filter(t => t && t !== 'undefined' && t !== 'null');

        if (!tokens.length) {
            return false;
        }

        // 2. Send via Firebase
        const message = {
            notification: {
                title: payload.title,
                body: payload.body
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'high_importance_channel'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            },
            data: Object.fromEntries(
                Object.entries({ ...(payload.data || {}), notificationId }).map(([k, v]) => [
                    k,
                    v === undefined || v === null ? '' : String(v),
                ])
            ),
            tokens: tokens
        };

        console.log(`[FCM-DEBUG] Sending to ${tokens.length} tokens for user: ${userId}`);
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM-DEBUG] Success: ${response.successCount}, Fail: ${response.failureCount}`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`[FCM-DEBUG] Token ${idx} Error:`, resp.error.code, resp.error.message);
                }
            });
        }

        // 3. Cleanup invalid tokens if any failed
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                user.fcmTokens = user.fcmTokens.filter(t => !failedTokens.includes(t));
                user.fcmTokenMobile = user.fcmTokenMobile.filter(t => !failedTokens.includes(t));
                await user.save();
            }
        }

        // 4. Log the notification
        await NotificationLog.create({
            notificationId,
            userId,
            tokens,
            title: payload.title,
            body: payload.body
        });

        return true;
    } catch (error) {
        // Silently fail in production
        return false;
    }
};

// Helper Function: Send Broadcast Notification to all users
exports.sendBroadcastNotification = async (payload) => {
    try {
        const users = await User.find({
            $or: [
                { fcmTokens: { $gt: [] } },
                { fcmTokenMobile: { $gt: [] } }
            ]
        });

        let allTokens = [];
        users.forEach(user => {
            const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
            allTokens.push(...tokens);
        });

        allTokens = [...new Set(allTokens)]; // Remove duplicates
        allTokens = allTokens.filter(t => t && t !== 'undefined' && t !== 'null');

        if (!allTokens.length) {
            return;
        }

        // Firebase multicast has a limit of 500 tokens per call, so chunk them
        const chunks = [];
        const chunkSize = 500;
        for (let i = 0; i < allTokens.length; i += chunkSize) {
            chunks.push(allTokens.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'high_importance_channel'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default'
                        }
                    }
                },
                data: {
                    ...payload.data,
                    notificationId: `broadcast_${Date.now()}`
                },
                tokens: chunk
            };

            await admin.messaging().sendEachForMulticast(message);
        }
    } catch (error) {
        console.error('FCM Broadcast Error:', error);
    }
};

// Helper Function: Send Notification to Admin (Duplicate-Safe)
exports.sendNotificationToAdmin = async (adminId, payload) => {
    try {
        const notificationId = payload.data?.notificationId || `${adminId}_${payload.data?.type || 'gen'}_${Date.now()}`;

        // Prevent duplicate delivery (24h window) - Bypass for test
        const isTest = payload.data?.type === 'test';
        const exists = await NotificationLog.findOne({ notificationId });
        if (exists && !isTest) {
            return;
        }

        const Admin = require('../models/Admin');
        const adminUser = await Admin.findById(adminId);
        if (!adminUser) return;

        // Combine all tokens
        let tokens = [...(adminUser.fcmTokens || []), ...(adminUser.fcmTokenMobile || [])];
        tokens = [...new Set(tokens)]; // Remove duplicates
        tokens = tokens.filter(t => t && t !== 'undefined' && t !== 'null');

        if (!tokens.length) {
            return;
        }

        // Send via Firebase
        const message = {
            notification: {
                title: payload.title,
                body: payload.body
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'high_importance_channel'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            },
            data: {
                ...payload.data,
                notificationId
            },
            tokens: tokens
        };

        console.log(`[FCM-DEBUG] Sending to ${tokens.length} tokens for admin: ${adminId}`);
        const response = await admin.messaging().sendEachForMulticast(message);

        // Cleanup invalid tokens if any failed
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                adminUser.fcmTokens = adminUser.fcmTokens.filter(t => !failedTokens.includes(t));
                adminUser.fcmTokenMobile = adminUser.fcmTokenMobile.filter(t => !failedTokens.includes(t));
                await adminUser.save();
            }
        }

        // Log the notification
        await NotificationLog.create({
            notificationId,
            userId: adminId,
            tokens,
            title: payload.title,
            body: payload.body
        });

    } catch (error) {
        console.error('FCM sendNotificationToAdmin Error:', error);
    }
};

// Helper Function: Send Notification to All Admins
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


