const cron = require('node-cron');
const User = require('../models/User');

const startBusinessPlanExpiryCron = () => {
    cron.schedule('30 0 * * *', async () => {
        console.log('Running business plan expiry check...');
        try {
            const now = new Date();
            const result = await User.updateMany(
                {
                    businessPlanStatus: 'active',
                    supportExpiry: { $ne: null, $lt: now },
                },
                {
                    $set: { businessPlanStatus: 'expired', activeBusinessPlan: 'Free' },
                }
            );
            if (result.modifiedCount) {
                console.log(`Expired ${result.modifiedCount} business plan(s).`);
            }
        } catch (err) {
            console.error('Business plan expiry cron failed:', err.message);
        }
    });
};

module.exports = { startBusinessPlanExpiryCron };
