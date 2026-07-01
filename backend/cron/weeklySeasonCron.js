const cron = require('node-cron');
const User = require('../models/User');

// This cron job will run every Sunday at 23:59 (11:59 PM)
// It resets the Coins and Boosters for all users automatically
const startWeeklySeasonCron = () => {
    cron.schedule('59 23 * * 0', async () => {
        console.log('Running Weekly Season Reset Cron Job...');
        try {
            const result = await User.updateMany(
                {}, // Target all users
                {
                    $set: { 
                        'coins.balance': 0, 
                        'coins.total': 0,
                        isTaskBoosterActive: false,
                        isSupportBoosterActive: false 
                    }
                }
            );

            console.log(`Successfully reset coins and boosters for ${result.modifiedCount} users for the new week.`);
        } catch (error) {
            console.error('Error in Weekly Season Reset Cron Job:', error);
        }
    });
};

module.exports = { startWeeklySeasonCron };
