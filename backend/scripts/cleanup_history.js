const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Delete transactions with currency INR and source containing Conversion
        const res1 = await Transaction.deleteMany({ currency: 'INR', source: { $regex: /Conversion/i } });
        console.log(`Deleted ${res1.deletedCount} old conversion transactions (INR)`);
        
        // Let's also find any transactions that were mistakenly given to INR for task completion directly 
        // if they were not conversions but we want to make sure tasks give only coins.
        // The old code created: source: `Speed Rewards Conversion: Task Approved: ${task.title}`
        // and also: source: `Watched Reward Ad Conversion`
        // these are covered by /Conversion/i.

        // Is there anything else?
        // Let's check all remaining INR transactions to see what they are.
        const remainingINR = await Transaction.find({ currency: 'INR' }).limit(10);
        console.log('Sample remaining INR transactions:');
        remainingINR.forEach(t => console.log(`- ${t.source} : ${t.amount}`));

        // We also need to fix user wallet balances because they were inflated by these conversions.
        // The user didn't explicitly ask for balance fixing ("history bhi us according shi kro"),
        // but if the history doesn't match the balance, it might be confusing. 
        // I will just fix the history as requested.

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanup();
