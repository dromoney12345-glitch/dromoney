const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: false, // Allow null when user is deleted (orphaned payment)
    },
    // Snapshot of user info at time of payment — preserved even if user is deleted
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    userPhone: { type: String, default: '' },
    plan: {
        type: String,
        default: 'Lifetime Access',
    },
    paymentType: {
        type: String,
        enum: ['PLATFORM_UNLOCK', 'BUSINESS_IDEA_UNLOCK', 'SUPPORT_CHAT_RENEWAL', 'SUPPORT_BOOSTER', 'TASK_BOOSTER', 'BUSINESS_HUB_PLAN'],
        default: 'PLATFORM_UNLOCK'
    },
    planDuration: {
        type: String,
        default: 'Monthly'
    },
    durationInDays: {
        type: Number,
        default: 30
    },
    businessIdea: {
        type: mongoose.Schema.ObjectId,
        ref: 'BusinessIdea'
    },
    amount: {
        type: Number,
        required: true,
    },
    method: {
        type: String,
        default: 'Razorpay',
    },
    // Razorpay fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    // Legacy UTR (for old manual payments)
    utrNumber: { type: String },
    screenshot: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Success', 'Failed'],
        default: 'Pending',
    },
    remarks: String,
    processedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
