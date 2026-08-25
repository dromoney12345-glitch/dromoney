const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    message: {
        type: String,
        required: [true, 'Please add a message']
    },
    type: {
        type: String,
        enum: ['broadcast', 'system', 'reward', 'alert'],
        default: 'broadcast'
    },
    audience: {
        type: String,
        enum: ['all', 'selected', 'user'],
        default: 'all',
    },
    userIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
    }],
    recipients: {
        type: Number,
        default: 0
    },
    targetUrl: {
        type: String
    },
    scheduledAt: {
        type: Date,
        default: null,
    },
    sentAt: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sent'],
        default: 'sent',
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
