const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add an ad title']
    },
    videoUrl: {
        type: String,
        required: [true, 'Please add video URL']
    },
    thumbnailUrl: {
        type: String,
        required: [true, 'Please add thumbnail URL']
    },
    duration: {
        type: Number, // in seconds
        required: [true, 'Please add duration']
    },
    coinsReward: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Archived'],
        default: 'Active'
    },
    viewCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ad', AdSchema);
