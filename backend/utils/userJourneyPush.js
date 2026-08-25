const User = require('../models/User');

const JOURNEY_STEPS = {
    welcome: {
        title: 'Welcome to Dromoney',
        body: 'Welcome to Dromoney! आपका account successfully create हो गया है। अब अपने account को complete करके earning शुरू करें।',
        type: 'info',
        link: '/user/home',
    },
    kyc_submitted: {
        title: 'KYC Submitted',
        body: 'आपके KYC documents successfully submit हो गए हैं और अभी review में हैं। Verification complete होने पर आपको notification दिया जाएगा।',
        type: 'info',
        link: '/user/profile',
    },
    kyc_approved: {
        title: 'KYC Approved',
        body: 'Congratulations! आपका KYC successfully approve हो गया है। अब आप platform की eligible earning features का उपयोग कर सकते हैं।',
        type: 'success',
        link: '/user/virtual-account',
    },
    kyc_rejected: {
        title: 'KYC Rejected',
        body: 'आपका KYC verification complete नहीं हो सका। कृपया दिए गए कारण को check करें और आवश्यक सुधार के बाद documents दोबारा submit करें।',
        type: 'error',
        link: '/user/profile',
    },
    va_reminder_3: {
        title: 'Virtual Account — 3 days',
        body: 'अपना Virtual Account 3 दिनों के अंदर बनाएं और ₹399 अपने wallet में वापस पाएं। समय सीमा के बाद ₹499 लागू होगा।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_payment_pending: {
        title: 'Virtual Account Payment',
        body: 'आपका Virtual Account payment successfully receive हो गया है। आपका payment अभी admin approval के लिए pending है।',
        type: 'info',
        link: '/user/virtual-account',
    },
    va_activated: {
        title: 'Virtual Account Unlocked',
        body: 'आपका Virtual Account successfully approved और unlocked हो गया है। अब आप platform की संबंधित earning सुविधाओं का उपयोग कर सकते हैं।',
        type: 'success',
        link: '/user/wallet',
    },
    va_deadline_7: {
        title: 'Virtual Account reminder',
        body: 'आपके Virtual Account बनाने की समय सीमा नजदीक आ रही है। कृपया 14 दिनों की समय सीमा से पहले Virtual Account बनाएं, अन्यथा आपकी pending amount सुरक्षित नहीं रह सकती।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_deadline_1: {
        title: '1 दिन बाकी',
        body: 'अंतिम 1 दिन बाकी है! अभी अपना Virtual Account बनाएं और अपनी pending amount को सुरक्षित करें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_deadline_14: {
        title: 'Pending amount removed',
        body: 'आपकी pending amount समय सीमा पूरी होने के कारण remove कर दी गई है। कृपया Virtual Account बनाकर अपनी आगे की eligible earning सुविधाओं को सक्रिय रखें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_cycle_reminder: {
        title: 'Virtual Account बनाएं',
        body: 'अपनी earning सुविधाओं को जारी रखने के लिए अपना Virtual Account बनाएं और उपलब्ध benefits को सुरक्षित रखें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_renew_reminder: {
        title: 'Virtual Account renewal',
        body: 'आपके Virtual Account की validity समाप्त होने में केवल 7 दिन बाकी हैं। बिना interruption के service जारी रखने के लिए अपना Virtual Account समय पर renew करें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_renewal_pending: {
        title: 'Renewal pending',
        body: 'आपके Virtual Account का renewal pending है। कृपया अपना Virtual Account जल्द renew करें ताकि आपकी eligible earning services जारी रह सकें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_expired: {
        title: 'Virtual Account locked',
        body: 'आपके Virtual Account का renewal pending है। कृपया अपना Virtual Account जल्द renew करें ताकि आपकी eligible earning services जारी रह सकें।',
        type: 'error',
        link: '/user/virtual-account',
    },
    va_pending_cleared: {
        title: 'Pending amount removed',
        body: 'आपकी pending amount समय सीमा पूरी होने के कारण remove कर दी गई है। कृपया Virtual Account बनाकर अपनी आगे की eligible earning सुविधाओं को सक्रिय रखें।',
        type: 'warning',
        link: '/user/virtual-account',
    },
    va_renewed: {
        title: 'Virtual Account Unlocked',
        body: 'आपका Virtual Account successfully approved और unlocked हो गया है। अब आप platform की संबंधित earning सुविधाओं का उपयोग कर सकते हैं।',
        type: 'success',
        link: '/user/wallet',
    },
    ff_criteria_done: {
        title: 'Future Fund criteria complete',
        body: 'Congratulations! आपका Future Fund criteria successfully complete हो गया है। अब अपना Future Fund activate करें।',
        type: 'success',
        link: '/user/future-fund',
    },
    ff_activated: {
        title: 'Future Fund Active',
        body: 'आपका Future Fund successfully active हो गया है। अपनी eligible passive income जारी रखने के लिए Ads और Tasks नियमित रूप से complete करते रहें।',
        type: 'success',
        link: '/user/future-fund',
    },
    invite_pending: {
        title: 'Referral ₹200 Pending',
        body: 'Congratulations! आपकी ₹200 referral earning successfully pending wallet में add हो गई है। Verification complete होने के बाद eligible amount आपके Virtual Account में transfer होगी।',
        type: 'success',
        link: '/user/wallet',
    },
    invite_virtual: {
        title: 'Referral ₹200 Virtual',
        body: 'आपकी ₹200 referral earning successfully verify होकर आपके Virtual Account में add हो गई है। अब आप eligible amount को withdraw कर सकते हैं।',
        type: 'success',
        link: '/user/wallet',
    },
    invite_clawback: {
        title: 'Referral ₹200 removed',
        body: 'आपका referred user inactive पाया गया है, इसलिए संबंधित ₹200 referral amount remove कर दी गई है। कृपया active और eligible users को ही refer करें ताकि आपकी referral earning सुरक्षित रहे।',
        type: 'warning',
        link: '/user/wallet',
    },
    maintenance: {
        title: 'Maintenance',
        body: 'System में अभी maintenance चल रहा है। हुई असुविधा के लिए हमें खेद है। कृपया कुछ समय बाद दोबारा प्रयास करें। System जल्द ही सामान्य रूप से उपलब्ध होगा।',
        type: 'alert',
        link: '/user/home',
    },
    task_approved: {
        title: 'Task Approved',
        body: 'Congratulations! आपका task successfully approve हो गया है और आपकी eligible earning आपके fund में जमा कर दी गई है।',
        type: 'success',
        link: '/user/earn',
    },
    task_rejected: {
        title: 'Task Rejected',
        body: 'आपका task proof approve नहीं हो सका। कृपया rejection reason check करें और यदि applicable हो तो सही proof के साथ task दोबारा submit करें।',
        type: 'error',
        link: '/user/earn',
    },
    withdraw_requested: {
        title: 'Withdrawal Submitted',
        body: 'आपकी withdrawal request successfully submit हो गई है। आपकी request अभी verification/processing में है।',
        type: 'info',
        link: '/user/wallet',
    },
    withdraw_processing: {
        title: 'Withdrawal Processing',
        body: 'आपकी withdrawal request अभी processing में है। Verification complete होने के बाद payment process किया जाएगा।',
        type: 'info',
        link: '/user/wallet',
    },
    withdraw_approved: {
        title: 'Withdrawal Approved',
        body: 'आपकी withdrawal request successfully approved और processed हो गई है। कृपया अपने selected payment account में amount check करें।',
        type: 'success',
        link: '/user/wallet',
    },
    withdraw_rejected: {
        title: 'Withdrawal Rejected',
        body: 'आपकी withdrawal request reject कर दी गई है। कृपया rejection reason check करें और आवश्यक सुधार के बाद eligible होने पर दोबारा request submit करें।',
        type: 'error',
        link: '/user/wallet',
    },
    inactive_nudge: {
        title: 'वापस आएं',
        body: 'आप पिछले कुछ दिनों से active नहीं हैं। अपनी earning जारी रखने के लिए Dromoney पर वापस आएं और available Ads, Tasks तथा eligible earning activities complete करें।',
        type: 'info',
        link: '/user/home',
    },
    earning_virtual: {
        title: 'Earning credited',
        body: 'Congratulations! आपकी earning successfully आपके Virtual Account में credit हो गई है। अपना balance check करें।',
        type: 'success',
        link: '/user/wallet',
    },
    account_hold: {
        title: 'Account Suspended',
        body: 'This account has been suspended. Contact support if you think this is a mistake.',
        type: 'error',
        link: '/user/home',
    },
};

const ONCE_STEPS = new Set([
    'welcome',
    'kyc_approved',
    'va_reminder_3',
    'va_deadline_7',
    'va_deadline_1',
    'va_activated',
    'ff_criteria_done',
    'ff_activated',
    'va_renew_reminder',
    'inactive_nudge',
]);

function stringifyData(data = {}) {
    const out = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        out[key] = typeof value === 'string' ? value : String(value);
    });
    return out;
}

function journeyNotificationId(userId, step, extras = {}) {
    if (extras.notificationId) return String(extras.notificationId);
    if (ONCE_STEPS.has(step)) return `${userId}_${step}`;
    return `${userId}_${step}_${Date.now()}`;
}

async function persistNotification(userId, { title, message, type, step, link, skipUserArray = false, dedupeKey = '' }) {
    const AppNotification = require('../models/AppNotification');
    if (dedupeKey) {
        const existing = await AppNotification.findOne({ user: userId, dedupeKey }).select('_id');
        if (existing) return existing;
    }
    const doc = await AppNotification.create({
        user: userId,
        title,
        message,
        type: type || 'info',
        step: step || '',
        link: link || '/user/home',
        isRead: false,
        dedupeKey: dedupeKey || '',
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
                    notificationId: item.notificationId || '',
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
    const notificationId = journeyNotificationId(userId, step, extras);

    if (!title || !body) return { sent: false };

    try {
        const AppNotification = require('../models/AppNotification');
        const already = notificationId
            ? await AppNotification.findOne({ user: userId, dedupeKey: notificationId }).select('_id')
            : null;

        if (!already) {
            await persistNotification(userId, {
                title,
                message: body,
                type,
                step,
                link,
                skipUserArray: false,
                dedupeKey: notificationId,
            });
        }

        const { sendNotificationToUser } = require('../controllers/fcmController');
        const sent = await sendNotificationToUser(userId, {
            title,
            body,
            data: stringifyData({
                type: step,
                link,
                notificationId,
            }),
        });

        if (!sent) {
            await queuePendingPush(userId, { step, title, body, link, notificationId });
        }

        return { sent: !!sent, skipped: !!already };
    } catch (err) {
        console.error(`[JOURNEY-PUSH] ${step} failed:`, err.message);
        try {
            await queuePendingPush(userId, { step, title, body, link, notificationId });
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
                    notificationId: item.notificationId || `${userId}_${item.step || 'queued'}_${Date.now()}`,
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
