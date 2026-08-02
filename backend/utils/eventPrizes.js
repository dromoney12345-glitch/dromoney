/**
 * Event prize / cash-pool helpers — keep distribution dynamic from admin settings.
 */

function parseMoneyAmount(value) {
    if (value == null) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
    const str = String(value).trim();
    if (!str) return 0;
    // Ignore percentage labels like "50%" / "50% Pool"
    if (/%/.test(str)) return 0;
    // Ignore coin labels — those are gameplay rewards, not cash pool
    if (/coin/i.test(str)) return 0;
    const match = str.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
    return match ? Math.max(0, parseFloat(match[1])) : 0;
}

/**
 * Resolve the total INR pool for an event.
 * Priority:
 * 1) event.totalCashPoolINR (admin "Total Event Pool")
 * 2) numeric prize text (e.g. "₹200", "200") when not a %
 * 3) fallback: participants × entry fee × coinRate
 */
function resolveEventCashPool(event, participantCount = 0, coinRate = 0.1) {
    const configured = Number(event?.totalCashPoolINR) || 0;
    if (configured > 0) return configured;

    const fromPrizeLabel = parseMoneyAmount(event?.prize);
    if (fromPrizeLabel > 0) return fromPrizeLabel;

    const fee = Math.max(0, Number(event?.fee) || 0);
    const rate = Number(coinRate) > 0 ? Number(coinRate) : 0.1;
    return Math.max(0, participantCount * fee * rate);
}

/**
 * Top-3 split weights. Unused slots are redistributed so
 * 1 winner gets 100%, 2 winners share 50:30 normalized, etc.
 */
function getWinnerShareWeights(winnerCount) {
    const base = [0.5, 0.3, 0.2];
    const n = Math.min(Math.max(winnerCount, 0), 3);
    if (n === 0) return [];
    const slice = base.slice(0, n);
    const sum = slice.reduce((a, b) => a + b, 0) || 1;
    return slice.map((w) => w / sum);
}

/**
 * Compute distribution breakdown.
 * totalPool = admin pool (or derived)
 * - 50% → Top 3 winners (normalized among who exist)
 * - 20% → Admin profit
 * - 30% → Cashback for remaining participants
 */
function computeEventDistribution(totalPool, winnerCount, otherCount) {
    const pool = Math.max(0, Number(totalPool) || 0);
    const prizePool = pool * 0.5;
    const adminProfit = pool * 0.2;
    const cashbackPool = pool * 0.3;

    const weights = getWinnerShareWeights(winnerCount);
    const winnerAmounts = weights.map((w) => Math.round(prizePool * w * 100) / 100);

    // Fix rounding drift on last winner
    if (winnerAmounts.length > 0) {
        const sumW = winnerAmounts.reduce((a, b) => a + b, 0);
        const drift = Math.round((prizePool - sumW) * 100) / 100;
        winnerAmounts[winnerAmounts.length - 1] =
            Math.round((winnerAmounts[winnerAmounts.length - 1] + drift) * 100) / 100;
    }

    const cashbackPerUser =
        otherCount > 0 ? Math.round((cashbackPool / otherCount) * 100) / 100 : 0;

    return {
        totalPool: Math.round(pool * 100) / 100,
        prizePool: Math.round(prizePool * 100) / 100,
        adminProfit: Math.round(adminProfit * 100) / 100,
        cashbackPool: Math.round(cashbackPool * 100) / 100,
        winnerAmounts,
        cashbackPerUser,
    };
}

module.exports = {
    parseMoneyAmount,
    resolveEventCashPool,
    getWinnerShareWeights,
    computeEventDistribution,
};
