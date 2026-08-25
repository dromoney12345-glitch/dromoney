const cron = require('node-cron');
const Notification = require('../models/Notification');

const startNotificationCleanupCron = () => {
    cron.schedule('0 2 * * *', async () => {
        console.log('Running Notification Cleanup Cron Job...');
        try {
            const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
            const result = await Notification.deleteMany({
                status: 'Read',
                createdAt: { $lt: sixDaysAgo },
            });
            console.log(`Successfully deleted ${result.deletedCount} old read notifications.`);
        } catch (error) {
            console.error('Error in Notification Cleanup Cron Job:', error);
        }
    });

    cron.schedule('*/2 * * * *', async () => {
        try {
            const due = await Notification.find({
                status: 'scheduled',
                scheduledAt: { $ne: null, $lte: new Date() },
            }).limit(20);
            if (!due.length) return;
            const { deliverNotification } = require('../controllers/notificationController');
            for (const item of due) {
                await deliverNotification(item);
            }
        } catch (error) {
            console.error('Scheduled notification cron failed:', error.message);
        }
    });
};

module.exports = { startNotificationCleanupCron };
