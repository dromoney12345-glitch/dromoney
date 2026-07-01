const mongoose = require('mongoose');
const Booster = require('./models/Booster');
require('dotenv').config();

const INITIAL_BOOSTERS = [
    {
        type: 'support',
        title: '₹21 Event Booster',
        subtitle: 'Event-specific booster (expires when event ends)',
        price: 21,
        benefits: ['Extra 3 Seconds in Games', 'Guided Assistance in Events', 'Priority Event Access'],
        isActive: true
    },
    {
        type: 'task',
        title: '₹49 Power Booster',
        subtitle: '12x speed earning for 24 Hours!',
        price: 49,
        benefits: ['12X Coins on Tasks & Ads', 'Fast Rewards Processing', 'Priority Task Verification'],
        isActive: true
    }
];

const seedBoosters = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for Booster Seeding...');

        // Clear existing
        await Booster.deleteMany({ type: { $in: ['support', 'task'] } });

        // Insert new
        await Booster.insertMany(INITIAL_BOOSTERS);

        console.log('✔ Initial Boosters Seeded Successfully!');
        process.exit();
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

seedBoosters();
