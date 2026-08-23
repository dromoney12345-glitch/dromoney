/**
 * Server-side money quotes. Frontend must display these numbers, never recompute them.
 */

const WITHDRAWAL_FEE = 5;
const BOOSTER_FEE_PERCENT = 4;
const MEGA_EVENT_MIN_BALANCE = 500;
const SUPPORT_CHAT_RENEWAL_FEE = 150;
const DEFAULT_UNLOCK_FEE = 499;
const MONTHLY_REVENUE_TARGET = 600000;

function roundMoney(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round(v * 100) / 100;
}

function quoteWithdrawal({ amount, withdrawable, minWithdrawal, fee = WITHDRAWAL_FEE }) {
    const requested = roundMoney(amount);
    const feeAmt = roundMoney(fee);
    const totalDeduction = roundMoney(requested + feeAmt);
    const available = roundMoney(withdrawable);
    const min = roundMoney(minWithdrawal);
    return {
        amount: requested,
        fee: feeAmt,
        totalDeduction,
        withdrawable: available,
        minWithdrawal: min,
        meetsMinimum: requested >= min && requested > 0,
        sufficient: requested >= min && requested > 0 && totalDeduction <= available,
        shortfall: roundMoney(Math.max(0, totalDeduction - available)),
    };
}

function quotePayment({ baseAmount, feePercent = 0 }) {
    const base = roundMoney(baseAmount);
    const pct = Number(feePercent) || 0;
    const payableAmount = roundMoney(base * (1 + pct / 100));
    const feeAmount = roundMoney(payableAmount - base);
    return {
        baseAmount: base,
        feePercent: pct,
        feeAmount,
        payableAmount,
    };
}

function quoteMegaEligibility(balance, minBalance = MEGA_EVENT_MIN_BALANCE) {
    const bal = roundMoney(balance);
    const min = roundMoney(minBalance);
    const remaining = roundMoney(Math.max(0, min - bal));
    const progressPercent = min > 0 ? Math.min(100, Math.round((bal / min) * 100)) : 100;
    return {
        balance: bal,
        minBalance: min,
        remaining,
        eligible: bal >= min,
        progressPercent,
    };
}

function quoteFutureFundPreview({ poolAmount, users }) {
    const totalPool = roundMoney(poolAmount);
    const list = Array.isArray(users) ? users : [];
    const totalFixed = roundMoney(
        list.reduce((acc, u) => acc + (Number(u.overrideProfit) || 0), 0)
    );
    const remainingPool = roundMoney(Math.max(0, totalPool - totalFixed));

    return list.map((u) => {
        const share = Number(u.sharePercentage) || 0;
        const base = roundMoney((share / 100) * remainingPool);
        const overrideProfit = roundMoney(u.overrideProfit);
        return {
            ...u,
            estimatedProfit: roundMoney(base + overrideProfit),
        };
    });
}

function quoteRevenueTarget(currentRevenue, target = MONTHLY_REVENUE_TARGET) {
    const current = roundMoney(currentRevenue);
    const tgt = roundMoney(target);
    const percent = tgt > 0 ? Math.min((current / tgt) * 100, 100) : 0;
    let formattedCurrent = `₹${current.toFixed(0)}`;
    if (current >= 100000) formattedCurrent = `₹${(current / 100000).toFixed(2)}L`;
    else if (current >= 1000) formattedCurrent = `₹${(current / 1000).toFixed(2)}k`;
    return {
        current,
        target: tgt,
        percent: Number(percent.toFixed(1)),
        formattedCurrent,
        formattedTarget: '6L',
    };
}

function quoteEventMoney({ fee, participantCount, pool }) {
    const { resolveEventCashPool, computeEventDistribution } = require('./eventPrizes');
    const eventLike = { fee, totalCashPoolINR: pool };
    const totalPool = resolveEventCashPool(eventLike, participantCount);
    const dist = computeEventDistribution(totalPool, 3, Math.max(0, Number(participantCount) - 3));
    const dynamicPrize = Math.floor(Math.max(0, Number(fee) || 0) * Math.max(0, Number(participantCount) || 0) * 0.8);
    const poolCash = roundMoney((Number(fee) || 0) * (Number(participantCount) || 0));
    return {
        totalPool: dist.totalPool,
        prizeFund: dist.prizePool,
        firstPlace: (dist.winnerAmounts && dist.winnerAmounts[0]) || 0,
        soleWinner: dist.prizePool,
        dynamicPrize,
        poolCash,
    };
}

module.exports = {
    WITHDRAWAL_FEE,
    BOOSTER_FEE_PERCENT,
    MEGA_EVENT_MIN_BALANCE,
    SUPPORT_CHAT_RENEWAL_FEE,
    DEFAULT_UNLOCK_FEE,
    MONTHLY_REVENUE_TARGET,
    roundMoney,
    quoteWithdrawal,
    quotePayment,
    quoteMegaEligibility,
    quoteFutureFundPreview,
    quoteRevenueTarget,
    quoteEventMoney,
};
