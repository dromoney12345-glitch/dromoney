const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a task title']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    coinsReward: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['Social', 'Survey', 'Watch', 'Join', 'Bonus', 'Video', 'Web', 'Quiz', 'Spin', 'Memory', 'Scratch', 'Tapper', 'Treasure', 'Proof', 'Download', 'Sponsored'],
        default: 'Social'
    },
    category: {
        type: String,
        enum: ['Instagram', 'YouTube', 'Telegram', 'WhatsApp', 'Other'],
        required: true
    },
    link: {
        type: String,
        required: [true, 'Please add task link']
    },
    icon: {
        type: String,
        default: 'Monitor'
    },
    config: {
        type: Map,
        of: String
    },
    thumbnail: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    priority: {
        type: Number,
        default: 0
    },
    isDaily: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', TaskSchema);
