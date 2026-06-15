const mongoose = require('mongoose');
const Booster = require('./models/Booster');
require('dotenv').config();

const INITIAL_BOOSTERS = [
    {
        type: 'support',
        title: '₹21 Event Support Kit',
        subtitle: 'Get guided assistance in events!',
        price: 21,
        benefits: ['Guided Assistance', 'Performance Support', 'Success Edge'],
        isActive: true
    },
    {
        type: 'task',
        title: '₹49 Daily Boost Pass',
        subtitle: 'Boost performance & processing!',
        price: 49,
        benefits: ['Task Efficiency (Up to 3X)', 'Fast Rewards', 'Priority Processing'],
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
