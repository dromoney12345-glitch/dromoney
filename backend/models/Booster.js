const mongoose = require('mongoose');

const BoosterSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['support', 'task'], // to identify which one is which in the UI if needed
    },
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    benefits: [{
        type: String,
    }],
    validity: {
        type: String,
        default: '30 Days'
    },
    validityValue: {
        type: Number,
        default: 30
    },
    validityUnit: {
        type: String,
        enum: ['Days', 'Months', 'Years'],
        default: 'Days'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    applicableTasks: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booster', BoosterSchema);
