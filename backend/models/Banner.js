const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    tag: {
        type: String,
        required: [true, 'Please add a tag (e.g., Live Contest)'],
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
    },
    subtitle: {
        type: String,
        required: [true, 'Please add a subtitle'],
    },
    gradient: {
        type: String,
        default: 'from-sky-500 to-sky-700',
    },
    iconName: {
        type: String,
        default: 'TrendingUp', // Will be mapped in frontend (e.g., Trophy, Users, Zap) 
    },
    ctaText: {
        type: String,
        default: 'View Offer',
    },
    path: {
        type: String,
        default: '/user/events',
    },
    imageUrl: {
        type: String,
        default: '',
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

module.exports = mongoose.model('Banner', BannerSchema);
