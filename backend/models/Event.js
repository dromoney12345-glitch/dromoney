const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    tag: {
        type: String,
        required: [true, 'Please add a tag (e.g. Quiz, Draw, Prediction)'],
        enum: ['Quiz', 'Draw', 'Prediction', 'Brain', 'Tapper', 'Scratch']
    },
    description: {
        type: String
    },
    fee: {
        type: Number,
        default: 0
    },
    prize: {
        type: String,
        required: [true, 'Please add a prize description']
    },
    startTime: {
        type: String,
        default: 'Live Now'
    },
    participantsCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Draft', 'Closed', 'Coming Soon', 'Inactive'],
        default: 'Active'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isMega: {
        type: Boolean,
        default: false
    },
    totalCashPoolINR: {
        type: Number,
        default: 0
    },
    // Configuration for specific types
    config: {
        // For Quiz
        questions: [{
            question: String,
            options: [String],
            answer: Number // Index of correct option
        }],
        // For Draw
        prizes: [{
            label: String,
            coins: Number,
            cash: Number
        }],
        fixedWinningPrizeIndex: { type: Number, default: null }, // Added for fixed winning ticket in Lucky Draw
        // For Memory
        cards: [{
            icon: String,
            color: String
        }],
        peekTime: Number,
        maxTime: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', EventSchema);
