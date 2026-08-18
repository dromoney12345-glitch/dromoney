const mongoose = require('mongoose');

const ReferralTransactionSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referredUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

// Prevent duplicate rewards for the same referred user
ReferralTransactionSchema.index({ referredUser: 1 }, { unique: true });

module.exports = mongoose.model('ReferralTransaction', ReferralTransactionSchema);
