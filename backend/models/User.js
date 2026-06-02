const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    password: {
        type: String,
        required: false,
        select: false,
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
    },
    isPaid: {
        type: Boolean,
        default: false, // Platform unlock status
    },
    hasCompletedCourse: {
        type: Boolean,
        default: false,
    },
    unlockedAt: {
        type: Date,
    },
    isBoosterActive: {
        type: Boolean,
        default: false,
    },
    boosterExpiry: {
        type: Date,
    },
    // Distinguished Booster States
    isSupportBoosterActive: {
        type: Boolean,
        default: false,
    },
    supportBoosterExpiry: {
        type: Date,
    },
    isTaskBoosterActive: {
        type: Boolean,
        default: false,
    },
    taskBoosterExpiry: {
        type: Date,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    profileImage: {
        type: String,
        default: 'https://res.cloudinary.com/dncw1hfix/image/upload/v1776323215/dromoney/default_avatar.svg',
    },
    // Financial Data
    wallet: {
        balance: { type: Number, default: 0 },
        lifetimeEarnings: { type: Number, default: 0 },
        todayEarnings: { type: Number, default: 0 },
        referralEarnings: { type: Number, default: 0 },
    },
    coins: {
        balance: { type: Number, default: 0 },
        lifetimeCoins: { type: Number, default: 0 },
    },
    // Referral Data
    referralCode: {
        type: String,
        unique: true,
    },
    referredBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
    },
    referralCount: {
        type: Number,
        default: 0,
    },
    // KYC Data
    kyc: {
        status: {
            type: String,
            enum: ['Not Started', 'Pending', 'Verified', 'Rejected', 'Approved'],
            default: 'Not Started',
        },
        documentType: String,
        documentNumber: String,
        documentImage: String,
        rejectionReason: String,
    },
    // Future Fund Progress
    futureFund: {
        status: { type: String, enum: ['locked', 'active'], default: 'locked' },
        progress: { type: Number, default: 0 },
        criteria: [{
            id: Number,
            title: String,
            target: Number,
            current: { type: Number, default: 0 },
            completed: { type: Boolean, default: false }
        }]
    },
    unlockedIdeas: [{
        type: mongoose.Schema.ObjectId,
        ref: 'BusinessIdea'
    }],
    watchedAds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Ad'
    }],
    nextAdAvailableAt: {
        type: Date,
        default: null
    },
    dailyAdCount: {
        type: Number,
        default: 0
    },
    lastAdCountResetAt: {
        type: Date,
        default: Date.now
    },
    businessHubFirstAccessedAt: {
        type: Date
    },
    supportExpiry: {
        type: Date
    },
    activeBusinessPlan: {
        type: String,
        default: 'Free'
    },
    businessPlanStatus: {
        type: String,
        enum: ['active', 'expired', 'none'],
        default: 'none'
    },
    fcmTokens: [String], // Web tokens
    fcmTokenMobile: [String], // Mobile tokens
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    completedTasks: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Task'
    }],
    dailyTaskCompletions: [{
        taskId: {
            type: mongoose.Schema.ObjectId,
            ref: 'Task'
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    notifications: [{
        title: String,
        message: String,
        type: { type: String, default: 'info' },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Encrypt password using bcrypt (Modern Async implementation)
UserSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate referral code before saving (Modern Async implementation)
UserSchema.pre('save', async function () {
    if (!this.referralCode) {
        this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
});

module.exports = mongoose.model('User', UserSchema);
