const cron = require('node-cron');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const { syncFutureFundCriteria } = require('../utils/futureFund');

// Runs every day at 00:05 — sync eligibility + distribute yesterday's pool
const startFutureFundCron = () => {
    cron.schedule('5 0 * * *', async () => {
        console.log('Running Daily Future Fund Distribution Cron Job...');
        try {
            const settings = (await Settings.findOne()) || {};

            // Auto-activate anyone who has met all 3 dynamic criteria
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

            const adWeight = settings.ffAdScoreWeight || 1;
            const taskWeight = settings.ffTaskScoreWeight || 1;
            const boosterMultiplier = settings.ffBoosterMultiplier || 1.5;

            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);

            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            let totalPool = activeUsers.length * 25;
            let totalScores = 0;
            const userScores = [];

            for (const user of activeUsers) {
                let adScore = 0;
                if (user.lastAdCountResetAt && user.lastAdCountResetAt >= yesterdayStart && user.lastAdCountResetAt <= yesterdayEnd) {
                    adScore = user.dailyAdCount || 0;
                }

                let taskScore = 0;
                if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
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

            for (const item of userScores) {
                const { user, finalScore } = item;

                let reward = 0;
                if (user.futureFund && user.futureFund.overrideProfit !== null && user.futureFund.overrideProfit !== undefined) {
                    reward = user.futureFund.overrideProfit;
                } else {
                    reward = (finalScore / effectiveTotalScore) * totalPool;
                }

                reward = Math.floor(reward * 100) / 100;

                if (reward > 0) {
                    if (!user.wallet) user.wallet = { balance: 0, lifetimeEarnings: 0, todayEarnings: 0, referralEarnings: 0 };

                    user.wallet.balance += reward;
                    user.wallet.lifetimeEarnings += reward;
                    user.wallet.todayEarnings += reward;

                    await user.save();

                    await Transaction.create({
                        user: user._id,
                        type: 'credit',
                        currency: 'INR',
                        amount: reward,
                        source: 'Daily Future Fund Distribution',
                        status: 'Success'
                    });
                }
            }
            console.log(`Successfully distributed Future Fund to ${activeUsers.length} users.`);
        } catch (error) {
            console.error('Error in Future Fund Cron Job:', error);
        }
    });
};

module.exports = { startFutureFundCron };
