const mongoose = require('mongoose');
const AdminBooster = require('./models/Booster');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await AdminBooster.findOneAndUpdate(
        { type: 'task' },
        { 
            $set: { 
                applicableTasks: ['General Tasks', 'Task Quiz', 'Speed Tapper', 'Standard Quiz', 'Memory Master', 'Lucky Draw', 'Scratch Card', 'Treasure Chest', 'Watch & Earn', 'Contests']
            }
        },
        { upsert: true, new: true }
    );
    console.log("Updated task booster applicableTasks with all 10.");
    process.exit(0);
}).catch(console.error);
