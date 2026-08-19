const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const Banner = require('../models/Banner');

const seedBanners = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);

        console.log('MongoDB Connected to Seeder...');

        await Banner.deleteMany();
        console.log('Cleared existing banners...');

        const bannersData = [
            {
                tag: 'Your Growth',
                title: 'Our Guidance',
                subtitle: 'Dromoney is your trusted platform to learn, grow and earn online with smart opportunities.',
                ctaText: 'Explore Now',
                path: '/user/home',
                imageUrl: '',
                isActive: true,
            },
        ];

        await Banner.insertMany(bannersData);

        console.log('Successfully seeded home hero banner!');
        process.exit();
    } catch (error) {
        console.error('Error with data import', error);
        process.exit(1);
    }
};

seedBanners();
