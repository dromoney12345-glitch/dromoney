const User = require('../models/User');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD in India Standard Time */
function getIstDateString(date = new Date()) {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTargets(settings = {}) {
    return {
        salesTarget: Number(settings.futureFundSalesTarget) || 10,
        daysTarget: Number(settings.futureFundDaysTarget) || 7,
        activityMinutesTarget: Number(settings.futureFundActivityMinutes) || 15,
    };
}

/**
 * Successful Sales = referred users who unlocked the platform (isPaid).
 */
async function countSuccessfulSales(userId) {
    return User.countDocuments({
        referredBy: userId,
        isPaid: true,
    });
}

/**
 * Ensure futureFund subdoc shape, roll daily activity into a new IST day,
 * and rebuild criteria from live sales + activity tracking.
 *
 * @returns {{ user, criteria, progress, eligible, targets, modified }}
 */
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

    if (user.futureFund.todayActivityMinutes == null) {
        user.futureFund.todayActivityMinutes = 0;
        modified = true;
    }
    if (!Array.isArray(user.futureFund.activeDayDates)) {
        user.futureFund.activeDayDates = [];
        modified = true;
    }

    const today = getIstDateString();

    // New IST day → reset today's minute counter (active days are kept)
    if (user.futureFund.lastActivityDate && user.futureFund.lastActivityDate !== today) {
        // If yesterday (lastActivityDate) already met the minutes target, ensure it's recorded
        if ((user.futureFund.todayActivityMinutes || 0) >= targets.activityMinutesTarget) {
            if (!user.futureFund.activeDayDates.includes(user.futureFund.lastActivityDate)) {
                user.futureFund.activeDayDates.push(user.futureFund.lastActivityDate);
                modified = true;
            }
        }
        user.futureFund.todayActivityMinutes = 0;
        user.futureFund.lastActivityDate = today;
        modified = true;
    } else if (!user.futureFund.lastActivityDate) {
        user.futureFund.lastActivityDate = today;
        modified = true;
    }

    // If today's minutes already hit target, mark today as an active day
    if ((user.futureFund.todayActivityMinutes || 0) >= targets.activityMinutesTarget) {
        if (!user.futureFund.activeDayDates.includes(today)) {
            user.futureFund.activeDayDates.push(today);
            modified = true;
        }
    }

    const salesCurrent = await countSuccessfulSales(user._id);
    const activityCurrent = Math.min(
        user.futureFund.todayActivityMinutes || 0,
        targets.activityMinutesTarget
    );
    const daysCurrent = (user.futureFund.activeDayDates || []).length;

    const criteria = [
        {
            id: 1,
            title: 'Successful Sales',
            description: `Invite friends who unlock the platform (paid registrations via your referral).`,
            target: targets.salesTarget,
            current: salesCurrent,
            completed: salesCurrent >= targets.salesTarget,
            unit: 'sales',
        },
        {
            id: 2,
            title: 'Daily Activity',
            description: `Use the app for ${targets.activityMinutesTarget} minutes today. Time is counted automatically while you stay active.`,
            target: targets.activityMinutesTarget,
            current: activityCurrent,
            completed: activityCurrent >= targets.activityMinutesTarget,
            unit: 'minutes',
        },
        {
            id: 3,
            title: 'Active Days',
            description: `Complete ${targets.activityMinutesTarget} minutes of activity on ${targets.daysTarget} different days.`,
            target: targets.daysTarget,
            current: Math.min(daysCurrent, targets.daysTarget),
            completed: daysCurrent >= targets.daysTarget,
            unit: 'days',
        },
    ];

    const progress = Math.round(
        (criteria.reduce((sum, c) => sum + Math.min(c.current / Math.max(c.target, 1), 1), 0) /
            criteria.length) *
            100
    );

    const eligible = criteria.every((c) => c.completed);

    // Persist display criteria / progress
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

    // Auto-activate when all criteria are met (do not lock again if already active)
    if (eligible && user.futureFund.status !== 'active') {
        user.futureFund.status = 'active';
        modified = true;
    }

    return {
        user,
        criteria,
        progress,
        eligible,
        targets,
        modified,
        salesCurrent,
        activityCurrent: user.futureFund.todayActivityMinutes || 0,
        daysCurrent,
        today,
    };
}

/**
 * Add activity minutes for the current IST day (heartbeat).
 */
async function addFutureFundActivity(user, minutes, settings = {}) {
    const targets = getTargets(settings);
    const today = getIstDateString();
    const add = Math.max(0, Math.min(Number(minutes) || 0, 5)); // cap per ping

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
        // Close out previous day if it qualified
        if (
            user.futureFund.lastActivityDate &&
            (user.futureFund.todayActivityMinutes || 0) >= targets.activityMinutesTarget &&
            !user.futureFund.activeDayDates.includes(user.futureFund.lastActivityDate)
        ) {
            user.futureFund.activeDayDates.push(user.futureFund.lastActivityDate);
        }
        user.futureFund.todayActivityMinutes = 0;
        user.futureFund.lastActivityDate = today;
    }

    user.futureFund.todayActivityMinutes = (user.futureFund.todayActivityMinutes || 0) + add;

    if (
        user.futureFund.todayActivityMinutes >= targets.activityMinutesTarget &&
        !user.futureFund.activeDayDates.includes(today)
    ) {
        user.futureFund.activeDayDates.push(today);
    }

    return syncFutureFundCriteria(user, settings);
}

module.exports = {
    getIstDateString,
    getTargets,
    countSuccessfulSales,
    syncFutureFundCriteria,
    addFutureFundActivity,
};
