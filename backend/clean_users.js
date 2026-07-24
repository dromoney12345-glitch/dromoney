const mongoose = require('mongoose');
require('dotenv').config();

const cleanDatabase = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const collectionsToClean = [
            'users',
            'transactions',
            'payments',
            'withdrawals',
            'tasksubmissions',
            'eventparticipants',
            'referraltransactions',
            'rewardhistories',
            'chats',
            'otps',
            'feedbacks',
            'reports',
            'notificationlogs',
            'notifications'
        ];

        for (const collectionName of collectionsToClean) {
            try {
                const result = await mongoose.connection.collection(collectionName).deleteMany({});
                console.log(`Cleaned ${result.deletedCount} documents from '${collectionName}' collection.`);
            } catch (err) {
                // Collection might not exist, which is fine
                if (err.code === 26 || err.message.includes('ns not found')) {
                    console.log(`Collection '${collectionName}' does not exist, skipping.`);
                } else {
                    console.error(`Error cleaning '${collectionName}':`, err.message);
                }
            }
        }

        console.log('✅ Database cleanup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to clean database:', err);
        process.exit(1);
    }
};

cleanDatabase();
