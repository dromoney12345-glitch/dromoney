const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Content = require('../models/Content');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const EXPLORE_GUIDE_DATA = {
    key: 'explore_now_guide',
    title: 'Complete Platform Guide & Growth Steps',
    description: 'Learn how to maximize your daily income, unlock wallets, and build steady earnings with Dromoney.',
    data: {
        badge: 'YOUR GROWTH OUR GUIDANCE',
        title: 'Complete Platform Guide & Growth Steps',
        subtitle: 'Learn how to maximize your daily income, unlock wallets, and build steady earnings with Dromoney.',
        logoUrl: 'https://res.cloudinary.com/dncw1hfix/image/upload/v1776323215/dromoney/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png',
        ctaText: 'Start Earning Now',
        nextRoute: '/user/earn',
        content: `🚀 Dromoney कैसे काम करता है?
❇️ Dromoney में आपका स्वागत है! Dromoney एक Learning, Part-Time Opportunity, Business Guidance और Support Platform है। यहाँ यूजर नई चीज़ें सीख सकता है, Part-Time Opportunities को समझ सकता है, Business Ideas देख सकता है, SHME Ecosystem के माध्यम से अपना बिज़नेस शुरू करने की जानकारी प्राप्त कर सकता है और Community Activities में भाग ले सकता है।

⚠️ Dromoney किसी भी प्रकार की निश्चित कमाई (Guaranteed Income), निश्चित लाभ (Guaranteed Profit) या व्यवसाय में सफलता की गारंटी नहीं देता। परिणाम प्रत्येक यूजर की मेहनत, कौशल, भागीदारी और परिस्थितियों पर निर्भर करते हैं।

📱 1. Account बनाएं & KYC करें
Dromoney इस्तेमाल करने के लिए सबसे पहले Account बनाना होता है। आप Mobile Number और OTP से Login कर सकते हैं। इसके बाद अपना 1-Step Aadhaar Verification पूरा करके सभी इनकम प्रोजेक्ट्स का फ्री एक्सेस अनलॉक करें।

🏠 2. Home Page & Opportunities
Login करने के बाद Home Page दिखाई देता है। यहाँ आपको मिलता है:
• 🎯 Part-Time Income Modules & Daily Tasks
• 💼 Business Content & Exclusive Ideas
• 🚀 Future Fund & Growth Boosters
• 🎁 Daily Quizzes, Video Watching & Rewards
• 👥 Community Guidelines & Help Desk

👥 3. Invite Friends & Referrals
अपना पर्सनल रेफरल लिंक दोस्तों के साथ शेयर करें। जब वे KYC पूरा करके विड्रॉल कार्ड बनाते हैं, तो आपके वॉलेट में रेफरल रिवॉर्ड इंसटेंट ऐड हो जाता है।

💼 4. Part-Time Income & Business Guidance
Dromoney Users को अलग-अलग प्रकार की Opportunities को Explore करने का मौका देता है। आप Daily Tasks, Video Watching, Quizzes, Brand Promotion और Refer & Earn के माध्यम से Rewards Earn कर सकते हैं।

💳 5. Withdrawal & Security
कमाई हुई राशि को आप अपने Bank Account या UPI में आसानी से विड्रॉ कर सकते हैं। लाइफटाइम विड्रॉल कार्ड अनलॉक करके डायरेक्ट पेआउट्स प्राप्त करें। Withdrawal के लिए KYC Verification और Security Protocol का पालन करना अनिवार्य है।`,
        points: []
    }
};

const seedExploreGuide = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('MongoDB Connected for Seeding Explore Guide...');

        await Content.deleteOne({ key: 'explore_now_guide' });
        await Content.create(EXPLORE_GUIDE_DATA);

        console.log('Successfully seeded explore_now_guide into Content CMS!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding Explore Guide data', error);
        process.exit(1);
    }
};

seedExploreGuide();

