const User = require('../models/User');

const JOURNEY_STEPS = {
    welcome: {
        title: 'Welcome to Dromoney 👋',
        body: 'Complete KYC, then create your Virtual Account to start earning.',
        type: 'info',
        link: '/user/home',
    },
    kyc_submitted: {
        title: 'KYC Received 📑',
        body: 'Your KYC documents are received. Please wait while our team reviews them.',
        type: 'info',
        link: '/user/profile',
    },
    kyc_approved: {
        title: 'KYC Approved ✅',
        body: 'KYC is approved. Create a Virtual Account to move money from Pending to Virtual.',
        type: 'success',
        link: '/user/virtual-account',
    },
    kyc_rejected: {
        title: 'KYC Rejected ⚠️',
        body: 'KYC verification failed. Please re-submit clear documents.',
        type: 'error',
        link: '/user/profile',
    },
    va_payment_pending: {
        title: 'Virtual Account Payment Pending ⏳',
        body: 'Payment proof received. Admin will verify in 10–15 minutes.',
        type: 'info',
        link: '/user/virtual-account',
    },
    va_activated: {
        title: 'Virtual Account Active 🚀',
        body: 'Your Virtual Account is active. Withdrawals can be requested from Virtual Wallet.',
        type: 'success',
        link: '/user/wallet',
    },
    invite_pending: {
        title: 'Invite ₹200 in Pending',
        body: 'Your invite completed KYC. ₹200 is in Pending until they create a Virtual Account.',
        type: 'success',
        link: '/user/wallet',
    },
    invite_virtual: {
        title: 'Invite ₹200 Unlocked',
        body: '₹200 moved from Pending Wallet to Virtual Wallet.',
        type: 'success',
        link: '/user/wallet',
    },
    invite_clawback: {
        title: 'Refer active users only',
        body: 'The user you referred is not active yet, so ₹200 was removed from Pending.',
        type: 'warning',
        link: '/user/wallet',
    },
    withdraw_requested: {
        title: 'Withdrawal Submitted 💸',
        body: 'Your withdrawal request is pending. Admin will process it in 10–15 minutes.',
        type: 'info',
        link: '/user/wallet',
    },
    withdraw_approved: {
        title: 'Withdrawal Approved 🎉',
        body: 'Your withdrawal has been approved and transferred.',
        type: 'success',
        link: '/user/wallet',
    },
    withdraw_rejected: {
        title: 'Withdrawal Rejected ❌',
        body: 'Your withdrawal was rejected. Please check details and try again.',
        type: 'error',
        link: '/user/wallet',
    },
    account_hold: {
        title: 'Account Suspended',
        body: 'This account has been suspended. Contact support if you think this is a mistake.',
        type: 'error',
        link: '/user/home',
    },
    va_deadline_7: {
        title: 'Virtual Account reminder',
        body: 'Create your Virtual Account so Pending earnings can move to Virtual and you can withdraw.',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_deadline_14: {
        title: 'Pending earnings removed',
        body: 'Virtual Account was not created within 14 days. Your Pending Wallet was cleared. This repeats every 14 days until you buy a Virtual Account.',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_renew_reminder: {
        title: 'Virtual Account expires soon',
        body: 'Your Virtual Account expires in 7 days. Renew it now so withdrawals stay open and new earnings keep going to Virtual.',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_expired: {
        title: 'Virtual Account locked',
        body: 'Your Virtual Account has expired and is locked. Previous Virtual balance is safe but cannot be withdrawn until you renew. New earnings will go to Pending.',
        type: 'error',
        link: '/user/virtual-account',
    },
    va_pending_cleared: {
        title: 'Pending Wallet cleared',
        body: 'Virtual Account was not renewed within 14 days, so Pending earnings were removed. Locked Virtual balance is still safe. Renew to unlock it.',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_renewed: {
        title: 'Virtual Account renewed',
        body: 'Virtual Account is active for 6 more months. Previous Virtual balance is unlocked again, and current Pending moved to Virtual.',
        type: 'success',
        link: '/user/wallet',
    },
};

function stringifyData(data = {}) {
    const out = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        out[key] = typeof value === 'string' ? value : String(value);
    });
    return out;
}

async function persistNotification(userId, { title, message, type, step, link, skipUserArray = false }) {
    const AppNotification = require('../models/AppNotification');
    const doc = await AppNotification.create({
        user: userId,
        title,
        message,
        type: type || 'info',
        step: step || '',
        link: link || '/user/home',
        isRead: false,
    });

    if (!skipUserArray) {
        await User.findByIdAndUpdate(userId, {
            $push: {
                notifications: {
                    $each: [{
                        title,
                        message,
                        type: type || 'info',
                        isRead: false,
                        createdAt: new Date(),
                    }],
                    $slice: -50,
                },
            },
        });
    }

    return doc;
}

async function queuePendingPush(userId, item) {
    await User.findByIdAndUpdate(userId, {
        $push: {
            pendingPushes: {
                $each: [{
                    step: item.step,
                    title: item.title,
                    body: item.body,
                    link: item.link,
                    createdAt: new Date(),
                }],
                $slice: -20,
            },
        },
    });
}

/**
 * In-app + phone FCM. If the device token is not saved yet, queue and flush on token save.
 */
async function notifyJourney(userId, step, extras = {}) {
    if (!userId) return { sent: false };
    const def = JOURNEY_STEPS[step] || {};
    const title = extras.title || def.title;
    const body = extras.body || def.body;
    const type = extras.type || def.type || 'info';
    const link = extras.link || def.link || '/user/home';

    if (!title || !body) return { sent: false };

    try {
        await persistNotification(userId, {
            title,
            message: body,
            type,
            step,
            link,
            skipUserArray: !!extras.skipInApp,
        });

        const { sendNotificationToUser } = require('../controllers/fcmController');
        const sent = await sendNotificationToUser(userId, {
            title,
            body,
            data: stringifyData({
                type: step,
                link,
                notificationId: extras.notificationId || `${userId}_${step}_${Date.now()}`,
            }),
        });

        if (!sent) {
            await queuePendingPush(userId, { step, title, body, link });
        }

        return { sent: !!sent };
    } catch (err) {
        console.error(`[JOURNEY-PUSH] ${step} failed:`, err.message);
        try {
            await queuePendingPush(userId, { step, title, body, link });
        } catch (queueErr) {
            console.error('[JOURNEY-PUSH] queue failed:', queueErr.message);
        }
        return { sent: false };
    }
}

async function flushPendingPushes(userId) {
    if (!userId) return;
    const user = await User.findById(userId).select('pendingPushes fcmTokens fcmTokenMobile');
    if (!user?.pendingPushes?.length) return;

    const queued = [...user.pendingPushes];
    user.pendingPushes = [];
    await user.save({ validateBeforeSave: false });

    const { sendNotificationToUser } = require('../controllers/fcmController');
    for (const item of queued) {
        try {
            const sent = await sendNotificationToUser(userId, {
                title: item.title,
                body: item.body,
                data: stringifyData({
                    type: item.step || 'queued',
                    link: item.link || '/user/home',
                    notificationId: `${userId}_${item.step || 'queued'}_${Date.now()}`,
                }),
            });
            if (!sent) {
                await queuePendingPush(userId, item);
            }
        } catch (err) {
            console.error('[JOURNEY-PUSH] flush item failed:', err.message);
        }
    }
}

module.exports = {
    JOURNEY_STEPS,
    notifyJourney,
    flushPendingPushes,
    persistNotification,
};
