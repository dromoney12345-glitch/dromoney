const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { applyKycPendingWipeCycles, migrateWalletSplits } = require('../utils/walletLedger');
const { applyInviteDay28IfDue } = require('../utils/referralReward');

async function recordKycPendingWipe(user, wiped) {
    if (!(wiped > 0) || !user?._id) return;
    await Transaction.create({
        user: user._id,
        type: 'debit',
        currency: 'INR',
        amount: wiped,
        source: 'Pending Wallet cleared (Virtual Account not created in 14 days)',
        status: 'Success',
    }).catch((err) => console.error('KYC pending wipe tx failed:', err.message));

    try {
        const { notifyJourney } = require('../utils/userJourneyPush');
        await notifyJourney(user._id, 'va_deadline_14', {
            body: `₹${Number(wiped).toFixed(2)} in Pending was cleared because Virtual Account was not created within 14 days. Create it to keep new earnings. This repeats every 14 days until you buy a Virtual Account.`,
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
                const wipe = await applyKycPendingWipeCycles(user);
                const claw = await applyInviteDay28IfDue(user);

                if (wipe.cyclesApplied > 0 || claw.applied) {
                    user.markModified('inviteInactive');
                    user.markModified('wallet');
                    await user.save({ validateBeforeSave: false });
                }

                if (wipe.wiped > 0) {
                    await recordKycPendingWipe(user, wipe.wiped);
                }
            }
        } catch (err) {
            console.error('Invite inactivity cron failed:', err.message);
        }
    });
};

module.exports = { startInviteInactivityCron, recordKycPendingWipe };
