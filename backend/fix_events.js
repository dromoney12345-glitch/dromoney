require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const res = await Event.updateMany(
            { prize: { $in: ['₹100', '₹500', '100', '500'] } },
            { $set: { prize: '50%' } }
        );
        console.log('Fixed:', res);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
fix();
