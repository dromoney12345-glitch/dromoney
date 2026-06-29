const cron = require('node-cron');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');

// This cron job will run every day at 00:05 (12:05 AM)
// It calculates the previous day's activity score and distributes the future fund pool
const startFutureFundCron = () => {
    cron.schedule('5 0 * * *', async () => {
        console.log('Running Daily Future Fund Distribution Cron Job...');
        try {
            // --- Auto-Activation Step ---
            // Activate future fund for users with >= 10 referrals and account >= 10 days old
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            
            await User.updateMany(
                { 
                    referralCount: { $gte: 10 },
                    createdAt: { $lte: tenDaysAgo },
                    'futureFund.status': { $ne: 'active' }
                },
                {
                    $set: { 'futureFund.status': 'active' }
                }
            );

            // Find all active future fund users
            const activeUsers = await User.find({ 'futureFund.status': 'active' });
            
            if (activeUsers.length === 0) {
                console.log('No active Future Fund users found. Skipping distribution.');
                return;
            }

            let settings = await Settings.findOne();
            if (!settings) settings = {};
            
            const adWeight = settings.ffAdScoreWeight || 1;
            const taskWeight = settings.ffTaskScoreWeight || 1;
            const boosterMultiplier = settings.ffBoosterMultiplier || 1.5;

            // Calculate Yesterday's Start and End Times
            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);

            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            let totalPool = activeUsers.length * 25; // 25 INR per active user
            let totalScores = 0;

            const userScores = [];

            // Step 1: Calculate Score for Each User
            for (const user of activeUsers) {
                // Determine Ad Score for yesterday
                let adScore = 0;
                // If lastAdCountResetAt is on or after yesterdayStart AND before yesterdayEnd
                if (user.lastAdCountResetAt && user.lastAdCountResetAt >= yesterdayStart && user.lastAdCountResetAt <= yesterdayEnd) {
                    adScore = user.dailyAdCount || 0;
                }

                // Determine Task Score for yesterday
                let taskScore = 0;
                if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
                    taskScore = user.dailyTaskCompletions.filter(tc => {
                        const t = new Date(tc.completedAt);
                        return t >= yesterdayStart && t <= yesterdayEnd;
                    }).length;
                }

                let multiplier = 1.0;
                if (user.isTaskBoosterActive || user.isSupportBoosterActive) {
                    multiplier = boosterMultiplier;
                }

                let baseScore = (adScore * adWeight) + (taskScore * taskWeight);
                if (baseScore === 0) baseScore = 1; // Minimum score of 1

                let finalScore = baseScore * multiplier;
                totalScores += finalScore;

                userScores.push({ user, finalScore });
            }

            // Fallback total score calculation to avoid div by zero or give baseline
            const estimatedTotalScore = activeUsers.length * 5;
            const effectiveTotalScore = estimatedTotalScore + totalScores;

            // Step 2: Distribute the Pool
            for (const item of userScores) {
                const { user, finalScore } = item;
                
                // If overrideProfit is set by admin, use that. Otherwise use formula.
                let reward = 0;
                if (user.futureFund && user.futureFund.overrideProfit !== null && user.futureFund.overrideProfit !== undefined) {
                    reward = user.futureFund.overrideProfit;
                } else {
                    reward = (finalScore / effectiveTotalScore) * totalPool;
                }

                reward = Math.floor(reward * 100) / 100; // Keep 2 decimal places

                if (reward > 0) {
                    // Assuming Future Fund distributes in INR (wallet.balance) based on previous code context
                    if (!user.wallet) user.wallet = { balance: 0, lifetimeEarnings: 0, todayEarnings: 0, referralEarnings: 0 };
                    
                    user.wallet.balance += reward;
                    user.wallet.lifetimeEarnings += reward;
                    user.wallet.todayEarnings += reward;

                    await user.save();

                    // Record Transaction
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
