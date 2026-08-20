const mongoose = require('mongoose');

const IdempotencyKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    endpoint: {
        type: String,
        required: true
    },
    requestHash: {
        type: String,
        default: ''
    },
    responseStatus: {
        type: Number,
        default: null
    },
    responseHeaders: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    responseBody: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    inFlight: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: Number(process.env.IDEMPOTENCY_TTL_SECONDS) || 86400 // Automatically delete after TTL (default 24h)
    }
});

module.exports = mongoose.model('IdempotencyKey', IdempotencyKeySchema);
