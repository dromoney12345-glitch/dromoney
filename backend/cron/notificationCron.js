const cron = require('node-cron');
const Notification = require('../models/Notification');

// Runs daily at 2:00 AM to clean up read notifications older than 6 days
const startNotificationCleanupCron = () => {
    cron.schedule('0 2 * * *', async () => {
        console.log('Running Notification Cleanup Cron Job...');
        try {
            const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
            const result = await Notification.deleteMany({
                status: 'Read',
                createdAt: { $lt: sixDaysAgo }
            });
            console.log(`Successfully deleted ${result.deletedCount} old read notifications.`);
        } catch (error) {
            console.error('Error in Notification Cleanup Cron Job:', error);
        }
    });
};

module.exports = { startNotificationCleanupCron };
