const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Content = require('../models/Content');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const ALL_GUIDES = [
    {
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
            content: `🚀 How Dromoney Works
Welcome to Dromoney! Dromoney is a comprehensive Learning, Part-Time Opportunity, Business Guidance, and Support Platform. Here you can explore smart part-time earning opportunities, access exclusive business ideas, and participate in community rewards.

⚠️ Disclaimer: Dromoney does not guarantee fixed income or profits. Earnings depend entirely on your effort, skills, and active participation.

📱 1. Create Account & Complete KYC
Getting started is quick and easy. Sign up using your mobile number and OTP. Complete your simple 1-Step Aadhaar verification to unlock instant access to high-paying income projects.

🏠 2. Explore Home Dashboard
Once logged in, explore top earning opportunities:
• 🎯 Part-Time Income Modules & Daily Tasks
• 💼 Exclusive Business Ideas & Guidance
• 🚀 Future Fund Profit Share & Multiplier Boosters
• 🎁 Daily Quizzes, Video Ads & Extra Rewards

👥 3. Refer Friends & Earn Rewards
Share your unique referral invite link with friends. When they complete KYC, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account. If they do not, their Pending is cleared every 14 days (14, 28, 42…).

💳 4. Instant Withdrawals & Security
Withdraw your verified earnings directly to your UPI ID or Bank Account with 100% transparency and end-to-end encryption.`
        }
    },
    {
        key: 'guide_get_started',
        title: 'How to get started',
        description: 'Register & Login — no KYC',
        data: {
            badge: 'GET STARTED',
            title: 'How to get started',
            subtitle: 'Register & Login only — no Aadhaar / KYC',
            logoUrl: '',
            ctaText: 'Start Earning',
            nextRoute: '/user/income',
            content: `📱 1. Account बनाएं & Login करें
Mobile Number और OTP से Register / Login करें। KYC / Aadhaar की जरूरत नहीं है।

🏠 2. App explore करें
Login के बाद Income, Daily Work, Invite और Future Fund इस्तेमाल कर सकते हैं।

💳 3. Virtual Account
Withdrawals और Pending → Virtual unlock के लिए Virtual Account बनाएं।`
        }
    },
    {
        key: 'guide_invite',
        title: 'How to Invite & Earn',
        description: 'Referral program guide',
        data: {
            badge: 'INVITE & EARN REWARDS',
            title: 'How to Invite',
            subtitle: 'Invite friends & earn ₹200 per verified referral',
            logoUrl: '',
            ctaText: 'Invite Friends Now',
            nextRoute: '/user/marketing',
            content: `🔗 1. Copy & Share Invite Link
Copy your personal Play Store invite link from Affiliate Center and share via WhatsApp or social media.

📱 2. Friend Registers
Your friend downloads the app from that Play Store link and registers. The invite code is already inside the link.

💰 3. Instant ₹200 in Pending
Right after they register, ₹200 appears in your Pending Wallet. It moves to your Virtual Account when they create their Virtual Account.

✅ 4. Virtual Account unlock
If they do not create a Virtual Account, their Pending is cleared every 14 days (14, 28, 42…) until they buy one.`
        }
    },
    {
        key: 'guide_card',
        title: 'How to Create Withdrawal Card',
        description: 'Unlock Virtual Wallet withdrawals',
        data: {
            badge: 'WITHDRAWAL CARD UNLOCK',
            title: 'Create Withdrawal Card',
            subtitle: 'Unlock instant direct payouts to your Bank & UPI',
            logoUrl: '',
            ctaText: 'Get Card Now',
            nextRoute: '/user/withdrawal-card',
            content: `💳 1. Verify Card Details
Your name, mobile number, and activation dates are automatically configured.

🚀 2. Lifetime Activation
Unlock your verified withdrawal card to enable unlimited direct payouts to your Bank Account or UPI ID.

🔒 3. Safe & Encrypted
All transactions are secured with banking-grade encryption and 24/7 fraud monitoring.`
        }
    },
    {
        key: 'guide_withdraw',
        title: 'How to Withdraw',
        description: 'Redeem funds to UPI or Bank',
        data: {
            badge: 'PAYOUTS & REDEMPTION',
            title: 'How to Withdraw',
            subtitle: 'Instant payout transfer to UPI & Bank',
            logoUrl: '',
            ctaText: 'Go to Wallet',
            nextRoute: '/user/wallet',
            content: `👛 1. Check Unlocked Balance
Withdrawals work seamlessly from your unlocked Virtual Wallet balance.

🏦 2. Enter Payout Details
Enter your UPI ID (GPay / PhonePe / Paytm) or Bank Account number with IFSC code.

⚡ 3. Instant Settlement
Requests are processed directly to your account with complete settlement tracking.`
        }
    },
    {
        key: 'guide_earn500',
        title: 'How to Earn ₹500 Daily',
        description: 'Daily consistency and tasks',
        data: {
            badge: 'DAILY INCOME SYSTEM',
            title: 'How to Earn ₹500 Daily',
            subtitle: 'Combine tasks, video watching, and referral invites',
            logoUrl: '',
            ctaText: 'Start Daily Tasks',
            nextRoute: '/user/income',
            content: `🎯 1. Daily Task Modules
Complete daily short tasks, brand surveys, and video watching modules.

🚀 2. Future Fund Boosters
Activate booster multipliers to multiply your reward coins per completed task.

👥 3. Active Referrals
Build a steady earning stream with consistent daily referral milestones.`
        }
    },
    {
        key: 'guide_fund',
        title: 'How to Open Future Fund',
        description: 'Passive income pool guide',
        data: {
            badge: 'PASSIVE INCOME FUND',
            title: 'How to Open Future Fund',
            subtitle: 'Watch ads + complete tasks to grow your profit pool',
            logoUrl: '',
            ctaText: 'Open Future Fund',
            nextRoute: '/user/future-fund',
            content: `🐷 1. Fund Activation Goals
Complete 10 successful KYC referrals, 50 video ads watched, and 50 tasks completed.

📈 2. Real-Time Growth Pool
Watch your passive fund balance grow automatically on your Future Fund dashboard.

💵 3. Daily Profit Distribution
Once active, daily profit shares are auto-credited to your Virtual Wallet.`
        }
    },
    {
        key: 'guide_tasks',
        title: 'How to Complete Tasks',
        description: 'Daily task submission guide',
        data: {
            badge: 'TASK EXECUTION GUIDE',
            title: 'How to Complete Tasks',
            subtitle: 'Simple steps to complete tasks and earn instant coins',
            logoUrl: '',
            ctaText: 'Explore Tasks',
            nextRoute: '/user/earn',
            content: `✅ 1. Choose a Task
Browse available tasks in the Daily Work / Income center.

📝 2. Read Instructions
Follow the simple instructions and capture the required proof or screenshot.

🎉 3. Get Credited Instantly
Once verified, reward coins and earnings are credited directly to your wallet.`
        }
    },
    {
        key: 'guide_business',
        title: 'How to Start a Business',
        description: 'Exclusive business guidance',
        data: {
            badge: 'BUSINESS & GROWTH',
            title: 'How to Start a Business',
            subtitle: 'Explore curated business ideas and launch opportunities',
            logoUrl: '',
            ctaText: 'Explore Business Ideas',
            nextRoute: '/user/business',
            content: `🏢 1. Curated Business Models
Access verified low-investment business models and practical guidance.

🤝 2. Ecosystem Support
Leverage Dromoney ecosystem tools, partner networks, and customer acquisition strategies.

🚀 3. Scale Your Venture
Learn step-by-step scaling tactics from successful entrepreneurs.`
        }
    },
    {
        key: 'guide_daily',
        title: 'Daily Work & Earn',
        description: 'Tasks and offer tasks',
        data: {
            badge: 'DAILY WORK',
            title: 'Daily Work & Earn',
            subtitle: 'Tasks / offer tasks',
            logoUrl: '',
            ctaText: 'Start Earning Now',
            nextRoute: '/user/earn',
            content: `This Daily Work system replaces the old Events option.

Open a task, complete it, and earning is credited to the matching wallet.

If Virtual Account is created and active, earning goes there. Otherwise it goes to Pending.

If Virtual Account is not created or is expired, Pending is cleared every 14 days (14, 28, 42…) until you create or renew it. Old Virtual balance is never deleted.`
        }
    },
    {
        key: 'guide_wallet',
        title: 'Wallet Guide',
        description: 'Pending + Virtual',
        data: {
            badge: 'WALLET',
            title: 'Wallet Guide',
            subtitle: 'Pending + Virtual',
            logoUrl: '',
            ctaText: 'Open Wallet',
            nextRoute: '/user/wallet',
            content: `Pending Wallet holds earnings until Virtual Account is created or renewed. It is cleared every 14 days (14, 28, 42…) if you miss that window.

Virtual Account is withdrawable after the account is created.

Pay ₹499. Within 3 days of KYC, ₹399 is a 6-month reserve used at renewal.`
        }
    },
    {
        key: 'page_affiliate_how_it_works',
        title: 'Affiliate How it works',
        description: 'Text shown on Affiliate Center',
        data: {
            badge: 'AFFILIATE CENTER',
            title: 'How it works',
            subtitle: 'Invite, Pending wallet, and 14-day cycle',
            logoUrl: '',
            ctaText: 'Invite Friends',
            nextRoute: '/user/marketing',
            content: 'Share your invite link. After your friend registers, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account. If they do not create a Virtual Account, their Pending is cleared every 14 days (14, 28, 42…) until they buy one. After a 6-month Virtual Account expires, the same 14-day Pending cycle runs until they renew. Old Virtual balance is never deleted.'
        }
    }
];

const seedAllGuides = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB for seeding all guides...');

        for (const g of ALL_GUIDES) {
            await Content.deleteOne({ key: g.key });
            await Content.create(g);
            console.log(`Seeded guide: ${g.key}`);
        }

        console.log('Guides seeded successfully in MongoDB!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding guides:', err);
        process.exit(1);
    }
};

seedAllGuides();
