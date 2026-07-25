const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('./models/Payment');
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const payments = await Payment.find();
        let deletedCount = 0;
        for (let p of payments) {
            const user = await User.findById(p.user);
            if (!user) {
                console.log('Deleting orphaned payment: ', p._id);
                await Payment.findByIdAndDelete(p._id);
                deletedCount++;
            }
        }
        console.log(`Finished. Deleted ${deletedCount} orphaned payments.`);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
