const mongoose = require('mongoose');
const AdminBooster = require('./models/Booster');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Remove Watch & Earn from Task Booster unless admin re-enables it in Marketing
    const result = await AdminBooster.updateOne(
        { type: 'task' },
        { $pull: { applicableTasks: { $in: ['Watch & Earn', 'Watch and Earn', 'Watch'] } } }
    );

    const task = await AdminBooster.findOne({ type: 'task' });
    console.log('Pull modified:', result.modifiedCount);
    console.log('Task booster applicableTasks now:', task?.applicableTasks);
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
