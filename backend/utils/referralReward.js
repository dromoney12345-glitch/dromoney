const User = require('../models/User');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');
const Transaction = require('../models/Transaction');
const { creditEarning, transferPendingToVirtual, migrateWalletSplits } = require('./walletLedger');

function isKycComplete(user) {
    const status = String(user?.kyc?.status || '').toLowerCase();
    return status === 'verified' || status === 'approved';
}

async function commissionAmount() {
    const settings = (await Settings.findOne()) || {};
    if (settings.referralSystemEnabled === false) return 0;
    return Number(settings.referralCommission) > 0 ? Number(settings.referralCommission) : 200;
}

/**
 * After invitee KYC: hold ₹200 in the referrer's Pending Wallet.
 * Releases to Virtual only when the invitee creates a Withdrawal Card.
 */
async function creditReferralOnKyc(userDoc) {
    if (!userDoc?._id) return { credited: false, reason: 'no_user' };

    const user = await User.findById(userDoc._id).select('name referredBy isPaid kyc kycApprovedAt');
    if (!user?.referredBy) return { credited: false, reason: 'not_referred' };
    if (!isKycComplete(user)) return { credited: false, reason: 'kyc_incomplete' };

    const commission = await commissionAmount();
    if (!commission) return { credited: false, reason: 'system_disabled' };

    const referrer = await User.findById(user.referredBy);
    if (!referrer) return { credited: false, reason: 'referrer_missing' };
    if (String(referrer._id) === String(user._id)) return { credited: false, reason: 'self_referral' };

    const existing = await ReferralTransaction.findOne({ referredUser: user._id });
    if (existing) return { credited: false, reason: 'already_credited' };

    const inviteeHasCard = !!user.isPaid;

    try {
        const tx = await ReferralTransaction.create({
            referrer: referrer._id,
            referredUser: user._id,
            amount: commission,
            status: inviteeHasCard ? 'Completed' : 'Pending',
        });

        try {
            migrateWalletSplits(referrer);
            await creditEarning(referrer, commission, {
                source: inviteeHasCard
                    ? `Invite reward: ${user.name}`
                    : `Invite reward (pending): ${user.name}`,
                inviteHold: !inviteeHasCard,
                forceVirtual: inviteeHasCard,
                createTx: true,
            });
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            referrer.wallet.referralEarnings = (Number(referrer.wallet.referralEarnings) || 0) + commission;
            referrer.notifications = referrer.notifications || [];
            referrer.notifications.push({
                title: inviteeHasCard ? 'Invite ₹200 credited' : 'Invite ₹200 in Pending',
                message: inviteeHasCard
                    ? `${user.name} completed KYC and has a Virtual Account. ₹${commission} is in your Virtual Account.`
                    : `${user.name} completed KYC. ₹${commission} is in your Pending Wallet. It moves to Virtual Account when they create one.`,
                type: 'success',
                isRead: false,
            });
            await referrer.save({ validateBeforeSave: false });
        } catch (creditErr) {
            await ReferralTransaction.deleteOne({ _id: tx._id }).catch(() => {});
            throw creditErr;
        }

        try {
            const { notifyJourney } = require('./userJourneyPush');
            await notifyJourney(referrer._id, inviteeHasCard ? 'invite_virtual' : 'invite_pending', {
                skipInApp: true,
                body: inviteeHasCard
                    ? `${user.name} completed KYC. ₹${commission} is in your Virtual Account.`
                    : `${user.name} completed KYC. ₹${commission} is in Pending until they create a Virtual Account.`,
            });
        } catch (pushErr) {
            console.error('Referral push failed:', pushErr.message);
        }

        console.log(`[REFERRAL] ₹${commission} to referrer ${referrer._id} after KYC of ${user._id} (${inviteeHasCard ? 'virtual' : 'pending hold'})`);
        return { credited: true, amount: commission, held: !inviteeHasCard };
    } catch (err) {
        if (err.code === 11000) {
            return { credited: false, reason: 'already_credited' };
        }
        console.error('[REFERRAL] KYC credit failed:', err.message);
        return { credited: false, reason: 'error', error: err.message };
    }
}

/**
 * When invitee unlocks Virtual Wallet: move referrer's held ₹200 Pending → Virtual.
 */
async function releaseReferralToVirtual(userDoc) {
    if (!userDoc?._id) return { released: false, reason: 'no_user' };

    const tx = await ReferralTransaction.findOne({
        referredUser: userDoc._id,
        status: 'Pending',
    });
    if (!tx) return { released: false, reason: 'no_pending_invite' };

    const referrer = await User.findById(tx.referrer);
    if (!referrer) return { released: false, reason: 'referrer_missing' };

    migrateWalletSplits(referrer);
    const moved = transferPendingToVirtual(referrer, tx.amount);
    tx.status = 'Completed';
    await tx.save();

    referrer.notifications = referrer.notifications || [];
    referrer.notifications.push({
        title: 'Invite ₹200 Unlocked',
        message: `₹${moved} moved from Pending to Virtual Wallet.`,
        type: 'success',
        isRead: false,
    });
    await referrer.save({ validateBeforeSave: false });

    try {
        const { notifyJourney } = require('./userJourneyPush');
        await notifyJourney(referrer._id, 'invite_virtual', {
            skipInApp: true,
            body: `₹${moved} moved from Pending Wallet to Virtual Wallet.`,
        });
    } catch (pushErr) {
        console.error('Invite virtual push failed:', pushErr.message);
    }

    await Transaction.create({
        user: referrer._id,
        type: 'credit',
        currency: 'INR',
        amount: 0,
        source: `Invite released to Virtual (₹${moved})`,
        status: 'Success',
    }).catch(() => {});

    return { released: true, amount: moved };
}

/**
 * 28-day inactivity: remove invite + pending ₹200 from referrer.
 */
async function clawbackInvite(userDoc) {
    const tx = await ReferralTransaction.findOne({
        referredUser: userDoc._id,
        status: { $in: ['Pending', 'Completed'] },
    });
    if (!tx) return { clawed: false, reason: 'no_tx' };

    const referrer = await User.findById(tx.referrer);
    if (referrer) {
        migrateWalletSplits(referrer);
        if (tx.status === 'Pending') {
            referrer.wallet.pendingBalance = Math.max(0, (Number(referrer.wallet.pendingBalance) || 0) - tx.amount);
        } else {
            referrer.wallet.virtualBalance = Math.max(0, (Number(referrer.wallet.virtualBalance) || 0) - tx.amount);
            referrer.wallet.balance = Math.max(0, (Number(referrer.wallet.balance) || 0) - tx.amount);
        }
        referrer.referralCount = Math.max(0, (referrer.referralCount || 0) - 1);
        referrer.wallet.referralEarnings = Math.max(0, (Number(referrer.wallet.referralEarnings) || 0) - tx.amount);
        referrer.notifications = referrer.notifications || [];
        referrer.notifications.push({
            title: 'Invite Removed',
            message: `An invited user stayed inactive. ₹${tx.amount} was removed.`,
            type: 'warning',
            isRead: false,
        });
        await referrer.save({ validateBeforeSave: false });
        try {
            const { notifyJourney } = require('./userJourneyPush');
            await notifyJourney(referrer._id, 'account_hold', {
                skipInApp: true,
                title: 'Invite Removed',
                body: `An invited user stayed inactive. ₹${tx.amount} was removed.`,
                link: '/user/wallet',
            });
        } catch (pushErr) {
            console.error('Invite clawback push failed:', pushErr.message);
        }
    }

    tx.status = 'Failed';
    await tx.save();
    return { clawed: true, amount: tx.amount };
}

/**
 * 7-day penalty: add 10% of ₹200 onto referrer's pending invite hold.
 */
async function applyDay7Penalty(userDoc) {
    const tx = await ReferralTransaction.findOne({
        referredUser: userDoc._id,
        status: 'Pending',
    });
    if (!tx) return { applied: false };

    const penalty = Math.round(tx.amount * 0.1 * 100) / 100;
    const referrer = await User.findById(tx.referrer);
    if (!referrer) return { applied: false };

    migrateWalletSplits(referrer);
    referrer.wallet.pendingBalance = (Number(referrer.wallet.pendingBalance) || 0) + penalty;
    referrer.notifications = referrer.notifications || [];
    referrer.notifications.push({
        title: 'Invite inactivity penalty',
        message: `Invited user missed 7-day card deadline. ₹${penalty} added to your Pending Wallet.`,
        type: 'warning',
        isRead: false,
    });
    await referrer.save({ validateBeforeSave: false });
    return { applied: true, penalty };
}

// Payment callers: invitee Withdrawal Card unlocks the held ₹200 Pending → Virtual.
async function creditReferralOnQualifiedUnlock(userDoc) {
    const user = await User.findById(userDoc._id).select('name referredBy isPaid kyc');
    if (!user) return { credited: false, reason: 'no_user' };
    if (!user.isPaid) return { credited: false, reason: 'not_paid' };
    if (!isKycComplete(user)) {
        return { credited: false, reason: 'kyc_incomplete' };
    }
    return releaseReferralToVirtual(user);
}

module.exports = {
    isKycComplete,
    creditReferralOnKyc,
    creditReferralOnQualifiedUnlock,
    releaseReferralToVirtual,
    clawbackInvite,
    applyDay7Penalty,
};
