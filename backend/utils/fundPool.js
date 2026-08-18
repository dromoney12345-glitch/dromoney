const FutureFundPool = require('../models/FutureFundPool');
const { getIstDateString } = require('./futureFund');

async function addPoolRevenue(amount, { source = 'adjustment', note = '', user = null } = {}) {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!value || value <= 0) return 0;

    const date = getIstDateString();
    await FutureFundPool.create({
        date,
        source,
        amount: value,
        note,
        user: user || undefined,
    });
    return value;
}

async function recordDistribution(amount, note = 'Daily distribution') {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!value || value <= 0) return 0;

    await FutureFundPool.create({
        date: getIstDateString(),
        source: 'distribution',
        amount: -value,
        note,
    });
    return value;
}

async function getPoolSummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await FutureFundPool.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: { date: '$date', source: '$source' },
                total: { $sum: '$amount' },
            },
        },
    ]);

    const today = getIstDateString();
    const todayRows = rows.filter((r) => r._id.date === today);
    const todayIn = todayRows.filter((r) => r._id.source !== 'distribution').reduce((s, r) => s + r.total, 0);
    const todayOut = todayRows.filter((r) => r._id.source === 'distribution').reduce((s, r) => s + Math.abs(r.total), 0);

    const allTime = await FutureFundPool.aggregate([
        { $group: { _id: '$source', total: { $sum: '$amount' } } },
    ]);

    const balance = allTime.reduce((s, r) => s + r.total, 0);

    return {
        balance: Math.round(balance * 100) / 100,
        todayIn: Math.round(todayIn * 100) / 100,
        todayOut: Math.round(todayOut * 100) / 100,
        todayNet: Math.round((todayIn - todayOut) * 100) / 100,
        breakdown: allTime.map((r) => ({ source: r._id, total: Math.round(r.total * 100) / 100 })),
        recentDays: rows,
    };
}

module.exports = {
    addPoolRevenue,
    recordDistribution,
    getPoolSummary,
};
