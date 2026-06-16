const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Content = require('../models/Content');

dotenv.config();

const seedData = [
    {
        key: 'income_projects',
        title: 'Premium Income Projects',
        description: 'Access exclusive high-ticket affiliate projects and scale your monthly income with verified strategies.',
        data: {
            title: 'Dromoney Premium Projects',
            description: 'Enroll in state-of-the-art affiliate projects curated for high-velocity earnings.'
        }
    },
    {
        key: 'menu_future_features',
        title: 'Future and Option',
        description: 'Upcoming earning opportunities scheduled for release soon.',
        data: [
            { title: 'Dromoney Marketplace', text: 'Buy and sell digital assets directly within our ecosystem using wallet balance.' },
            { title: 'Global Payouts', text: 'Expansion beyond local banking to support international earners through crypto and PayPal.' },
            { title: 'Advanced AI Tools', text: 'Get automated marketing kits generated for your affiliate links for 10x better results.' }
        ]
    }
];

const seedMarketing = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        for (const item of seedData) {
            await Content.findOneAndUpdate(
                { key: item.key },
                item,
                { upsert: true, new: true }
            );
            console.log(`Seeded: ${item.key}`);
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedMarketing();
