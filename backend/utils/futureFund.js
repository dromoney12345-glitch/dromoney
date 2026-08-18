const User = require('../models/User');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getIstDateString(date = new Date()) {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTargets(settings = {}) {
    return {
        kycTarget: Number(settings.futureFundKycTarget) || Number(settings.futureFundSalesTarget) || 10,
        adsTarget: Number(settings.futureFundWatchAdTarget) >= 50
            ? Number(settings.futureFundWatchAdTarget)
            : 50,
        tasksTarget: Number(settings.futureFundDailyTasksTarget) >= 50
            ? Number(settings.futureFundDailyTasksTarget)
            : 50,
        salesTarget: Number(settings.futureFundKycTarget) || Number(settings.futureFundSalesTarget) || 10,
        daysTarget: Number(settings.futureFundDaysTarget) || 7,
        activityMinutesTarget: Number(settings.futureFundActivityMinutes) || 15,
    };
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
    const tasksCurrent = Number(user.lifetimeTasksCompleted) || 0;

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
    user.futureFund.criteria = criteria.map(({ id, title, target, current, completed }) => ({
        id,
        title,
        target,
        current,
        completed,
    }));
    user.futureFund.progress = progress;
    if (prevProgress !== progress) modified = true;

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
    getIstDateString,
    getTargets,
    countSuccessfulSales,
    countSuccessfulKyc,
    syncFutureFundCriteria,
    addFutureFundActivity,
};
