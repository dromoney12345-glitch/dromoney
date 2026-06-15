const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // General
    appName: {
        type: String,
        default: 'Dromoney'
    },
    contactEmail: {
        type: String,
        default: 'app@dromoney.com'
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    registrationOpen: {
        type: Boolean,
        default: true
    },
    
    // Payments
    adminUpiId: {
        type: String,
        default: 'dromoney@upi'
    },
    bankDetails: {
        type: String,
        default: 'A/C No: 12345678, IFSC: SBIN0001234, Bank: State Bank of India'
    },
    registrationFee: {
        type: Number,
        default: 499
    },
    
    // Business Hub Settings (Multiple Plans)
    businessPlans: [{
        title: { type: String, default: 'Pro Membership' },
        subtitle: { type: String, default: 'अपना बिजनेस शुरू करें...' },
        price: { type: Number, default: 499 },
        duration: { type: String, default: '/ Yearly' },
        durationInDays: { type: Number, default: 30 },
        benefits: [{
            title: { type: String, default: '' },
            subtitle: { type: String, default: 'Premium Benefit unlocked' },
            iconType: { type: String, default: 'support' },
            colorType: { type: String, default: 'emerald' }
        }]
    }],
    
    // Earnings
    adCooldownSeconds: {
        type: Number,
        default: 30
    },
    adMaxDailyLimit: {
        type: Number,
        default: 10
    },
    referralSystemEnabled: {
        type: Boolean,
        default: true
    },
    referralLinkBaseUrl: {
        type: String,
        default: 'https://earningapp.com/join/'
    },
    referralCommission: {
        type: Number,
        default: 200
    },
    adRewardCoins: {
        type: Number,
        default: 5
    },
    coinRate: {
        type: Number,
        default: 0.10
    },
    maxCoinsPerDay: {
        type: Number,
        default: 100
    },
    minWithdrawal: {
        type: Number,
        default: 100
    },
    
    // Auth
    adminEmail: {
        type: String,
        default: 'admin@dromoney.com'
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);
