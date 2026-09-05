const Transaction = require('../models/Transaction');

function isKycComplete(user) {
    const status = String(user?.kyc?.status || '').toLowerCase();
    return status === 'verified' || status === 'approved';
}

/** Clock for first-time VA quote / 14-day pending wipe / invite day-28 — registration, not KYC. */
function registrationAnchorDate(user) {
    return user?.createdAt || user?.kycApprovedAt || user?.kyc?.approvedAt || null;
}

function toMs(now) {
    if (now == null) return Date.now();
    return now instanceof Date ? now.getTime() : Number(now);
}

/**
 * Virtual Account is withdrawable only while paid AND card is active AND not past expiry.
 * Expired cards keep virtualBalance; they just cannot receive new credits or payouts.
 */
function isVirtualUnlocked(user, now) {
    if (!user?.isPaid) return false;
    const status = String(user?.withdrawalCard?.status || '').toLowerCase();
    if (status === 'expired' || status === 'pending_approval') return false;
    const exp = user?.withdrawalCard?.expiresAt;
    if (exp && new Date(exp).getTime() <= toMs(now)) return false;
    if (status && status !== 'active' && status !== 'none') return false;
    return true;
}

function daysSince(date, now) {
    if (!date) return null;
    return Math.floor((toMs(now) - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

const PENDING_WIPE_DAYS = 14;

function pendingWipeCyclesDue(user, now) {
    const card = user?.withdrawalCard || {};
    if (String(card.status || '') !== 'expired') return 0;
    const anchor = card.expiresAt;
    const days = daysSince(anchor, now);
    if (days == null || days < PENDING_WIPE_DAYS) return 0;
    return Math.floor(days / PENDING_WIPE_DAYS);
}

/**
 * Lock Virtual Account at 6-month expiry. Never touches virtualBalance.
 */
function expireVirtualAccountIfDue(user, now) {
    const card = user?.withdrawalCard;
    if (!card) return false;

    if (String(card.status) === 'expired') {
        if (user.isPaid) user.isPaid = false;
        return false;
    }

    const exp = card.expiresAt;
    const due = String(card.status) === 'active' && exp && new Date(exp).getTime() <= toMs(now);
    if (!due) return false;

    card.status = 'expired';
    user.isPaid = false;
    if (card.pendingWipesApplied == null) card.pendingWipesApplied = 0;
    return true;
}

/**
 * One-time split of the old single wallet.balance into Pending vs Virtual.
 */
function migrateWalletSplits(user) {
    if (!user.wallet) {
        user.wallet = {
            balance: 0,
            pendingBalance: 0,
            virtualBalance: 0,
            lifetimeEarnings: 0,
            todayEarnings: 0,
            referralEarnings: 0,
            walletSplitMigrated: true,
        };
        return true;
    }

    if (user.wallet.walletSplitMigrated) {
        if (user.wallet.pendingBalance == null) user.wallet.pendingBalance = 0;
        if (user.wallet.virtualBalance == null) user.wallet.virtualBalance = 0;
        return false;
    }

    const old = Number(user.wallet.balance) || 0;
    if (user.isPaid) {
        user.wallet.virtualBalance = old;
        user.wallet.pendingBalance = 0;
        user.wallet.balance = old;
    } else {
        user.wallet.pendingBalance = old;
        user.wallet.virtualBalance = 0;
        user.wallet.balance = 0;
    }
    user.wallet.walletSplitMigrated = true;
    return true;
}

function ensureWithdrawalCardShape(user) {
    if (!user.withdrawalCard) {
        user.withdrawalCard = {
            status: user.isPaid ? 'active' : 'none',
            holderName: user.name || '',
            phone: user.phone || '',
            issuedAt: user.isPaid ? (user.unlockedAt || new Date()) : null,
            expiresAt: null,
            lockedReserve: 0,
            quotedAmount: 499,
            quotedCredit: 0,
        };
    }

    if (user.isPaid && user.withdrawalCard.status === 'none') {
        user.withdrawalCard.status = 'active';
        user.withdrawalCard.issuedAt = user.unlockedAt || new Date();
        user.withdrawalCard.holderName = user.withdrawalCard.holderName || user.name;
        user.withdrawalCard.phone = user.withdrawalCard.phone || user.phone;
    }

    if (user.withdrawalCard.status === 'active' && user.withdrawalCard.issuedAt && !user.withdrawalCard.expiresAt) {
        const exp = new Date(user.withdrawalCard.issuedAt);
        exp.setMonth(exp.getMonth() + 6);
        user.withdrawalCard.expiresAt = exp;
    }

    expireVirtualAccountIfDue(user);
    return user.withdrawalCard;
}

function getCardQuote(user, settings = {}, now) {
    const card = user.withdrawalCard || {};
    const renewalAmount = Number(settings.cardRenewalAmount) || 199;
    const renewalDisplay = Number(settings.cardRenewalDisplayAmount) || 699;
    const reserve = Number(card.lockedReserve) || 0;

    if (card.status === 'expired') {
        return {
            amount: renewalAmount,
            credit: 0,
            displayAmount: renewalDisplay,
            reserveApplied: Math.min(reserve, renewalDisplay - renewalAmount),
            isRenewal: true,
            days: daysSince(registrationAnchorDate(user), now),
            note: `Card renewal: pay ₹${renewalAmount}. Locked Virtual balance stays safe and unlocks after payment. Pending from this 14-day cycle moves to Virtual.`,
        };
    }

    const start = registrationAnchorDate(user);
    const days = daysSince(start, now);
    let amount = 499;
    let credit = 0;
    let note = 'Virtual Account — ₹499. Account opens after payment and admin approval.';

    if (days != null && days <= 3) {
        amount = 499;
        credit = 399;
        note = 'Pay within 3 days of registration: ₹499 total. ₹399 stays as a 6-month reserve in Virtual Account and is used at renewal. ₹100 is the platform charge.';
    } else {
        amount = 499;
        credit = 0;
        note = 'Virtual Account — ₹499. Create it so earnings can move to Virtual and you can withdraw.';
    }

    return { amount, credit, days, note, isRenewal: false, displayAmount: amount, reserveApplied: 0 };
}

function withdrawableVirtual(user, now) {
    if (!isVirtualUnlocked(user, now)) return 0;
    const virtual = Number(user.wallet?.virtualBalance) || 0;
    const reserve = Number(user.withdrawalCard?.lockedReserve) || 0;
    return Math.max(0, virtual - reserve);
}

/**
 * Credit INR earning.
 * Invite hold → Pending only.
 * forceVirtual is ignored when the Virtual Account is locked/expired — new money stays in Pending.
 * Other sources → Virtual if unlocked, else Pending.
 */
async function creditEarning(user, amount, { source = 'Earning', inviteHold = false, forceVirtual = false, createTx = true, skipNotify = false } = {}) {
    migrateWalletSplits(user);
    ensureWithdrawalCardShape(user);
    const value = Math.round(Number(amount) * 100) / 100;
    if (!value) return { destination: 'none', amount: 0 };

    const unlocked = isVirtualUnlocked(user);
    const toPending = !unlocked || (!forceVirtual && inviteHold);
    if (toPending) {
        user.wallet.pendingBalance = (Number(user.wallet.pendingBalance) || 0) + value;
    } else {
        user.wallet.virtualBalance = (Number(user.wallet.virtualBalance) || 0) + value;
        user.wallet.balance = (Number(user.wallet.balance) || 0) + value;
    }
    user.wallet.lifetimeEarnings = (Number(user.wallet.lifetimeEarnings) || 0) + value;
    user.wallet.todayEarnings = (Number(user.wallet.todayEarnings) || 0) + value;

    if (createTx) {
        await Transaction.create({
            user: user._id,
            type: 'credit',
            currency: 'INR',
            amount: value,
            source,
            status: 'Success',
        });
    }

    if (
        process.env.NODE_ENV !== 'test' &&
        !toPending &&
        !inviteHold &&
        !skipNotify
    ) {
        const src = String(source || '');
        if (!/referral|invite|opening credit/i.test(src)) {
            try {
                const { notifyJourney } = require('./userJourneyPush');
                notifyJourney(user._id, 'earning_virtual', {
                    notificationId: `${user._id}_earning_virtual_${Date.now()}_${value}`,
                }).catch((err) => console.error('Earning virtual notify failed:', err.message));
            } catch (err) {
                console.error('Earning virtual notify failed:', err.message);
            }
        }
    }

    return { destination: toPending ? 'pending' : 'virtual', amount: value };
}

function transferPendingToVirtual(user, amount, { keepReserve = 0 } = {}) {
    migrateWalletSplits(user);
    const value = Math.min(Number(amount) || 0, Number(user.wallet.pendingBalance) || 0);
    if (value <= 0) return 0;
    user.wallet.pendingBalance -= value;
    user.wallet.virtualBalance = (Number(user.wallet.virtualBalance) || 0) + value;
    user.wallet.balance = (Number(user.wallet.balance) || 0) + value;
    if (keepReserve > 0) {
        user.withdrawalCard = user.withdrawalCard || {};
        user.withdrawalCard.lockedReserve = (Number(user.withdrawalCard.lockedReserve) || 0) + keepReserve;
    }
    return value;
}

function deductVirtual(user, amount) {
    migrateWalletSplits(user);
    const value = Number(amount) || 0;
    if (withdrawableVirtual(user) < value) return false;
    user.wallet.virtualBalance -= value;
    user.wallet.balance = Math.max(0, (Number(user.wallet.balance) || 0) - value);
    return true;
}

/** Deduct offerwall chargeback: pending first, then virtual/balance. Never throws. */
function deductOfferwallCredit(user, amount) {
    migrateWalletSplits(user);
    let remaining = Math.round(Number(amount) * 100) / 100;
    if (remaining <= 0) return 0;

    const pending = Number(user.wallet.pendingBalance) || 0;
    const fromPending = Math.min(pending, remaining);
    user.wallet.pendingBalance = pending - fromPending;
    remaining -= fromPending;

    if (remaining > 0) {
        const virtual = Number(user.wallet.virtualBalance) || 0;
        const fromVirtual = Math.min(virtual, remaining);
        user.wallet.virtualBalance = virtual - fromVirtual;
        user.wallet.balance = Math.max(0, (Number(user.wallet.balance) || 0) - fromVirtual);
        remaining -= fromVirtual;
    }

    return Math.round((Number(amount) - remaining) * 100) / 100;
}

function wipePendingEarnings(user) {
    migrateWalletSplits(user);
    const wiped = Number(user.wallet.pendingBalance) || 0;
    user.wallet.pendingBalance = 0;
    return wiped;
}

/**
 * After VA expiry: every 14 days, clear Pending only.
 * Virtual balance from before expiry is never wiped.
 */
function neverCreatedVirtualAccount(user) {
    if (user?.isPaid) return false;
    const status = String(user?.withdrawalCard?.status || 'none');
    return status !== 'expired' && status !== 'active' && status !== 'pending_approval';
}

function kycPendingWipeCyclesDue(user, now) {
    if (!neverCreatedVirtualAccount(user)) return 0;
    const days = daysSince(registrationAnchorDate(user), now);
    if (days == null || days < PENDING_WIPE_DAYS) return 0;
    return Math.floor(days / PENDING_WIPE_DAYS);
}

/**
 * First-time users (no Virtual Account yet): every 14 days after registration, clear Pending.
 * Repeats at 14, 28, 42… until they buy a Virtual Account.
 */
async function applyKycPendingWipeCycles(user, now) {
    migrateWalletSplits(user);
    if (!neverCreatedVirtualAccount(user)) {
        return { wiped: 0, cyclesApplied: 0, cyclesDue: 0 };
    }
    const due = kycPendingWipeCyclesDue(user, now);
    user.inviteInactive = user.inviteInactive || {};
    const applied = Number(user.inviteInactive.pendingWipesApplied) || 0;
    if (due <= applied) {
        return { wiped: 0, cyclesApplied: 0, cyclesDue: due };
    }
    const wiped = await wipePendingExceptInviteHolds(user);
    user.inviteInactive.pendingWipesApplied = due;
    return { wiped, cyclesApplied: due - applied, cyclesDue: due };
}

async function applyWalletMaintenance(user, now) {
    const migrated = migrateWalletSplits(user);
    ensureWithdrawalCardShape(user);
    const expiryWipe = applyPendingWipeCycles(user, now);
    const kycWipe = await applyKycPendingWipeCycles(user, now);
    return { expiryWipe, kycWipe, migrated };
}

async function pendingInviteHoldTotal(userId) {
    if (!userId) return 0;
    try {
        const ReferralTransaction = require('../models/ReferralTransaction');
        let query = ReferralTransaction.find({ referrer: userId, status: 'Pending' });
        if (query && typeof query.select === 'function') {
            query = query.select('amount');
        }
        const txs = await query;
        return (txs || []).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    } catch {
        return 0;
    }
}

async function wipePendingExceptInviteHolds(user) {
    migrateWalletSplits(user);
    const pending = Number(user.wallet.pendingBalance) || 0;
    const holds = await pendingInviteHoldTotal(user._id);
    const wipeable = Math.max(0, Math.round((pending - holds) * 100) / 100);
    if (wipeable > 0) {
        user.wallet.pendingBalance = Math.round((pending - wipeable) * 100) / 100;
    }
    return wipeable;
}

function applyPendingWipeCycles(user, now) {
    migrateWalletSplits(user);
    expireVirtualAccountIfDue(user, now);
    const card = user.withdrawalCard;
    if (!card || String(card.status) !== 'expired') {
        return { wiped: 0, cyclesApplied: 0, cyclesDue: 0 };
    }
    const due = pendingWipeCyclesDue(user, now);
    const applied = Number(card.pendingWipesApplied) || 0;
    if (due <= applied) {
        return { wiped: 0, cyclesApplied: 0, cyclesDue: due };
    }
    const wiped = wipePendingEarnings(user);
    card.pendingWipesApplied = due;
    return { wiped, cyclesApplied: due - applied, cyclesDue: due };
}

async function activateVirtualWallet(user, { isRenewal = false } = {}) {
    migrateWalletSplits(user);
    ensureWithdrawalCardShape(user);

    const pending = Number(user.wallet.pendingBalance) || 0;
    const holds = await pendingInviteHoldTotal(user._id);
    const transferable = Math.max(0, pending - holds);
    if (transferable > 0) {
        transferPendingToVirtual(user, transferable);
    }

    user.isPaid = true;
    user.unlockedAt = user.unlockedAt || new Date();
    const issued = new Date();
    const expires = new Date(issued);
    expires.setMonth(expires.getMonth() + 6);
    user.withdrawalCard = user.withdrawalCard || {};
    user.withdrawalCard.status = 'active';
    if (!isRenewal) {
        user.withdrawalCard.issuedAt = issued;
    }
    user.withdrawalCard.expiresAt = expires;
    user.withdrawalCard.lastPaymentAt = issued;
    user.withdrawalCard.renewalReminderSent = false;
    user.withdrawalCard.pendingWipesApplied = 0;
    user.withdrawalCard.holderName = user.withdrawalCard.holderName || user.name;
    user.withdrawalCard.phone = user.withdrawalCard.phone || user.phone;
    user.inviteInactive = user.inviteInactive || {};
    user.inviteInactive.pendingWipesApplied = 0;

    if (!isRenewal) {
        const credit = Number(user.withdrawalCard.quotedCredit) || 0;
        if (credit > 0) {
            await creditEarning(user, credit, {
                source: 'Virtual Account opening credit',
                inviteHold: false,
                createTx: true,
            });
            user.withdrawalCard.lockedReserve = (Number(user.withdrawalCard.lockedReserve) || 0) + credit;
            user.withdrawalCard.quotedCredit = 0;
        }
    } else {
        user.withdrawalCard.quotedCredit = 0;
    }
    if (typeof user.markModified === 'function') {
        user.markModified('wallet');
        user.markModified('withdrawalCard');
    }
    return user.withdrawalCard;
}

function quoteUserWithdrawal(user, amount, minWithdrawal) {
    const { quoteWithdrawal, WITHDRAWAL_FEE } = require('./moneyQuotes');
    return quoteWithdrawal({
        amount,
        withdrawable: withdrawableVirtual(user),
        minWithdrawal,
        fee: WITHDRAWAL_FEE,
    });
}

/** Payload the user panel can render without re-deriving expiry math. */
function getVirtualAccountView(user, now) {
    const card = user?.withdrawalCard || {};
    const status = String(card.status || 'none');
    const unlocked = isVirtualUnlocked(user, now);
    const expired = status === 'expired';
    const exp = card.expiresAt ? new Date(card.expiresAt) : null;
    let daysUntilExpiry = null;
    if (unlocked && exp && !Number.isNaN(exp.getTime())) {
        daysUntilExpiry = Math.max(0, Math.ceil((exp.getTime() - toMs(now)) / (24 * 60 * 60 * 1000)));
    }
    let daysUntilPendingWipe = null;
    let wipeCycle = 0;
    if (expired && exp && !Number.isNaN(exp.getTime())) {
        const days = Math.max(0, daysSince(exp, now) || 0);
        const applied = Number(card.pendingWipesApplied) || 0;
        wipeCycle = applied + 1;
        daysUntilPendingWipe = Math.max(0, wipeCycle * PENDING_WIPE_DAYS - days);
    } else if (neverCreatedVirtualAccount(user) && registrationAnchorDate(user)) {
        const days = Math.max(0, daysSince(registrationAnchorDate(user), now) || 0);
        const applied = Number(user.inviteInactive?.pendingWipesApplied) || 0;
        wipeCycle = applied + 1;
        daysUntilPendingWipe = Math.max(0, wipeCycle * PENDING_WIPE_DAYS - days);
    }
    return {
        status,
        unlocked,
        expired,
        daysUntilExpiry,
        renewSoon: unlocked && daysUntilExpiry != null && daysUntilExpiry <= 7,
        daysUntilPendingWipe,
        wipeCycle,
        virtualBalance: Number(user?.wallet?.virtualBalance) || 0,
        pendingBalance: Number(user?.wallet?.pendingBalance) || 0,
        withdrawable: withdrawableVirtual(user, now),
        lockedReserve: Number(card.lockedReserve) || 0,
        expiresAt: card.expiresAt || null,
    };
}

module.exports = {
    isKycComplete,
    registrationAnchorDate,
    isVirtualUnlocked,
    daysSince,
    PENDING_WIPE_DAYS,
    pendingWipeCyclesDue,
    expireVirtualAccountIfDue,
    neverCreatedVirtualAccount,
    kycPendingWipeCyclesDue,
    applyKycPendingWipeCycles,
    applyWalletMaintenance,
    applyPendingWipeCycles,
    migrateWalletSplits,
    ensureWithdrawalCardShape,
    getCardQuote,
    withdrawableVirtual,
    quoteUserWithdrawal,
    creditEarning,
    transferPendingToVirtual,
    deductVirtual,
    deductOfferwallCredit,
    wipePendingEarnings,
    activateVirtualWallet,
    getVirtualAccountView,
};
