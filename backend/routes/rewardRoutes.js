const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const RewardHistory = require('../models/RewardHistory');
const Settings = require('../models/Settings');

const router = express.Router();

router.use(protect);

const REWARD_AMOUNT = 5;

const getISTDateString = (dateObj) => {
    return new Date(new Date(dateObj).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();
};

// Reset daily count if a new day has started
const checkAndResetDailyLimit = async (user) => {
    const now = new Date();
    const todayStr = getISTDateString(now);
    const resetStr = getISTDateString(user.lastAdCountResetAt || 0); // 0 ensures it resets if null

    if (todayStr !== resetStr) {
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

        // Booster Logic — only if admin added Watch & Earn to Task Booster applicableTasks
        let factor = 1;

        if (user.isTaskBoosterActive) {
            const mongoose = require('mongoose');
            const Booster = mongoose.models.Booster || require('../models/Booster');
            const taskBooster = await Booster.findOne({ type: 'task' });
            const allowed = (taskBooster?.applicableTasks || []).map((t) => String(t).toLowerCase());
            const watchAllowed =
                allowed.some((t) => t.includes('watch')) ||
                allowed.includes('watch & earn') ||
                allowed.includes('watch and earn');

            if (watchAllowed) {
                factor = 12;
                if (taskBooster?.benefits) {
                    for (const b of taskBooster.benefits) {
                        const match = String(b).match(/(\d+)x/i);
                        if (match) {
                            factor = parseInt(match[1], 10);
                            break;
                        }
                    }
                }
            }
        }
        
        // amount is directly in INR
        const rewardAmount = Math.round(BASE_REWARD * factor * 100) / 100;

        if (!user.wallet) user.wallet = { balance: 0, lifetimeEarnings: 0, todayEarnings: 0 };

        const { creditEarning } = require('../utils/walletLedger');
        const walletCredit = await creditEarning(user, rewardAmount, {
            source: 'Ad Earning: Reward Ad',
            inviteHold: false,
            createTx: true,
        });

        user.lastRewardAt = new Date();
        user.todayRewardCount = (user.todayRewardCount || 0) + 1;

        await user.save();

        await RewardHistory.create({
            userId: user._id,
            reward: rewardAmount,
            adType: 'rewarded',
            rewardedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Reward claimed successfully',
            inrEarned: rewardAmount,
            walletDestination: walletCredit?.destination || null,
            newWalletBalance: user.wallet.balance
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
