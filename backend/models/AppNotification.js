const mongoose = require('mongoose');

const AppNotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'broadcast', 'system', 'reward', 'alert'],
        default: 'info',
    },
    step: { type: String, default: '' },
    link: { type: String, default: '/user/home' },
    isRead: { type: Boolean, default: false },
    dedupeKey: { type: String, default: '', index: true },
}, {
    timestamps: true,
});

AppNotificationSchema.index({ user: 1, createdAt: -1 });
AppNotificationSchema.index({ user: 1, dedupeKey: 1 });

module.exports = mongoose.model('AppNotification', AppNotificationSchema);
