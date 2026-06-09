const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const RewardHistory = require('../models/RewardHistory');

const router = express.Router();

router.use(protect);

const MAX_DAILY_ADS = 10;
const REWARD_AMOUNT = 5;
const COOLDOWN_SECONDS = 30;

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
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
            rewardAmount: REWARD_AMOUNT
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
        const { userId } = req.body;
        // Check if the user is claiming for themselves, or allow flutter to pass userId (but protect middleware uses req.user.id)
        const idToUse = userId || req.user.id;
        
        const user = await User.findById(idToUse);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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

        // Apply reward
        user.coins.balance = (user.coins.balance || 0) + REWARD_AMOUNT;
        user.coins.lifetimeCoins = (user.coins.lifetimeCoins || 0) + REWARD_AMOUNT;
        
        user.lastRewardAt = new Date();
        user.todayRewardCount = (user.todayRewardCount || 0) + 1;

        await user.save();

        await RewardHistory.create({
            userId: user._id,
            reward: REWARD_AMOUNT,
            adType: 'rewarded',
            rewardedAt: new Date()
        });

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
