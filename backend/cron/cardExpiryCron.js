const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
    ensureWithdrawalCardShape,
    migrateWalletSplits,
    expireVirtualAccountIfDue,
    applyPendingWipeCycles,
} = require('../utils/walletLedger');

async function notifyVa(userId, step, extras) {
    try {
        const { notifyJourney } = require('../utils/userJourneyPush');
        await notifyJourney(userId, step, extras);
    } catch (err) {
        console.error(`VA cron notify ${step} failed:`, err.message);
    }
}

async function recordPendingWipe(user, wiped) {
    if (!(wiped > 0) || !user?._id) return;
    await Transaction.create({
        user: user._id,
        type: 'debit',
        currency: 'INR',
        amount: wiped,
        source: 'Pending Wallet cleared (Virtual Account not renewed in 14 days)',
        status: 'Success',
    }).catch((err) => console.error('Pending wipe tx failed:', err.message));

    await notifyVa(user._id, 'va_pending_cleared', {
        body: `₹${Number(wiped).toFixed(2)} in Pending was cleared because Virtual Account was not renewed within 14 days. Your locked Virtual balance is still safe. Renew to unlock it and keep new earnings.`,
    });
}

const startCardExpiryCron = () => {
    cron.schedule('20 */6 * * *', async () => {
        console.log('Running Virtual Account expiry / 14-day pending cycles...');
        try {
            const now = new Date();
            const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const due = await User.find({
                'withdrawalCard.status': 'active',
                'withdrawalCard.expiresAt': { $ne: null, $lte: now },
            }).limit(8000);

            for (const user of due) {
                migrateWalletSplits(user);
                const wasActive = String(user.withdrawalCard?.status) === 'active';
                ensureWithdrawalCardShape(user);
                expireVirtualAccountIfDue(user, now);
                const justExpired = wasActive && String(user.withdrawalCard?.status) === 'expired';
                user.markModified('withdrawalCard');
                user.markModified('wallet');
                await user.save({ validateBeforeSave: false });
                if (justExpired) {
                    await notifyVa(user._id, 'va_expired');
                }
            }

            const reminders = await User.find({
                'withdrawalCard.status': 'active',
                'withdrawalCard.renewalReminderSent': { $ne: true },
                'withdrawalCard.expiresAt': { $gt: now, $lte: inSevenDays },
            }).limit(8000);

            for (const user of reminders) {
                user.withdrawalCard.renewalReminderSent = true;
                user.markModified('withdrawalCard');
                await user.save({ validateBeforeSave: false });
                await notifyVa(user._id, 'va_renew_reminder');
            }

            const expired = await User.find({
                'withdrawalCard.status': 'expired',
                isBlocked: { $ne: true },
            }).limit(8000);

            for (const user of expired) {
                migrateWalletSplits(user);
                const result = applyPendingWipeCycles(user, now);
                if (result.cyclesApplied <= 0) continue;
                user.markModified('withdrawalCard');
                user.markModified('wallet');
                await user.save({ validateBeforeSave: false });
                await recordPendingWipe(user, result.wiped);
            }
        } catch (err) {
            console.error('Card expiry cron failed:', err.message);
        }
    });
};

module.exports = { startCardExpiryCron, recordPendingWipe };
