const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Banner = require('../models/Banner');
const Content = require('../models/Content');

dotenv.config({ path: '../.env' });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const updateAllData = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB...');

        // Update all banners so path is /user/guide/explore-now
        const updateRes = await Banner.updateMany(
            { $or: [{ path: '' }, { path: '/user/home' }, { path: null }, { tag: 'Your Growth' }] },
            { $set: { path: '/user/guide/explore-now', ctaText: 'Explore Now' } }
        );
        console.log('Updated banners count:', updateRes.modifiedCount);

        // Ensure explore_now_guide content is present
        const DEFAULT_EXPLORE_GUIDE = {
            key: 'explore_now_guide',
            title: 'Complete Platform Guide & Growth Steps',
            description: 'Everything you need to know about earning and growing with Dromoney.',
            data: {
                badge: 'YOUR GROWTH OUR GUIDANCE',
                title: 'Complete Platform Guide & Growth Steps',
                subtitle: 'Learn how to maximize your daily income, unlock wallets, and build steady earnings with Dromoney.',
                logoUrl: 'https://res.cloudinary.com/dncw1hfix/image/upload/v1776323215/dromoney/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png',
                ctaText: 'Start Earning Now',
                nextRoute: '/user/earn',
                points: [
                    {
                        title: 'Complete Quick 1-Step KYC Verification',
                        text: 'Verify your Aadhaar details in 1 minute to get full access to Income projects and platform features without any access fee.',
                        icon: 'ShieldCheck'
                    },
                    {
                        title: 'Daily Work & Task Rewards',
                        text: 'Watch short videos, complete offer tasks, and view ads daily. Earnings are credited directly to your matching wallet.',
                        icon: 'ListChecks'
                    },
                    {
                        title: 'Invite Friends & Earn ₹200 Per Referral',
                        text: 'Share your personal invite link with friends. When they complete KYC and set up their withdrawal card, ₹200 is added to your wallet.',
                        icon: 'UserPlus'
                    },
                    {
                        title: 'Unlock Virtual Wallet with Withdrawal Card',
                        text: 'Create your lifetime Withdrawal Card for ₹499 to unlock instant UPI and bank account withdrawals from your Virtual Wallet.',
                        icon: 'CreditCard'
                    },
                    {
                        title: 'Grow Earnings with Future Fund & Boosters',
                        text: 'Active members earn daily passive profit share from the Future Fund pool and can use Boosters to multiply task earnings by 3x.',
                        icon: 'TrendingUp'
                    }
                ]
            }
        };

        await Content.findOneAndUpdate(
            { key: 'explore_now_guide' },
            DEFAULT_EXPLORE_GUIDE,
            { upsert: true, new: true }
        );
        console.log('Successfully updated Explore Now guide content in DB!');
        process.exit(0);
    } catch (err) {
        console.error('Error updating DB:', err);
        process.exit(1);
    }
};

updateAllData();
