const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { applyKycPendingWipeCycles, migrateWalletSplits } = require('../utils/walletLedger');
const { applyInviteDay28IfDue } = require('../utils/referralReward');
const { sendFirstTimeVaReminders, sendInactiveNudges } = require('../utils/journeyReminders');

async function recordKycPendingWipe(user, wiped, cycle = 0) {
    if (!user?._id) return;
    if (wiped > 0) {
        await Transaction.create({
            user: user._id,
            type: 'debit',
            currency: 'INR',
            amount: wiped,
            source: 'Pending Wallet cleared (Virtual Account not created in 14 days)',
            status: 'Success',
        }).catch((err) => console.error('KYC pending wipe tx failed:', err.message));
    }

    try {
        const { notifyJourney } = require('../utils/userJourneyPush');
        const step = wiped > 0 ? 'va_deadline_14' : 'va_cycle_reminder';
        await notifyJourney(user._id, step, {
            notificationId: `${user._id}_${step}_${cycle || Date.now()}`,
        });
    } catch (err) {
        console.error('First-time pending wipe notify failed:', err.message);
    }
}

const startInviteInactivityCron = () => {
    cron.schedule('15 */6 * * *', async () => {
        console.log('Running first-time Virtual Account pending cycles...');
        try {
            const users = await User.find({
                isPaid: false,
                isBlocked: { $ne: true },
                'kyc.status': { $in: ['Approved', 'Verified'] },
                kycApprovedAt: { $ne: null },
                'withdrawalCard.status': { $nin: ['expired', 'active', 'pending_approval'] },
            }).limit(8000);

            for (const user of users) {
                migrateWalletSplits(user);
                const reminderChanged = await sendFirstTimeVaReminders(user);
                const wipe = await applyKycPendingWipeCycles(user);
                const claw = await applyInviteDay28IfDue(user);

                if (wipe.cyclesApplied > 0) {
                    user.inviteInactive = user.inviteInactive || {};
                    user.inviteInactive.lastFourteenReminderCycle = wipe.cyclesDue;
                }

                if (reminderChanged || wipe.cyclesApplied > 0 || claw.applied) {
                    user.markModified('inviteInactive');
                    user.markModified('wallet');
                    await user.save({ validateBeforeSave: false });
                }

                if (wipe.cyclesApplied > 0) {
                    await recordKycPendingWipe(user, wipe.wiped, wipe.cyclesDue);
                }
            }

            await sendInactiveNudges();
        } catch (err) {
            console.error('Invite inactivity cron failed:', err.message);
        }
    });
};

module.exports = { startInviteInactivityCron, recordKycPendingWipe };
