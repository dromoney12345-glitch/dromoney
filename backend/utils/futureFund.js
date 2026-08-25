const User = require('../models/User');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getIstDateString(date = new Date()) {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const FF_ACTIVATION = {
    kycTarget: 10,
    adsTarget: 50,
    tasksTarget: 50,
};

function getTargets(settings = {}) {
    const kyc = Number(settings.futureFundKycTarget) > 0
        ? Number(settings.futureFundKycTarget)
        : (Number(settings.futureFundSalesTarget) || FF_ACTIVATION.kycTarget);
    const ads = Number(settings.futureFundWatchAdTarget) > 0
        ? Number(settings.futureFundWatchAdTarget)
        : FF_ACTIVATION.adsTarget;
    const tasks = Number(settings.futureFundDailyTasksTarget) > 0
        ? Number(settings.futureFundDailyTasksTarget)
        : FF_ACTIVATION.tasksTarget;
    return {
        kycTarget: kyc,
        adsTarget: ads,
        tasksTarget: tasks,
        salesTarget: kyc,
        daysTarget: Number(settings.futureFundDaysTarget) || 7,
        activityMinutesTarget: Number(settings.futureFundActivityMinutes) || 15,
    };
}

/** One-time: old schema stored ads/tasks as 10. PDF activation is 10 KYC / 50 ads / 50 tasks. */
async function persistPdfActivationDefaults(settings) {
    if (!settings || typeof settings !== 'object') return settings;
    const ads = Number(settings.futureFundWatchAdTarget);
    const tasks = Number(settings.futureFundDailyTasksTarget);
    let changed = false;
    if (!Number(settings.futureFundKycTarget)) {
        settings.futureFundKycTarget = FF_ACTIVATION.kycTarget;
        changed = true;
    }
    if (ads === 10 && tasks === 10) {
        settings.futureFundWatchAdTarget = FF_ACTIVATION.adsTarget;
        settings.futureFundDailyTasksTarget = FF_ACTIVATION.tasksTarget;
        changed = true;
    }
    if (changed && typeof settings.save === 'function') {
        await settings.save();
    }
    return settings;
}

async function migratePdfActivationSettings() {
    const Settings = require('../models/Settings');
    await Settings.updateOne(
        { futureFundWatchAdTarget: 10, futureFundDailyTasksTarget: 10 },
        {
            $set: {
                futureFundWatchAdTarget: FF_ACTIVATION.adsTarget,
                futureFundDailyTasksTarget: FF_ACTIVATION.tasksTarget,
                futureFundKycTarget: FF_ACTIVATION.kycTarget,
            },
        }
    );
}

async function countSuccessfulKyc(userId) {
    return User.countDocuments({
        referredBy: userId,
        'kyc.status': { $in: ['Approved', 'Verified'] },
    });
}

async function countSuccessfulSales(userId) {
    return countSuccessfulKyc(userId);
}

async function syncFutureFundCriteria(user, settings = {}) {
    await persistPdfActivationDefaults(settings);
    const targets = getTargets(settings);
    let modified = false;

    if (!user.futureFund) {
        user.futureFund = {
            status: 'locked',
            progress: 0,
            overrideProfit: null,
            criteria: [],
            todayActivityMinutes: 0,
            lastActivityDate: null,
            activeDayDates: [],
        };
        modified = true;
    }

    const kycCurrent = await countSuccessfulKyc(user._id);
    const adsCurrent = Number(user.lifetimeAdsWatched) || 0;
    let tasksCurrent = Number(user.lifetimeTasksCompleted) || 0;
    if (!tasksCurrent) {
        const inferred =
            (Array.isArray(user.completedTasks) ? user.completedTasks.length : 0) +
            (Array.isArray(user.dailyTaskCompletions) ? user.dailyTaskCompletions.length : 0);
        if (inferred > 0) {
            user.lifetimeTasksCompleted = inferred;
            tasksCurrent = inferred;
            modified = true;
        }
    }

    const criteria = [
        {
            id: 1,
            title: 'Successful KYC',
            description: 'Invite friends who complete Aadhaar KYC.',
            target: targets.kycTarget,
            current: kycCurrent,
            completed: kycCurrent >= targets.kycTarget,
            unit: 'kyc',
        },
        {
            id: 2,
            title: 'Advertisement Videos',
            description: `Watch ${targets.adsTarget} advertisement videos.`,
            target: targets.adsTarget,
            current: Math.min(adsCurrent, targets.adsTarget),
            completed: adsCurrent >= targets.adsTarget,
            unit: 'ads',
        },
        {
            id: 3,
            title: 'Small Tasks',
            description: `Complete ${targets.tasksTarget} small tasks.`,
            target: targets.tasksTarget,
            current: Math.min(tasksCurrent, targets.tasksTarget),
            completed: tasksCurrent >= targets.tasksTarget,
            unit: 'tasks',
        },
    ];

    const progress = Math.round(
        (criteria.reduce((sum, c) => sum + Math.min(c.current / Math.max(c.target, 1), 1), 0) /
            criteria.length) *
            100
    );

    const eligible = criteria.every((c) => c.completed);

    const prevProgress = user.futureFund.progress;
    user.futureFund.criteria = criteria.map(({ id, title, target, current, completed, unit }) => ({
        id,
        title,
        target,
        current,
        completed,
        unit,
    }));
    user.futureFund.progress = progress;
    if (prevProgress !== progress) modified = true;

    if (eligible && !user.futureFund.criteriaNotified && user.futureFund.status !== 'active') {
        user.futureFund.criteriaNotified = true;
        modified = true;
        if (process.env.NODE_ENV !== 'test') {
            try {
                const { notifyJourney } = require('./userJourneyPush');
                notifyJourney(user._id, 'ff_criteria_done', {
                    notificationId: `${user._id}_ff_criteria_done`,
                }).catch((err) => console.error('FF criteria notify failed:', err.message));
            } catch (err) {
                console.error('FF criteria notify failed:', err.message);
            }
        }
    }

    // Do not auto-activate — user taps Activate Fund.

    return {
        user,
        criteria,
        progress,
        eligible,
        targets,
        modified,
        salesCurrent: kycCurrent,
        activityCurrent: adsCurrent,
        daysCurrent: tasksCurrent,
        today: getIstDateString(),
    };
}

async function addFutureFundActivity(user, minutes, settings = {}) {
    // Kept for compatibility with existing heartbeat; no longer a Fund criterion.
    const today = getIstDateString();
    const add = Math.max(0, Math.min(Number(minutes) || 0, 5));
    if (!user.futureFund) {
        user.futureFund = {
            status: 'locked',
            progress: 0,
            todayActivityMinutes: 0,
            lastActivityDate: today,
            activeDayDates: [],
            criteria: [],
        };
    }
    if (user.futureFund.lastActivityDate !== today) {
        user.futureFund.todayActivityMinutes = 0;
        user.futureFund.lastActivityDate = today;
    }
    user.futureFund.todayActivityMinutes = (user.futureFund.todayActivityMinutes || 0) + add;
    return syncFutureFundCriteria(user, settings);
}

module.exports = {
    FF_ACTIVATION,
    getIstDateString,
    getTargets,
    persistPdfActivationDefaults,
    migratePdfActivationSettings,
    countSuccessfulSales,
    countSuccessfulKyc,
    syncFutureFundCriteria,
    addFutureFundActivity,
};
