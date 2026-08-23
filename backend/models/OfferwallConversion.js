const mongoose = require('mongoose');

const OfferwallConversionSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['ayet'],
        default: 'ayet',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    txnId: {
        type: String,
        required: true,
    },
    offerId: {
        type: String,
        default: '',
    },
    offerName: {
        type: String,
        default: '',
    },
    adslotId: {
        type: String,
        default: '',
    },
    payoutUsd: {
        type: Number,
        default: 0,
    },
    currencyAmount: {
        type: Number,
        default: 0,
    },
    creditedInr: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['credited', 'reversed', 'ignored'],
        default: 'credited',
    },
    isChargeback: {
        type: Boolean,
        default: false,
    },
    rawQuery: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ip: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

OfferwallConversionSchema.index({ provider: 1, txnId: 1 }, { unique: true });

module.exports = mongoose.model('OfferwallConversion', OfferwallConversionSchema);
