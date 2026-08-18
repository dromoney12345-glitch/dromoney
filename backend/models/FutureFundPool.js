const mongoose = require('mongoose');

const FutureFundPoolSchema = new mongoose.Schema({
    date: { type: String, required: true, index: true }, // IST YYYY-MM-DD
    source: {
        type: String,
        enum: ['ad', 'task', 'admin', 'distribution', 'adjustment'],
        required: true,
    },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FutureFundPoolSchema.index({ date: 1, source: 1 });

module.exports = mongoose.model('FutureFundPool', FutureFundPoolSchema);
