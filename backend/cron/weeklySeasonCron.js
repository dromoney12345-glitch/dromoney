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
                        isBoosterActive: false,
                        isSupportBoosterActive: false,
                        isTaskBoosterActive: false,
                        boosterExpiry: null,
                        supportBoosterExpiry: null,
                        taskBoosterExpiry: null
                    }
                }
            );

            console.log(`Successfully reset coins and boosters for ${result.modifiedCount} users for the new week.`);
        } catch (error) {
            console.error('Error in Weekly Season Reset Cron Job:', error);
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
                    body: 'Mega Event में 3 दिन बचे हैं! बूस्टर लें और 12x कॉइन कमाएं।',
                    data: {
                        type: 'mega_event_reminder',
                        link: '/user/events'
                    }
                });
                console.log('Thursday Mega Event notification sent.');
            } else if (dayOfWeek === 6) { // Saturday (1 day before Sunday)
                await sendBroadcastNotification({
                    title: '⏳ Mega Event Tomorrow!',
                    body: 'सिर्फ 24 घंटे! 500 कॉइन का टारगेट पूरा करें।',
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
