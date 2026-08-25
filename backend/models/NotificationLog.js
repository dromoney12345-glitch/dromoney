const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
    notificationId: { 
        type: String, 
        unique: true, 
        required: true 
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    tokens: [String],
    title: String,
    body: String,
    status: {
        type: String,
        default: 'Sent'
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
    }
});

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
