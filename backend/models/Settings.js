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
    contactPhone: {
        type: String,
        default: '+91 9876543210'
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
        default: 'BHARATPE2R0P0Z7W3H84355@unitype'
    },
    qrScannerImage: {
        type: String,
        default: '/payment-qr.png'
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
        default: ''
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
    offerwallEnabled: {
        type: Boolean,
        default: false
    },
    offerwallUserSharePercent: {
        type: Number,
        default: 100
    },
    
    // Future Fund Rules & Targets
    futureFundKycTarget: { type: Number, default: 10 },
    futureFundSalesTarget: { type: Number, default: 10 },
    futureFundDaysTarget: { type: Number, default: 7 },
    futureFundActivityMinutes: { type: Number, default: 15 },
    futureFundDailyTasksTarget: { type: Number, default: 50 },
    futureFundWatchAdTarget: { type: Number, default: 50 },
    futureFundEventsTarget: { type: Number, default: 3 },
    futureFundBoostersTarget: { type: Number, default: 1 },
    
    // Task Window Timings
    taskWindowStart: { type: String, default: '00:00' },
    taskWindowEnd: { type: String, default: '23:59' },

    // KYC Window Timings
    kycWindowStart: { type: String, default: '07:00' },
    kycWindowEnd: { type: String, default: '19:00' },

    // Task Renewal Setting
    taskRenewalHours: { type: Number, default: 24 },

    // Future Fund Profit Distribution Tiers
    ffTier1TasksLimit: { type: Number, default: 5 },
    ffTier1AdsLimit: { type: Number, default: 5 },
    ffTier1ProfitPercent: { type: Number, default: 60 },
    ffTier2ProfitPercent: { type: Number, default: 40 },
    
    // Future Fund Activity Score Weights
    ffAdScoreWeight: { type: Number, default: 1 },
    ffTaskScoreWeight: { type: Number, default: 1 },
    ffBoosterMultiplier: { type: Number, default: 1.5 },

    // Future Fund Pool
    futureFundPoolPercent: { type: Number, default: 30 },
    adRevenuePerView: { type: Number, default: 0.5 },
    taskRevenuePerTask: { type: Number, default: 1.0 },
    taskUserEarningPercent: { type: Number, default: 66 },

    // Withdrawal Card renewal display
    cardRenewalAmount: { type: Number, default: 199 },
    cardRenewalDisplayAmount: { type: Number, default: 699 },
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
