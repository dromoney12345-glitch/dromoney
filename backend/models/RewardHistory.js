const mongoose = require('mongoose');

const RewardHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    reward: {
        type: Number,
        required: true,
        default: 5
    },
    adType: {
        type: String,
        default: 'rewarded'
    },
    rewardedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RewardHistory', RewardHistorySchema);
