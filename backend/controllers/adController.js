const Ad = require('../models/Ad');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Helper to calculate a stable seed-based duration between 30 and 60 seconds
const getISTDateString = (dateObj) => {
    return new Date(new Date(dateObj).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();
};

const getDynamicDuration = (adObj) => {
    if (adObj.duration && adObj.duration >= 30 && adObj.duration <= 60) {
        return adObj.duration;
    }
    const seed = adObj._id ? adObj._id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 45;
    return 30 + (seed % 31); // Yields a stable, consistent duration between 30 and 60 seconds (inclusive)
};

// @desc    Get all active ads
// @route   GET /api/public/ads
// @access  Public (Optional User)
exports.getAds = asyncHandler(async (req, res, next) => {
    const ads = await Ad.find({ status: 'Active' }).sort('-createdAt');
    
    let watchedIds = [];
    let dailyAdCount = 0;
    let nextAdAvailableAt = null;

    if (req.user) {
        const user = await User.findById(req.user.id);
        if (user) {
            // Check if day has changed since lastAdCountResetAt in IST
            const todayStr = getISTDateString(new Date());
            const resetStr = getISTDateString(user.lastAdCountResetAt || Date.now());
            if (todayStr !== resetStr) {
                user.dailyAdCount = 0;
                user.watchedAds = []; // Clear daily watches to allow re-watching
                user.lastAdCountResetAt = new Date();
                await user.save();
            }
            watchedIds = user.watchedAds.map(id => id.toString());
            dailyAdCount = user.dailyAdCount;
            nextAdAvailableAt = user.nextAdAvailableAt;
        }
    }

    const data = ads.map(ad => {
        const dynamicDuration = getDynamicDuration(ad);
        return {
            ...ad._doc,
            duration: dynamicDuration,
            isWatched: watchedIds.includes(ad._id.toString())
        };
    });

    res.status(200).json({
        success: true,
        count: data.length,
        data,
        dailyAdCount,
        nextAdAvailableAt,
        maxDailyLimit: ads.length  // actual number of available ads
    });
});

// @desc    Get single ad
// @route   GET /api/public/ads/:id
// @access  Public (Optional User)
exports.getAdById = asyncHandler(async (req, res, next) => {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
        return next(new ErrorResponse('Ad not found', 404));
    }

    let isWatched = false;
    let dailyAdCount = 0;
    let nextAdAvailableAt = null;

    if (req.user) {
        const user = await User.findById(req.user.id);
        if (user) {
            // Check if day has changed since lastAdCountResetAt in IST
            const todayStr = getISTDateString(new Date());
            const resetStr = getISTDateString(user.lastAdCountResetAt || Date.now());
            if (todayStr !== resetStr) {
                user.dailyAdCount = 0;
                user.watchedAds = []; // Clear daily watches to allow re-watching
                user.lastAdCountResetAt = new Date();
                await user.save();
            }
            isWatched = user.watchedAds.includes(ad._id);
            dailyAdCount = user.dailyAdCount;
            nextAdAvailableAt = user.nextAdAvailableAt;
        }
    }

    const dynamicDuration = getDynamicDuration(ad);

    res.status(200).json({
        success: true,
        data: {
            ...ad._doc,
            duration: dynamicDuration,
            isWatched
        },
        dailyAdCount,
        nextAdAvailableAt,
        maxDailyLimit: await Ad.countDocuments({ status: 'Active' })
    });
});

// @desc    Reward user for watching an ad
// @route   POST /api/user/data/ads/reward
// @access  Private
exports.rewardUserForAd = asyncHandler(async (req, res, next) => {
    const { adId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // 1. Check day change and reset counters if needed in IST
    const todayStr = getISTDateString(new Date());
    const resetStr = getISTDateString(user.lastAdCountResetAt || Date.now());
    if (todayStr !== resetStr) {
        user.dailyAdCount = 0;
        user.watchedAds = [];
        user.lastAdCountResetAt = new Date();
    }

    // 2. Check maximum limit = total active ads
    const totalActiveAds = await Ad.countDocuments({ status: 'Active' });
    if (user.dailyAdCount >= totalActiveAds) {
        return next(new ErrorResponse(`Daily limit reached. You can only watch a maximum of ${totalActiveAds} ads per day.`, 400));
    }

    // 3. Check cooldown gap of 30s to 60s
    if (user.nextAdAvailableAt && new Date() < user.nextAdAvailableAt) {
        const diffSeconds = Math.ceil((new Date(user.nextAdAvailableAt) - Date.now()) / 1000);
        return next(new ErrorResponse(`Please wait ${diffSeconds} more seconds before watching another video.`, 400));
    }

    // 4. Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
        return next(new ErrorResponse('Ad not found', 404));
    }

    // 5. Check if already watched today
    if (user.watchedAds.includes(adId)) {
        return next(new ErrorResponse('Reward already claimed for this ad', 400));
    }

    // 6. Calculate rewards
    const baseReward = ad.coinsReward || 0;
    let factor = 1;

    if (user.isTaskBoosterActive) {
        const mongoose = require('mongoose');
        const Booster = mongoose.models.Booster || require('../models/Booster');
        const taskBooster = await Booster.findOne({ type: 'task' });
        if (taskBooster && taskBooster.benefits) {
            for (const b of taskBooster.benefits) {
                const match = b.match(/(\d+)x/i);
                if (match) {
                    factor = parseInt(match[1]);
                    break;
                }
            }
        }
    }

    const totalAwardedCoins = baseReward * factor;

    // Update User
    user.coins.balance += totalAwardedCoins;
    user.coins.lifetimeCoins += totalAwardedCoins;
    
    // Also update wallet balance (Auto-conversion)
    // removed

    user.watchedAds.push(adId);
    user.dailyAdCount += 1;

    // Define random gap/cooldown between 30 and 60 seconds
    const cooldownSeconds = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
    user.nextAdAvailableAt = new Date(Date.now() + cooldownSeconds * 1000);

    await user.save();

    // 7. Record Transactions
    await Transaction.create({
        user: user._id,
        type: 'credit',
        currency: 'COIN',
        amount: totalAwardedCoins,
        source: `Watched Ad: ${ad.title}`,
        status: 'Success'
    });

    // removed INR transaction

    // 8. Update Ad view count
    ad.viewCount += 1;
    await ad.save();

    res.status(200).json({
        success: true,
        message: 'Reward claimed successfully!',
        data: {
            coinsAwarded: totalAwardedCoins,
            newCoinBalance: user.coins.balance,
            newWalletBalance: user.wallet.balance,
            dailyAdCount: user.dailyAdCount,
            nextAdAvailableAt: user.nextAdAvailableAt
        }
    });
});

// @desc    Create new Ad
// @route   POST /api/admin/ads
// @access  Private/Admin
exports.createAd = asyncHandler(async (req, res, next) => {
    const ad = await Ad.create(req.body);

    res.status(201).json({
        success: true,
        data: ad
    });
});

// @desc    Update Ad
// @route   PUT /api/admin/ads/:id
// @access  Private/Admin
exports.updateAd = asyncHandler(async (req, res, next) => {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!ad) {
        return next(new ErrorResponse('Ad not found', 404));
    }

    res.status(200).json({
        success: true,
        data: ad
    });
});

// @desc    Delete Ad
// @route   DELETE /api/admin/ads/:id
// @access  Private/Admin
exports.deleteAd = asyncHandler(async (req, res, next) => {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
        return next(new ErrorResponse('Ad not found', 404));
    }

    await ad.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get all ads for admin
// @route   GET /api/admin/ads
// @access  Private/Admin
exports.getAdminAds = asyncHandler(async (req, res, next) => {
    const ads = await Ad.find().sort('-createdAt');

    res.status(200).json({
        success: true,
        count: ads.length,
        data: ads
    });
});
