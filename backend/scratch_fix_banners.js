const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';
const Banner = require('./models/Banner');

const fixBanners = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);

        // Update Booster Banner
        await Banner.updateOne(
            { tag: '3X Booster Active' },
            { $set: { path: '/user/home' } }
        );

        // Update Contest Banner
        await Banner.updateOne(
            { tag: 'Live Contest' },
            { $set: { path: '/user/events' } }
        );
        
        // Update Affiliate Banner
        await Banner.updateOne(
            { tag: 'Affiliate Program' },
            { $set: { path: '/user/income-info' } }
        );

        console.log('Banners updated successfully!');
        process.exit();
    } catch (error) {
        console.error('Error', error);
        process.exit(1);
    }
};

fixBanners();
