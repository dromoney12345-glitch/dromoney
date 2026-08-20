const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Banner = require('../models/Banner');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const seedBanners = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('MongoDB connected for Banners update...');

        await Banner.deleteMany({});
        await Banner.create([
            {
                tag: 'Your Growth',
                title: 'Our Guidance',
                subtitle: 'Dromoney is your trusted platform to learn, grow and earn online with smart opportunities.',
                gradient: 'from-amber-400 to-orange-500',
                iconName: 'Sparkles',
                ctaText: 'Explore Now',
                path: '/user/guide/explore-now',
                imageUrl: '',
                isActive: true
            },
            {
                tag: 'Live Contest',
                title: 'Free - Win Up To ₹500',
                subtitle: 'Join the Mega Jackpot Night - limited seats, big rewards!',
                gradient: 'from-emerald-500 to-teal-600',
                iconName: 'Trophy',
                ctaText: 'Join Event',
                path: '/user/events',
                imageUrl: '',
                isActive: false
            }
        ]);

        console.log('Successfully set default Home Banner in MongoDB!');
        process.exit(0);
    } catch (err) {
        console.error('Error updating banners:', err);
        process.exit(1);
    }
};

seedBanners();
