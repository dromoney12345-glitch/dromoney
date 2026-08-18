const Transaction = require('../models/Transaction');

function isKycComplete(user) {
    const status = String(user?.kyc?.status || '').toLowerCase();
    return status === 'verified' || status === 'approved';
}

function isVirtualUnlocked(user) {
    return !!user?.isPaid;
}

function daysSince(date) {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
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

    if (user.withdrawalCard.status === 'active' && user.withdrawalCard.expiresAt) {
        if (new Date(user.withdrawalCard.expiresAt) < new Date()) {
            user.withdrawalCard.status = 'expired';
            user.isPaid = false;
        }
    }

    return user.withdrawalCard;
}

function getCardQuote(user, settings = {}) {
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
            days: daysSince(user.kycApprovedAt || user.kyc?.approvedAt),
            note: `Card renewal: pay ₹${renewalAmount} (₹${renewalDisplay} shown, ₹${Math.min(reserve, renewalDisplay - renewalAmount)} reserve applied).`,
        };
    }

    const start = user.kycApprovedAt || user.kyc?.approvedAt;
    const days = daysSince(start);
    let amount = 499;
    let credit = 0;
    let note = 'Withdrawal Card — ₹499. Virtual Wallet unlock after admin approval.';

    if (days != null && days > 7) {
        amount = 550;
        credit = 0;
        note = '7-day inactivity: 10% penalty applies. Total payable ₹550. Virtual credit ₹0.';
    } else if (days != null && days <= 3) {
        amount = 499;
        credit = 399;
        note = '3-day activation: ₹100 platform charge. ₹399 will sit as a 6-month reserve in Virtual Wallet.';
    } else {
        amount = 499;
        credit = 0;
        note = 'Standard Withdrawal Card. Payable ₹499.';
    }

    return { amount, credit, days, note, isRenewal: false, displayAmount: amount, reserveApplied: 0 };
}

function withdrawableVirtual(user) {
    const virtual = Number(user.wallet?.virtualBalance) || 0;
    const reserve = Number(user.withdrawalCard?.lockedReserve) || 0;
    return Math.max(0, virtual - reserve);
}

/**
 * Credit INR earning.
 * Invite hold → Pending only.
 * Other sources → Virtual if unlocked, else Pending.
 */
async function creditEarning(user, amount, { source = 'Earning', inviteHold = false, createTx = true } = {}) {
    migrateWalletSplits(user);
    const value = Math.round(Number(amount) * 100) / 100;
    if (!value) return { destination: 'none', amount: 0 };

    const toPending = inviteHold || !isVirtualUnlocked(user);
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

function wipePendingEarnings(user) {
    migrateWalletSplits(user);
    const wiped = Number(user.wallet.pendingBalance) || 0;
    user.wallet.pendingBalance = 0;
    return wiped;
}

async function activateVirtualWallet(user) {
    migrateWalletSplits(user);
    ensureWithdrawalCardShape(user);
    user.isPaid = true;
    user.unlockedAt = new Date();
    const issued = new Date();
    const expires = new Date(issued);
    expires.setMonth(expires.getMonth() + 6);
    user.withdrawalCard.status = 'active';
    user.withdrawalCard.issuedAt = issued;
    user.withdrawalCard.expiresAt = expires;
    user.withdrawalCard.lastPaymentAt = issued;
    user.withdrawalCard.holderName = user.name;
    user.withdrawalCard.phone = user.phone;

    const credit = Number(user.withdrawalCard.quotedCredit) || 0;
    if (credit > 0) {
        await creditEarning(user, credit, {
            source: 'Withdrawal Card opening credit',
            inviteHold: false,
            createTx: true,
        });
        user.withdrawalCard.lockedReserve = (Number(user.withdrawalCard.lockedReserve) || 0) + credit;
    }
    return user.withdrawalCard;
}

module.exports = {
    isKycComplete,
    isVirtualUnlocked,
    daysSince,
    migrateWalletSplits,
    ensureWithdrawalCardShape,
    getCardQuote,
    withdrawableVirtual,
    creditEarning,
    transferPendingToVirtual,
    deductVirtual,
    wipePendingEarnings,
    activateVirtualWallet,
};
