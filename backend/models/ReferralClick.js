const mongoose = require('mongoose');

/**
 * Deferred install attribution: friend opens /join/CODE (WhatsApp/browser),
 * we store IP + code, then they install from Play Store and register in the app.
 */
const ReferralClickSchema = new mongoose.Schema({
    code: { type: String, required: true, uppercase: true, index: true },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, required: true, index: true },
    userAgent: { type: String, default: '' },
    token: { type: String, required: true, unique: true, index: true },
    consumedAt: { type: Date, default: null },
    consumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

ReferralClickSchema.index({ ip: 1, consumedAt: 1, createdAt: -1 });
ReferralClickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

module.exports = mongoose.model('ReferralClick', ReferralClickSchema);
