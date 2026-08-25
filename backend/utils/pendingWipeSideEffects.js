async function persistPendingWipeEffects(user, expiryWipe, kycWipe) {
    if (expiryWipe?.wiped > 0) {
        const { recordPendingWipe } = require('../cron/cardExpiryCron');
        await recordPendingWipe(user, expiryWipe.wiped);
    }
    if (kycWipe?.wiped > 0) {
        const { recordKycPendingWipe } = require('../cron/inviteInactivityCron');
        await recordKycPendingWipe(user, kycWipe.wiped);
    }
}

module.exports = { persistPendingWipeEffects };
