const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Content = require('../models/Content');

dotenv.config({ path: '../.env' });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const HELP_GUIDE_DATA = {
    key: 'menu_help_guides',
    title: 'Help Guide',
    description: 'Basic Platform Usage',
    data: {
        title: 'Help Guide',
        subtitle: 'Basic Platform Usage',
        sections: [
            { q: "How to earn real money on Dromoney?", a: "You can earn by completing daily tasks, participating in exclusive affiliate projects, and referring your friends to the platform." },
            { q: "How to withdraw my earnings?", a: "Go to your Profile, click on Withdraw, enter your bank/UPi details (after KYC), and submit the request. Payouts are usually processed within 24-48 hours." },
            { q: "What is the use of Coins?", a: "Coins are reward points earned from daily tasks. You can convert these coins into real cash once you reach the minimum threshold, or use them to unlock premium features." },
            { q: "Why is KYC mandatory?", a: "KYC is required to prevent fraud and ensure that payouts are sent to verified users. It is a one-time process involving your ID and base details." },
            { q: "How do Boosters work?", a: "Boosters increase your earning potential. For example, the Task Booster can triple your coin earnings, while the Support Booster gives you priority in events." }
        ]
    }
};

const seedHelpGuideContent = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('MongoDB Connected for CMS Seeding...');

        // Delete existing if any and create new
        await Content.deleteOne({ key: 'menu_help_guides' });
        await Content.create(HELP_GUIDE_DATA);

        console.log('Successfully seeded Help Guide data into Content CMS!');
        process.exit();
    } catch (error) {
        console.error('Error seeding Content CMS', error);
        process.exit(1);
    }
};

seedHelpGuideContent();
