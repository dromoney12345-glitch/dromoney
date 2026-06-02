require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const Notification = require('./models/Notification');
        const User = require('./models/User');

        // Clear public notifications
        await Notification.deleteMany({});
        console.log('Cleared public notifications.');

        // Add dummy personal notifications to all users
        await User.updateMany({}, {
            $push: {
                notifications: {
                    $each: [
                        {
                            title: 'New Team Member! 👥',
                            message: 'Congratulations! John Doe just registered using your referral link.',
                            type: 'success',
                            isRead: false
                        },
                        {
                            title: 'Platform Access Unlocked! 🚀',
                            message: 'Your payment for Lifetime Access is confirmed. Welcome to DroMoney Premium!',
                            type: 'success',
                            isRead: false
                        },
                        {
                            title: 'Booster Activated! ⚡',
                            message: 'Your Task Booster is now active! Enjoy 3X coin earnings for 30 days.',
                            type: 'success',
                            isRead: false
                        }
                    ]
                }
            }
        });
        console.log('Added dummy personal notifications to all users!');
        
    })
    .catch(err => console.error(err))
    .finally(() => process.exit(0));
