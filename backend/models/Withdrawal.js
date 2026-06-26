const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Please add withdrawal amount'],
        min: [100, 'Minimum withdrawal is ₹100']
    },
    paymentMethod: {
        type: String,
        enum: ['Bank Transfer', 'UPI', 'Wallet'],
        default: 'Bank Transfer'
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        holderName: String,
        bankName: String,
        upiId: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Approved', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: String,
    transactionHash: String, // For proof of payment
    transaction: {
        type: mongoose.Schema.ObjectId,
        ref: 'Transaction'
    },
    feeTransaction: {
        type: mongoose.Schema.ObjectId,
        ref: 'Transaction'
    },
    processedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
