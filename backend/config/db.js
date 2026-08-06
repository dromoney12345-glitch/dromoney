const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Attempting to connect with URI:', process.env.MONGO_URI);
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Ensure payment entries stay unique (collapse old dupes, then apply indexes)
        try {
            const Payment = require('../models/Payment');
            const { collapseDuplicatePayments } = require('../utils/paymentGuards');
            await collapseDuplicatePayments();
            await Payment.syncIndexes();
            console.log('Payment uniqueness indexes synced');
        } catch (idxErr) {
            console.error('Payment index sync warning:', idxErr.message);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
