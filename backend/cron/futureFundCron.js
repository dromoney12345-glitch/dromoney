const cron = require('node-cron');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const { syncFutureFundCriteria } = require('../utils/futureFund');
const { creditEarning } = require('../utils/walletLedger');
const { getPoolSummary, recordDistribution } = require('../utils/fundPool');

const startFutureFundCron = () => {
    cron.schedule('5 0 * * *', async () => {
        console.log('Running Daily Future Fund Distribution Cron Job...');
        try {
            const settings = (await Settings.findOne()) || {};

            const candidates = await User.find({ 'futureFund.status': { $ne: 'active' } }).limit(5000);
            for (const user of candidates) {
                try {
                    const synced = await syncFutureFundCriteria(user, settings);
                    if (synced.modified || synced.eligible) {
                        await user.save({ validateBeforeSave: false });
                    }
                } catch (e) {
                    console.error('FF sync failed for', user._id, e.message);
                }
            }

            const activeUsers = await User.find({ 'futureFund.status': 'active' });
            if (activeUsers.length === 0) {
                console.log('No active Future Fund users found. Skipping distribution.');
                return;
            }

            const poolSummary = await getPoolSummary(1);
            let totalPool = Math.max(0, poolSummary.todayIn);
            if (totalPool <= 0) {
                totalPool = Math.max(0, poolSummary.balance);
            }
            if (totalPool <= 0) {
                totalPool = activeUsers.length * 25;
            }

            const adWeight = settings.ffAdScoreWeight || 1;
            const taskWeight = settings.ffTaskScoreWeight || 1;
            const boosterMultiplier = settings.ffBoosterMultiplier || 1.5;

            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            let totalScores = 0;
            const userScores = [];

            for (const user of activeUsers) {
                let adScore = 0;
                if (user.lastAdCountResetAt && user.lastAdCountResetAt >= yesterdayStart && user.lastAdCountResetAt <= yesterdayEnd) {
                    adScore = user.dailyAdCount || 0;
                }

                let taskScore = 0;
                if (user.dailyTaskCompletions?.length) {
                    taskScore = user.dailyTaskCompletions.filter((tc) => {
                        const t = new Date(tc.completedAt);
                        return t >= yesterdayStart && t <= yesterdayEnd;
                    }).length;
                }

                let multiplier = 1.0;
                if (user.isTaskBoosterActive || user.isSupportBoosterActive) {
                    multiplier = boosterMultiplier;
                }

                let baseScore = (adScore * adWeight) + (taskScore * taskWeight);
                if (baseScore === 0) baseScore = 1;

                const finalScore = baseScore * multiplier;
                totalScores += finalScore;
                userScores.push({ user, finalScore });
            }

            const estimatedTotalScore = activeUsers.length * 5;
            const effectiveTotalScore = estimatedTotalScore + totalScores;
            let distributed = 0;

            for (const item of userScores) {
                const { user, finalScore } = item;

                let reward = 0;
                if (user.futureFund?.overrideProfit != null) {
                    reward = user.futureFund.overrideProfit;
                } else {
                    reward = (finalScore / effectiveTotalScore) * totalPool;
                }

                reward = Math.floor(reward * 100) / 100;

                if (reward > 0) {
                    await creditEarning(user, reward, {
                        source: 'Daily Future Fund Distribution',
                        inviteHold: false,
                        createTx: true,
                    });
                    await user.save({ validateBeforeSave: false });
                    distributed += reward;
                }
            }

            if (distributed > 0) {
                await recordDistribution(distributed, `Auto cron distribution to ${activeUsers.length} users`);
            }

            console.log(`Successfully distributed ₹${distributed} Future Fund to ${activeUsers.length} users.`);
        } catch (error) {
            console.error('Error in Future Fund Cron Job:', error);
        }
    });
};

module.exports = { startFutureFundCron };
