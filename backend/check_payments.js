const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('./models/Payment');
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const payments = await Payment.find();
        let i = 0;
        for (let p of payments) {
            console.log(`Payment [${i++}]: ID=${p._id} userRef=${p.user} userName=${p.userName}`);
            if (p.user) {
                const user = await User.findById(p.user);
                console.log(`  -> found user? ${!!user}`);
            } else {
                console.log(`  -> user ref is missing`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
