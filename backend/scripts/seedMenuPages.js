const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const Content = require('../models/Content');

const DEFAULT_CONTENT = {
    'how-it-works': {
        title: 'How It Works',
        subtitle: 'Master the Dromoney Platform',
        sections: [
            { title: '1. Register & Verify', text: 'Create your account and complete a simple KYC to unlock all earning features safely. Your identity is verified through Aadhaar/PAN to ensure platform security and prevent fraud.' },
            { title: '2. Explore Opportunities', text: 'Browse through affiliate projects, daily tasks, and exclusive business ideas tailored for you. Choose from multiple income streams based on your skills and interests.' },
            { title: '3. Start Earning', text: 'Complete tasks or refer partners to accumulate coins and real cash in your dashboard. Track your progress in real-time and watch your earnings grow.' },
            { title: '4. Instant Payouts', text: 'Withdraw your earnings directly to your bank account with our secure payment gateway. Get paid within 7 days with 100% transparency and zero hidden charges.' }
        ]
    },
    'benefits': {
        title: 'User Benefits',
        subtitle: 'Why choose Dromoney?',
        sections: [
            { title: 'Financial Freedom', text: 'Access multiple income streams that you can manage from anywhere in the world. Earn at your own pace without any fixed targets or pressure.' },
            { title: 'Skill Development', text: 'Learn marketing and business strategies through our verified project frameworks. Get certified and build a portfolio that enhances your professional value.' },
            { title: 'Safe & Secure', text: 'Your data and earnings are protected by industry-leading security protocols. We use encryption and comply with all data protection regulations.' },
            { title: 'Community Support', text: 'Join thousands of earners and get 24/7 assistance from our expert team. Share experiences and learn from successful community members.' }
        ]
    },
    'support': {
        title: 'Support Center',
        subtitle: 'We are here to help you 24/7',
        sections: [
            { title: 'Direct Assistance', text: 'Chat with our support executives for any technical or payment related queries.' },
            { title: 'Knowledge Base', text: 'Read our guides and FAQs to solve common issues instantly without waiting.' },
            { title: 'Email Support', text: 'For complex issues, reach us at support@dromoney.com for detailed resolutions.' }
        ]
    },
    'about': {
        title: 'About Dromoney',
        subtitle: 'Empowering Digital Earners',
        sections: [
            { title: 'Our Mission', text: 'To provide a transparent and efficient platform where everyone can monetize their digital presence. We believe in fair compensation and equal opportunities for all users.' },
            { title: 'The Platform', text: 'Dromoney is India\'s fastest growing affiliate and task-based earning ecosystem. We connect brands with genuine users and creators for authentic marketing campaigns.' },
            { title: 'Transparency', text: 'We believe in fairness. Every payout and task is tracked with 100% precision. Our blockchain-verified system ensures no user is ever cheated.' }
        ]
    },
    'privacy': {
        title: 'Privacy Policy (गोपनीयता नीति)',
        subtitle: 'Your Data Privacy & Security',
        sections: [
            {
                title: 'A. डेटा जो हम इकट्ठा करते हैं (Data We Collect)',
                text: '• व्यक्तिगत जानकारी: आपका नाम, फोन नंबर, और ईमेल एड्रेस。\n• KYC डेटा: आधार कार्ड/पैन कार्ड की जानकारी (केवल आपकी पहचान सत्यापित करने और धोखाधड़ी रोकने के लिए)।\n• बैंक विवरण: विड्रॉल भेजने के लिए आपके द्वारा दी गई बैंक जानकारी。\n• डिवाइस जानकारी: आपका IP एड्रेस और डिवाइस ID (ताकि एक फोन में एक ही अकाउंट चले)。'
            },
            {
                title: 'B. डेटा का उपयोग (How We Use Data)',
                text: '• आपके वॉलेट में पैसे भेजने और केवाईसी (KYC) वेरिफिकेशन के लिए。\n• विज्ञापनों और टास्क की सत्यता की जांच करने के लिए。\n• ऐप की सुरक्षा बढ़ाने और स्पैम रोकने के लिए।'
            },
            {
                title: 'C. डेटा सुरक्षा (Data Security)',
                text: 'हम आपका डेटा किसी भी तीसरी पार्टी को नहीं बेचते हैं। आपका डेटा हमारे सुरक्षित सर्वर पर एन्क्रिप्टेड (Encrypted) रूप में रहता है।'
            },
            {
                title: 'D. थर्ड पार्टी सर्विसेज (Third-Party Services)',
                text: 'हम भुगतान के लिए Razorpay और विज्ञापनों के लिए AdMob/Google Ads का उपयोग करते हैं। वे अपनी पॉलिसी के अनुसार आपका डेटा प्रोसेस कर सकते हैं।'
            }
        ]
    },
    'terms': {
        title: 'Terms & Conditions',
        subtitle: 'Usage Guidelines',
        sections: [
            { title: 'Account Creation', text: 'Users must provide accurate information during registration.' },
            { title: 'Eligibility', text: 'The platform is for individuals looking to earn through verified task models.' }
        ]
    },
    'guidelines': {
        title: 'User Guidelines',
        subtitle: 'Community Standards',
        sections: [
            { title: 'Ethical Earning', text: 'Always follow task instructions precisely to ensure coin credit.' },
            { title: 'Respect', text: 'Maintain professional conduct in all platform community interactions.' }
        ]
    },
    'refund-policy': {
        title: 'Refund & Cancellation Policy (रिफंड और रद्दीकरण नीति)',
        subtitle: 'Rules regarding digital content, technical issues, bans, and user errors.',
        sections: [
            {
                title: '1. डिजिटल कंटेंट (Digital Content)',
                text: 'हमारे प्लेटफॉर्म पर ₹499 का कोर्स और ₹49/₹11 के बूस्टर "Digital Goods" की श्रेणी में आते हैं। एक बार पेमेंट सफल होने और कंटेंट का एक्सेस (Access) मिलने के बाद, कोई भी रिफंड प्रदान नहीं किया जाएगा। \n\nOnce the course or booster is activated, no refund will be issued.'
            },
            {
                title: '2. तकनीकी खराबी (Technical Issues)',
                text: 'यदि आपके बैंक से पैसे कट गए हैं लेकिन ऐप में कोर्स या बूस्टर एक्टिवेट नहीं हुआ है, तो कृपया 24-48 घंटे प्रतीक्षा करें। यदि फिर भी समस्या हल नहीं होती, तो आप हमारे सपोर्ट सेक्शन में ट्रांजैक्शन आईडी (Transaction ID) भेज सकते हैं। जांच के बाद यदि पेमेंट हमें प्राप्त हुआ है, तो सर्विस एक्टिवेट कर दी जाएगी, लेकिन पैसा वापस नहीं होगा। \n\nIn case of payment failure where money is deducted but service not active, contact support. No cash refund, only service activation.'
            },
            {
                title: '3. अकाउंट बैन (Account Ban)',
                text: 'यदि कोई यूजर धोखाधड़ी, फेक रेफरल, या नियमों का उल्लंघन करते हुए पाया जाता है और उसका अकाउंट बैन किया जाता है, तो उस स्थिति में उसकी बची हुई कोई भी राशि या सब्सक्रिप्शन फीस रिफंड नहीं की जाएगी। \n\nNo refunds for banned accounts due to violation of community guidelines.'
            },
            {
                title: '4. यूजर की गलती (User Error)',
                text: 'गलती से खरीदे गए बूस्टर या कोर्स के लिए कंपनी जिम्मेदार नहीं होगी और न ही इसके लिए कोई रिफंड दिया जाएगा। \n\nNo refunds for accidental purchases.'
            }
        ]
    },
    'boosters': {
        title: 'Booster Packs Config',
        description: 'Dynamic text for booster purchase cards',
        data: {
            support: {
                title: '₹11 Support Booster',
                subtitle: 'Boost participation & win more!',
                benefits: ['2X Winning Chance', 'Priority Event Support', 'Support Badge Profile']
            },
            task: {
                title: '₹49 Task Booster',
                subtitle: 'Increase coin value 3X now!',
                benefits: ['3X Coin Multiplier', 'Instant Task Approval', 'Withdrawal Priority']
            }
        }
    },
    'future_features': {
        title: 'Future and Option',
        description: 'Upcoming earning opportunities',
        data: [
            { title: 'Dromoney Marketplace', text: 'Buy and sell digital assets directly within our ecosystem using wallet balance.' },
            { title: 'Global Payouts', text: 'Expansion beyond local banking to support international earners through crypto and PayPal.' },
            { title: 'Advanced AI Tools', text: 'Get automated marketing kits generated for your affiliate links for 10x better results.' }
        ]
    },
    'income_projects': {
        title: 'Dromoney Projects',
        description: 'Access exclusive high-ticket affiliate projects and scale your monthly income with verified partners.',
        data: {
            title: 'Dromoney Projects',
            description: 'Access exclusive high-ticket affiliate projects and scale your monthly income with verified partners.'
        }
    },
    'layout_refer': {
        title: 'Referral System',
        description: 'EARN ₹200 REWARD',
        data: {
            headline: 'EARN ₹200 REWARD',
            steps: [
                { title: 'SHARE YOUR LINK', desc: 'अपना referral link दोस्तों के साथ share करें।' },
                { title: 'EARN ₹200 INSTANT', desc: 'हर सफल registration पर आपको ₹200 का instant reward मिलेगा।' },
                { title: 'DIRECT WALLET CREDIT', desc: 'आपका reward amount सीधे आपके wallet में add कर दिया जायेगा।' }
            ]
        }
    },
    'layout_tasks': {
        title: 'Daily Tasks',
        description: 'COLLECT REWARD COINS',
        data: {
            headline: 'COLLECT REWARD COINS',
            steps: [
                { title: 'COMPLETE TASKS', desc: 'रोजाना simple tasks को पूरा करें और reward coins earn करें।' },
                { title: 'REDEEM FOR CASH', desc: 'इन coins को आप बाद में real cash में convert kar sakte hain।' },
                { title: '3X Booster Benefit', desc: 'Booster active karke aap apni coin earnings ko 3X tak badha sakte hain.' }
            ]
        }
    },
    'layout_fund': {
        title: 'Future Fund',
        description: 'PASSIVE INCOME SECURITY',
        data: {
            headline: 'PASSIVE INCOME SECURITY',
            steps: [
                { title: 'PLATFORM STAKE', desc: 'एक बार eligible होने पर, आपको platform के profits में हिस्सा मिलेगा।' },
                { title: 'MONTHLY PAYOUTS', desc: 'Profit share har mahine aapke wallet mein auto-credit hoga.' },
                { title: 'LONG TERM GROWTH', desc: 'Jaise-jaise platform grow karega, aapki passive income badhti jayegi.' }
            ]
        }
    },
    'layout_events': {
        title: 'Events & Contests',
        description: 'WIN BIG PRIZES',
        data: {
            headline: 'WIN BIG PRIZES',
            steps: [
                { title: 'WEEKLY CONTESTS', desc: 'Har hafte naye Exciting Events live hote hain, jo limited time ke liye hote hain.' },
                { title: 'MEGA JACKPOTS', desc: 'Contests mein bhag lekar aap ₹500 tak ka instant cash aur exciting prizes jeet sakte hain.' },
                { title: 'LEADERBOARD REWARDS', desc: 'Top earners ko special bonuses aur verification badges diye jaate hain.' }
            ]
        }
    }
};

const seedAllMarketing = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('MongoDB Connected to All Marketing Seeder...');

        for (const [key, content] of Object.entries(DEFAULT_CONTENT)) {
            const dbKey = key.startsWith('menu_') ? key : `menu_${key.replace(/-/g, '_')}`;
            
            await Content.deleteOne({ key: dbKey });

            await Content.create({
                key: dbKey,
                title: content.title,
                description: content.description || content.subtitle,
                data: content.data || {
                    title: content.title,
                    subtitle: content.subtitle,
                    sections: content.sections
                }
            });
            console.log(`Seeded: ${dbKey}`);
        }

        console.log('Successfully migrated ALL Marketing sections to Database!');
        process.exit();
    } catch (error) {
        console.error('Error with data migration', error);
        process.exit(1);
    }
};

seedAllMarketing();
