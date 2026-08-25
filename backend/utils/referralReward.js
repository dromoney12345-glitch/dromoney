const User = require('../models/User');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');
const Transaction = require('../models/Transaction');
const {
    creditEarning,
    transferPendingToVirtual,
    migrateWalletSplits,
    ensureWithdrawalCardShape,
    isVirtualUnlocked,
    neverCreatedVirtualAccount,
    daysSince,
} = require('./walletLedger');

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

    migrateWalletSplits(referrer);
    ensureWithdrawalCardShape(referrer);
    const inviteeHasCard = !!user.isPaid;
    const referrerUnlocked = isVirtualUnlocked(referrer);
    const toVirtual = inviteeHasCard && referrerUnlocked;

    try {
        const tx = await ReferralTransaction.create({
            referrer: referrer._id,
            referredUser: user._id,
            amount: commission,
            status: toVirtual ? 'Completed' : 'Pending',
        });

        try {
            await creditEarning(referrer, commission, {
                source: toVirtual
                    ? `Invite reward: ${user.name}`
                    : `Invite reward (pending): ${user.name}`,
                inviteHold: !toVirtual,
                forceVirtual: toVirtual,
                createTx: true,
            });
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            referrer.wallet.referralEarnings = (Number(referrer.wallet.referralEarnings) || 0) + commission;
            referrer.notifications = referrer.notifications || [];
            referrer.notifications.push({
                title: toVirtual ? 'Invite ₹200 credited' : 'Invite ₹200 in Pending',
                message: toVirtual
                    ? `${user.name} completed KYC and has a Virtual Account. ₹${commission} is in your Virtual Account.`
                    : `${user.name} completed KYC. ₹${commission} is in your Pending Wallet.`,
                type: 'success',
                isRead: false,
            });
            referrer.markModified('wallet');
            referrer.markModified('notifications');
            await referrer.save({ validateBeforeSave: false });
        } catch (creditErr) {
            await ReferralTransaction.deleteOne({ _id: tx._id }).catch(() => {});
            throw creditErr;
        }

        try {
            const { notifyJourney } = require('./userJourneyPush');
            await notifyJourney(referrer._id, toVirtual ? 'invite_virtual' : 'invite_pending', {
                skipInApp: true,
                body: toVirtual
                    ? `${user.name} completed KYC. ₹${commission} is in your Virtual Account.`
                    : `${user.name} completed KYC. ₹${commission} is in Pending.`,
            });
        } catch (pushErr) {
            console.error('Referral push failed:', pushErr.message);
        }

        console.log(`[REFERRAL] ₹${commission} to referrer ${referrer._id} after KYC of ${user._id} (${toVirtual ? 'virtual' : 'pending hold'})`);
        return { credited: true, amount: commission, held: !toVirtual };
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
    ensureWithdrawalCardShape(referrer);
    if (!isVirtualUnlocked(referrer)) {
        return { released: false, reason: 'referrer_va_locked' };
    }
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
 * 28-day inactivity (hidden from the invitee): remove the referrer's pending ₹200 only.
 * Does not block or suspend the invitee. Does not touch Virtual balance.
 */
async function clawbackInvite(userDoc) {
    const tx = await ReferralTransaction.findOne({
        referredUser: userDoc._id,
        status: 'Pending',
    });
    if (!tx) return { clawed: false, reason: 'no_tx' };

    const referrer = await User.findById(tx.referrer);
    const inviteeName = userDoc.name || 'The referred user';
    const amount = Number(tx.amount) || 0;
    if (referrer) {
        migrateWalletSplits(referrer);
        const pending = Number(referrer.wallet.pendingBalance) || 0;
        const fromPending = Math.min(pending, amount);
        referrer.wallet.pendingBalance = Math.round((pending - fromPending) * 100) / 100;
        referrer.wallet.referralEarnings = Math.max(0, (Number(referrer.wallet.referralEarnings) || 0) - amount);
        referrer.notifications = referrer.notifications || [];
        referrer.notifications.push({
            title: 'Refer active users only',
            message: `${inviteeName} is not active yet, so ₹${amount} was removed from Pending.`,
            type: 'warning',
            isRead: false,
        });
        referrer.markModified?.('wallet');
        referrer.markModified?.('notifications');
        await referrer.save({ validateBeforeSave: false });
        try {
            const { notifyJourney } = require('./userJourneyPush');
            await notifyJourney(referrer._id, 'invite_clawback', {
                skipInApp: true,
                title: 'Refer active users only',
                body: `${inviteeName} is not active yet, so ₹${amount} was removed from Pending. Refer users who create a Virtual Account.`,
                link: '/user/wallet',
            });
        } catch (pushErr) {
            console.error('Invite clawback push failed:', pushErr.message);
        }
    }

    tx.status = 'Failed';
    await tx.save();
    return { clawed: true, amount };
}

async function applyInviteDay28IfDue(invitee) {
    if (!invitee?._id || !neverCreatedVirtualAccount(invitee)) {
        return { clawed: false };
    }
    const days = daysSince(invitee.kycApprovedAt || invitee.kyc?.approvedAt);
    invitee.inviteInactive = invitee.inviteInactive || {};
    if (days == null || days < 28 || invitee.inviteInactive.day28ClawbackApplied) {
        return { clawed: false };
    }
    const result = await clawbackInvite(invitee);
    invitee.inviteInactive.day28ClawbackApplied = true;
    return { ...result, applied: true };
}

/**
 * When the referrer later unlocks/renews Virtual Account, release holds
 * for invitees who already bought a Virtual Account.
 */
async function releaseReadyInvitesForReferrer(referrerDoc) {
    if (!referrerDoc?._id) return { released: 0 };
    migrateWalletSplits(referrerDoc);
    ensureWithdrawalCardShape(referrerDoc);
    if (!isVirtualUnlocked(referrerDoc)) {
        return { released: 0, reason: 'referrer_va_locked' };
    }

    const txs = await ReferralTransaction.find({
        referrer: referrerDoc._id,
        status: 'Pending',
    });
    let released = 0;
    for (const tx of txs) {
        const invitee = await User.findById(tx.referredUser).select('name isPaid kyc withdrawalCard');
        if (!invitee?.isPaid) continue;
        const result = await releaseReferralToVirtual(invitee);
        if (result.released) released += 1;
    }
    return { released };
}

async function afterVirtualAccountActivated(userDoc) {
    const fromInvitee = await creditReferralOnQualifiedUnlock(userDoc);
    const fromReferrerHolds = await releaseReadyInvitesForReferrer(userDoc);
    return { fromInvitee, fromReferrerHolds };
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
    releaseReadyInvitesForReferrer,
    afterVirtualAccountActivated,
    clawbackInvite,
    applyInviteDay28IfDue,
};
