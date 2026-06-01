const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for fix script');
    } catch (error) {
        console.error('Connection error:', error.message);
        process.exit(1);
    }
};

const fixMissingPaymentTransactions = async () => {
    await connectDB();

    try {
        // Find all successful payments
        const successfulPayments = await Payment.find({ status: 'Success' });
        console.log(`Found ${successfulPayments.length} successful payments. Checking for missing transactions...`);

        let createdCount = 0;

        for (const payment of successfulPayments) {
            let sourceLabel = payment.plan || 'Platform Unlock';
            if (payment.paymentType === 'SUPPORT_BOOSTER' || payment.paymentType === 'TASK_BOOSTER') {
                sourceLabel = payment.plan || (payment.paymentType === 'SUPPORT_BOOSTER' ? 'Support Booster' : 'Task Booster');
            } else if (payment.paymentType === 'BUSINESS_IDEA_UNLOCK') {
                sourceLabel = payment.plan || 'Business Idea Unlock';
            }

            const paymentDate = payment.processedAt || payment.updatedAt || payment.createdAt;
            
            // Look for existing transaction to avoid duplicates
            // We check by user, type, amount and source
            const existingTx = await Transaction.findOne({
                user: payment.user,
                type: 'debit',
                amount: payment.amount,
                source: sourceLabel
            });

            if (!existingTx) {
                // Create the missing transaction
                await Transaction.create({
                    user: payment.user,
                    type: 'debit',
                    currency: 'INR',
                    amount: payment.amount,
                    source: sourceLabel,
                    status: 'Success',
                    date: paymentDate
                });
                createdCount++;
                console.log(`Created missing transaction for user ${payment.user} - Amount: ${payment.amount} - Source: ${sourceLabel}`);
            }
        }

        console.log(`\nScript complete! Created ${createdCount} missing transactions.`);
        process.exit(0);
    } catch (err) {
        console.error('Error during script execution:', err);
        process.exit(1);
    }
};

fixMissingPaymentTransactions();
