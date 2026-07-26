const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const RewardHistory = require('../models/RewardHistory');
const Settings = require('../models/Settings');

const router = express.Router();

router.use(protect);

const REWARD_AMOUNT = 5;

// Reset daily count if a new day has started
const checkAndResetDailyLimit = async (user) => {
    const now = new Date();
    // Use lastAdCountResetAt or create logic. For simplicity, check if the current date is different from lastRewardAt's date.
    // Or just check if today is a different calendar day than lastAdCountResetAt
    if (!user.lastAdCountResetAt || new Date(user.lastAdCountResetAt).getDate() !== now.getDate() || new Date(user.lastAdCountResetAt).getMonth() !== now.getMonth() || new Date(user.lastAdCountResetAt).getFullYear() !== now.getFullYear()) {
        user.todayRewardCount = 0;
        user.lastAdCountResetAt = now;
        await user.save();
    }
};

// @desc    Get reward ad status
// @route   GET /api/reward/status
// @access  Private
router.get('/status', async (req, res) => {
    try {
        // req.user is set by the protect middleware from the JWT token
        const user = req.user;
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const settings = await Settings.findOne() || {};
        const MAX_DAILY_ADS = settings.adMaxDailyLimit || 10;
        const COOLDOWN_SECONDS = settings.adCooldownSeconds || 30;

        await checkAndResetDailyLimit(user);

        let available = true;
        let nextAdIn = 0;
        let remainingAds = Math.max(0, MAX_DAILY_ADS - (user.todayRewardCount || 0));

        if (remainingAds <= 0) {
            available = false;
        }

        if (user.lastRewardAt) {
            const diff = Date.now() - new Date(user.lastRewardAt).getTime();
            const cooldownMs = COOLDOWN_SECONDS * 1000;
            if (diff < cooldownMs) {
                available = false;
                nextAdIn = Math.ceil((cooldownMs - diff) / 1000); // seconds remaining
            }
        }

        res.json({
            success: true,
            available,
            nextAdIn, // in seconds
            remainingAds,
            maxDailyLimit: MAX_DAILY_ADS,
            rewardAmount: settings.adRewardCoins || 2
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Claim reward after watching ad
// @route   POST /api/reward/claim
// @access  Private
router.post('/claim', async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const settings = await Settings.findOne() || {};
        const MAX_DAILY_ADS = settings.adMaxDailyLimit || 10;
        const COOLDOWN_SECONDS = settings.adCooldownSeconds || 30;
        const BASE_REWARD = settings.adRewardCoins || 2;

        await checkAndResetDailyLimit(user);

        // Check daily limit
        if ((user.todayRewardCount || 0) >= MAX_DAILY_ADS) {
            return res.status(400).json({ allowed: false, reason: 'daily_limit', message: 'Daily limit reached' });
        }

        // Check cooldown
        if (user.lastRewardAt) {
            const diff = Date.now() - new Date(user.lastRewardAt).getTime();
            const cooldownMs = COOLDOWN_SECONDS * 1000;
            if (diff < cooldownMs) {
                return res.status(400).json({ success: false, message: `Wait ${COOLDOWN_SECONDS} seconds` });
            }
        }

        // Booster Logic
        // As per user requirement, Watch & Earn should strictly give base coins, Booster does not apply.
        const factor = 1;
        
        const rewardAmount = BASE_REWARD * factor;

        // Apply reward
        if (!user.coins) user.coins = { balance: 0, lifetimeCoins: 0 };
        if (!user.wallet) user.wallet = { balance: 0, lifetimeEarnings: 0, todayEarnings: 0 };

        user.coins.balance = (user.coins.balance || 0) + rewardAmount;
        user.coins.lifetimeCoins = (user.coins.lifetimeCoins || 0) + rewardAmount;

        // Conversion logic removed

        user.lastRewardAt = new Date();
        user.todayRewardCount = (user.todayRewardCount || 0) + 1;

        await user.save();

        await RewardHistory.create({
            userId: user._id,
            reward: rewardAmount,
            adType: 'rewarded',
            rewardedAt: new Date()
        });

        // Record Transaction
        const Transaction = require('../models/Transaction');
        await Transaction.create({
            user: user._id,
            type: 'credit',
            currency: 'COIN',
            amount: rewardAmount,
            source: 'Watched Reward Ad',
            status: 'Success'
        });

        // Removed INR transaction

        res.json({
            success: true,
            message: 'Reward claimed successfully',
            coins: user.coins.balance
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
