const mongoose = require('mongoose');

const BusinessIdeaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a business title']
    },
    hindiTitle: {
        type: String,
        default: ''
    },
    subtitle: {
        type: String,
        default: ''
    },
    desc: {
        type: String,
        required: [true, 'Please add a description']
    },
    bannerImage: {
        type: String,
        default: ''
    },
    potentialEarnings: {
        type: String,
        default: ''
    },
    badges: {
        type: [String],
        default: ['Trending']
    },
    videoUrl: {
        type: String,
        default: ''
    },
    meetingLink: {
        type: String,
        default: ''
    },
    // Free by default — idea content / Support Hub open without pay.
    // Admin can set isPremium:true + price > 0 later for paid-only ideas.
    isPremium: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    ecosystemCards: {
        type: [{
            id: { type: String },           // 'daily-plan', 'new-updates', 'tools-contact', 'calculation'
            title: { type: String },
            description: { type: String, default: '' }
        }],
        default: [
            { id: 'daily-plan',      title: 'डेली प्लान',        description: '' },
            { id: 'new-updates',     title: 'न्यू अपडेट्स',       description: '' },
            { id: 'tools-contact',   title: 'टूल्स एंड कांटेक्ट', description: '' },
            { id: 'calculation',     title: 'कैलकुलेशन',          description: '' }
        ]
    },
    // New fields for the 3 Business Details cards
    howItWorks: { type: String, default: '' },
    investmentDetails: { type: String, default: '' },
    profitDetails: { type: String, default: '' },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BusinessIdea', BusinessIdeaSchema);
