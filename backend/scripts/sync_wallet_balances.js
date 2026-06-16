const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const syncBalances = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB for syncing balances');

        const users = await User.find({});
        console.log(`Found ${users.length} users. Calculating true balances...`);

        for (const user of users) {
            const inrTxs = await Transaction.find({ user: user._id, currency: 'INR' });
            
            let totalCredit = 0;
            let totalDebit = 0;

            for (const tx of inrTxs) {
                if (tx.status === 'Failed' || tx.status === 'Declined') continue; 
                if (tx.type === 'credit' && tx.status === 'Success') {
                    totalCredit += tx.amount;
                } else if (tx.type === 'withdrawal' && tx.status === 'Success') {
                    totalDebit += tx.amount;
                }
            }

            const trueBalance = totalCredit - totalDebit;
            
            // It's possible balance is negative if there were manual admin debits or old logic issues.
            // But we will strictly sync to history.
            if (!user.wallet) user.wallet = {};
            user.wallet.balance = trueBalance;
            user.wallet.lifetimeEarnings = totalCredit;
            // todayEarnings might be hard to calculate accurately without date, we can just leave it or zero it.
            
            await user.save();
        }

        console.log('Finished syncing all user balances based on history!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncBalances();
