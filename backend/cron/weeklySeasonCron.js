const cron = require('node-cron');
const User = require('../models/User');

// This cron job will run every Sunday at 23:59 (11:59 PM)
// It resets the Coins and Boosters for all users automatically
const startWeeklySeasonCron = () => {
    cron.schedule('59 23 * * 0', async () => {
        console.log('Running Weekly Booster Reset Cron Job...');
        try {
            const result = await User.updateMany(
                {},
                {
                    $set: { 
                        isBoosterActive: false,
                        isSupportBoosterActive: false,
                        isTaskBoosterActive: false,
                        boosterExpiry: null,
                        supportBoosterExpiry: null,
                        taskBoosterExpiry: null
                    }
                }
            );

            console.log(`Successfully reset boosters for ${result.modifiedCount} users for the new week.`);
        } catch (error) {
            console.error('Error in Weekly Booster Reset Cron Job:', error);
        }
    });

    // Daily Mega Event Notifications check: Runs every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Checking Mega Event Notifications...');
        try {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0: Sunday, 4: Thursday, 6: Saturday
            const { sendBroadcastNotification } = require('../controllers/fcmController');

            if (dayOfWeek === 4) { // Thursday (3 days before Sunday)
                await sendBroadcastNotification({
                    title: '👑 Sunday Mega Event coming soon!',
                    body: 'Mega Event is 3 days away! Get a booster and earn 12x rewards.',
                    data: {
                        type: 'mega_event_reminder',
                        link: '/user/events'
                    }
                });
                console.log('Thursday Mega Event notification sent.');
            } else if (dayOfWeek === 6) { // Saturday (1 day before Sunday)
                await sendBroadcastNotification({
                    title: '⏳ Mega Event Tomorrow!',
                    body: 'Only 24 hours left! Complete the target to win big.',
                    data: {
                        type: 'mega_event_reminder',
                        link: '/user/events'
                    }
                });
                console.log('Saturday Mega Event notification sent.');
            }
        } catch (error) {
            console.error('Error sending Mega Event notifications:', error);
        }
    });
};

module.exports = { startWeeklySeasonCron };
