const User = require('../models/User');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');
const Transaction = require('../models/Transaction');

function isKycComplete(user) {
    const status = String(user?.kyc?.status || '').toLowerCase();
    return status === 'verified' || status === 'approved';
}

/**
 * Credit referrer commission ONLY when referred user has:
 * 1) completed KYC (Verified/Approved)
 * 2) unlocked platform (₹499 / isPaid)
 *
 * Safe to call multiple times — unique ReferralTransaction prevents double pay.
 *
 * @param {object} userDoc - referred user (mongoose doc or lean with _id, referredBy, name, isPaid, kyc)
 * @returns {Promise<{ credited: boolean, reason?: string, amount?: number }>}
 */
async function creditReferralOnQualifiedUnlock(userDoc) {
    if (!userDoc?._id) {
        return { credited: false, reason: 'no_user' };
    }

    // Fresh read so KYC / isPaid are current
    const user = await User.findById(userDoc._id).select('name referredBy isPaid kyc');
    if (!user?.referredBy) {
        return { credited: false, reason: 'not_referred' };
    }
    if (!user.isPaid) {
        return { credited: false, reason: 'not_paid' };
    }
    if (!isKycComplete(user)) {
        return { credited: false, reason: 'kyc_incomplete' };
    }

    const settings = (await Settings.findOne()) || {};
    if (settings.referralSystemEnabled === false) {
        return { credited: false, reason: 'system_disabled' };
    }

    const commission = Number(settings.referralCommission) > 0 ? Number(settings.referralCommission) : 200;
    const referrer = await User.findById(user.referredBy);
    if (!referrer) {
        return { credited: false, reason: 'referrer_missing' };
    }
    if (String(referrer._id) === String(user._id)) {
        return { credited: false, reason: 'self_referral' };
    }

    try {
        await ReferralTransaction.create({
            referrer: referrer._id,
            referredUser: user._id,
            amount: commission,
            status: 'Completed',
        });

        await User.findByIdAndUpdate(referrer._id, {
            $inc: {
                'wallet.balance': commission,
                'wallet.lifetimeEarnings': commission,
                'wallet.referralEarnings': commission,
                referralCount: 1,
            },
            $push: {
                notifications: {
                    title: 'Commission Received! 💰',
                    message: `You earned ₹${commission} — ${user.name} completed KYC and bought the ₹499 plan.`,
                    type: 'success',
                    isRead: false,
                },
            },
        });

        await Transaction.create({
            user: referrer._id,
            type: 'credit',
            currency: 'INR',
            amount: commission,
            source: `Referral Reward: ${user.name}`,
            status: 'Success',
        });

        try {
            const { sendNotificationToUser } = require('../controllers/fcmController');
            await sendNotificationToUser(referrer._id, {
                title: 'Commission Received! 💰',
                body: `You earned ₹${commission} — ${user.name} completed KYC and bought the ₹499 plan.`,
                data: { type: 'commission', link: '/user/marketing' },
            });
        } catch (pushErr) {
            console.error('Referral push failed:', pushErr.message);
        }

        console.log(
            `[REFERRAL] Credited ₹${commission} to ${referrer._id} for ${user._id} (KYC + ₹499 unlock)`
        );
        return { credited: true, amount: commission };
    } catch (err) {
        if (err.code === 11000) {
            return { credited: false, reason: 'already_credited' };
        }
        console.error('[REFERRAL] credit failed:', err.message);
        return { credited: false, reason: 'error', error: err.message };
    }
}

module.exports = {
    isKycComplete,
    creditReferralOnQualifiedUnlock,
};
