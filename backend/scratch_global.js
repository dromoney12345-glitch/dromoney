require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const Notification = require('./models/Notification');

        // Clear public notifications
        await Notification.deleteMany({});
        console.log('Cleared public notifications.');

        // Insert new dummy global notifications for Admin panel
        await Notification.insertMany([
            {
                title: 'New Referrals!',
                message: 'Invite your friends to earn amazing commissions on every purchase they make.',
                type: 'broadcast'
            },
            {
                title: 'Platform Upgrade',
                message: 'We have updated our platform with new features. Unlock the platform to gain access!',
                type: 'broadcast'
            },
            {
                title: 'Boosters Active',
                message: 'Task Boosters and Support Boosters are now available. Get 3x earnings today!',
                type: 'broadcast'
            }
        ]);
        console.log('Inserted global notifications for Admin panel.');
        
    })
    .catch(err => console.error(err))
    .finally(() => process.exit(0));
