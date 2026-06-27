const mongoose = require('mongoose');
const AdminBooster = require('./models/Booster');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB.");

    await AdminBooster.findOneAndUpdate(
        { type: 'support' },
        { 
            $set: { 
                benefits: [
                    'Extra 3 Seconds in Games',
                    'Guided Assistance in Events',
                    'Priority Event Access'
                ],
                applicableTasks: ['Speed Tapper', 'Standard Quiz', 'Memory Master', 'Lucky Draw']
            }
        },
        { upsert: true, new: true }
    );
    console.log("Updated support booster.");

    await AdminBooster.findOneAndUpdate(
        { type: 'task' },
        { 
            $set: { 
                benefits: [
                    '3X Coins on Tasks',
                    'Fast Rewards Processing',
                    'Priority Task Verification'
                ],
                applicableTasks: ['General Tasks', 'Task Quiz']
            }
        },
        { upsert: true, new: true }
    );
    console.log("Updated task booster.");

    process.exit(0);
}).catch(console.error);
