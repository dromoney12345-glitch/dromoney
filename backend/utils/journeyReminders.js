const User = require('../models/User');
const { daysSince, neverCreatedVirtualAccount } = require('../utils/walletLedger');

async function notify(userId, step, extras) {
    try {
        const { notifyJourney } = require('./userJourneyPush');
        await notifyJourney(userId, step, extras);
    } catch (err) {
        console.error(`[JOURNEY] ${step} failed:`, err.message);
    }
}

function isoWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function sendFirstTimeVaReminders(user, now = new Date()) {
    if (!neverCreatedVirtualAccount(user)) return false;
    const days = daysSince(user.kycApprovedAt || user.kyc?.approvedAt, now);
    if (days == null) return false;

    user.inviteInactive = user.inviteInactive || {};
    const flags = user.inviteInactive;
    let changed = false;

    if (days >= 1 && days <= 3 && !flags.vaReminder3Sent) {
        await notify(user._id, 'va_reminder_3', { notificationId: `${user._id}_va_reminder_3` });
        flags.vaReminder3Sent = true;
        changed = true;
    }
    if (days >= 7 && days < 13 && !flags.vaReminder7Sent) {
        await notify(user._id, 'va_deadline_7', { notificationId: `${user._id}_va_deadline_7` });
        flags.vaReminder7Sent = true;
        changed = true;
    }
    if (days >= 13 && days < 14 && !flags.vaReminder13Sent) {
        await notify(user._id, 'va_deadline_1', { notificationId: `${user._id}_va_deadline_1` });
        flags.vaReminder13Sent = true;
        changed = true;
    }
    return changed;
}

async function sendInactiveNudges(now = new Date()) {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const weekKey = isoWeekKey(now);
    const users = await User.find({
        isBlocked: { $ne: true },
        lastActiveAt: { $gte: eightDaysAgo, $lte: sixDaysAgo },
        $or: [
            { inactiveReminderWeek: { $ne: weekKey } },
            { inactiveReminderWeek: { $exists: false } },
            { inactiveReminderSent: { $ne: true } },
        ],
    }).limit(4000);

    for (const user of users) {
        if (user.inactiveReminderWeek === weekKey) continue;
        await notify(user._id, 'inactive_nudge', {
            notificationId: `${user._id}_inactive_nudge_${weekKey}`,
        });
        user.inactiveReminderSent = true;
        user.inactiveReminderWeek = weekKey;
        await user.save({ validateBeforeSave: false });
    }
}

async function sendRenewalGraceReminders(now = new Date()) {
    const expired = await User.find({
        'withdrawalCard.status': 'expired',
        isBlocked: { $ne: true },
        'withdrawalCard.expiresAt': { $ne: null },
    }).limit(8000);

    for (const user of expired) {
        const daysExpired = daysSince(user.withdrawalCard.expiresAt, now);
        if (daysExpired == null || daysExpired < 1 || daysExpired > 3) continue;
        const sent = Number(user.withdrawalCard.renewalGraceRemindersSent) || 0;
        if (sent > daysExpired) continue;
        await notify(user._id, 'va_renewal_pending', {
            notificationId: `${user._id}_va_renewal_pending_${daysExpired}`,
        });
        user.withdrawalCard.renewalGraceRemindersSent = daysExpired + 1;
        user.markModified('withdrawalCard');
        await user.save({ validateBeforeSave: false });
    }
}

module.exports = {
    sendFirstTimeVaReminders,
    sendInactiveNudges,
    sendRenewalGraceReminders,
    isoWeekKey,
};
