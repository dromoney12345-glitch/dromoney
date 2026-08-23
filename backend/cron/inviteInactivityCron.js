const cron = require('node-cron');
const User = require('../models/User');
const { daysSince, wipePendingEarnings, migrateWalletSplits } = require('../utils/walletLedger');
const { applyDay7Penalty, clawbackInvite } = require('../utils/referralReward');

const startInviteInactivityCron = () => {
    // Every 6 hours
    cron.schedule('15 */6 * * *', async () => {
        console.log('Running invite inactivity rules...');
        try {
            const users = await User.find({
                isPaid: false,
                isBlocked: { $ne: true },
                'kyc.status': { $in: ['Approved', 'Verified'] },
                kycApprovedAt: { $ne: null },
            }).limit(8000);

            for (const user of users) {
                const days = daysSince(user.kycApprovedAt);
                if (days == null) continue;
                let changed = false;
                migrateWalletSplits(user);

                if (days >= 7 && !user.inviteInactive?.day7PenaltyApplied) {
                    await applyDay7Penalty(user);
                    user.inviteInactive = user.inviteInactive || {};
                    user.inviteInactive.day7PenaltyApplied = true;
                    changed = true;
                }

                if (days >= 14 && !user.inviteInactive?.day14WipeApplied) {
                    wipePendingEarnings(user);
                    user.inviteInactive = user.inviteInactive || {};
                    user.inviteInactive.day14WipeApplied = true;
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Pending earnings removed',
                        message: 'Virtual Account was not created within 14 days. Pending earnings were cleared.',
                        type: 'warning',
                        isRead: false,
                    });
                    changed = true;
                }

                if (days >= 28) {
                    await clawbackInvite(user);
                    user.isBlocked = true;
                    user.notifications = user.notifications || [];
                    user.notifications.push({
                        title: 'Account suspended',
                        message: 'Virtual Account was not created within 28 days. This account is permanently suspended.',
                        type: 'error',
                        isRead: false,
                    });
                    try {
                        const { notifyJourney } = require('../utils/userJourneyPush');
                        await notifyJourney(user._id, 'account_hold', { skipInApp: true });
                    } catch (pushErr) {
                        console.error('Account hold push failed:', pushErr.message);
                    }
                    changed = true;
                }

                if (changed) {
                    await user.save({ validateBeforeSave: false });
                }
            }
        } catch (err) {
            console.error('Invite inactivity cron failed:', err.message);
        }
    });
};

module.exports = { startInviteInactivityCron };
