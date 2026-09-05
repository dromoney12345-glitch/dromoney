const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const {
    syncFutureFundCriteria,
    addFutureFundActivity,
    migratePdfActivationSettings,
} = require('../utils/futureFund');

// Configure Cloudinary
if (!process.env.CLOUDINARY_API_SECRET) {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dncw1hfix',
    api_key: process.env.CLOUDINARY_API_KEY || '815112221921759',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'io9bbDuRyDZ0Sd1C2fy2sCP4YmI'
});

// @desc    List personal in-app notifications (database)
// @route   GET /api/user/data/notifications
// @access  Private
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
    const AppNotification = require('../models/AppNotification');
    const items = await AppNotification.find({ user: req.user.id }).sort('-createdAt').limit(50);
    res.status(200).json({ success: true, count: items.length, data: items });
});

// @desc    Clear personal notifications
// @route   DELETE /api/user/data/notifications
// @access  Private
exports.clearPersonalNotifications = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    user.notifications = [];
    await user.save({ validateBeforeSave: false });

    const AppNotification = require('../models/AppNotification');
    await AppNotification.deleteMany({ user: req.user.id });
    res.status(200).json({ success: true });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
    const AppNotification = require('../models/AppNotification');
    await AppNotification.updateOne(
        { _id: req.params.id, user: req.user.id },
        { $set: { isRead: true } }
    );
    res.status(200).json({ success: true });
});

// @desc    KYC removed — Login/Register only; endpoint kept for old clients
// @route   PATCH /api/user/data/kyc
// @access  Private
exports.updateKyc = asyncHandler(async (req, res) => {
    res.status(410).json({
        success: false,
        message: 'KYC is no longer required. You can use the app after Login or Register.',
    });
});

// @desc    Unlock Platform (Payment Simulation)
// @route   POST /api/user/profile/unlock
// @access  Private
exports.unlockPlatform = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    // In production, verify payment gateway response here
    user.isPaid = true;
    user.unlockedAt = new Date();
    await user.save();

    const { activateVirtualWallet } = require('../utils/walletLedger');
    await activateVirtualWallet(user);
    await user.save();

        try {
            const { afterVirtualAccountActivated } = require('../utils/referralReward');
            await afterVirtualAccountActivated(user);
        } catch (err) {
            console.error('Simulation Referral Error:', err.message);
        }

        try {
            const { notifyJourney } = require('../utils/userJourneyPush');
            await notifyJourney(user._id, 'va_activated');
        } catch (pushErr) {
            console.error('VA unlock notify failed:', pushErr.message);
        }

    res.status(200).json({
        success: true,
        message: 'Virtual Account unlocked',
        isPaid: user.isPaid
    });
});

// @desc    Mark onboarding course as completed
// @route   POST /api/user/data/complete-course
// @access  Private
exports.completeCourse = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    user.hasCompletedCourse = true;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Onboarding course completed successfully',
        hasCompletedCourse: user.hasCompletedCourse
    });
});

// @desc    Submit a Brand Promotion
// @route   POST /api/user/promotions
// @access  Private
exports.submitPromotion = asyncHandler(async (req, res, next) => {
    const { name, brandName, mobile, whatsapp, category, link, brandLink, budget, usersRequired, description } = req.body;

    if (!mobile || mobile.replace(/\D/g, '').length !== 10) {
        return next(new ErrorResponse('Please provide a valid 10-digit mobile number', 400));
    }

    const Task = require('../models/Task');

    const promotion = await Promotion.create({
        user: req.user.id,
        brandName: brandName || name,
        brandLink: brandLink || link,
        mobile: mobile.replace(/\D/g, ''),
        whatsapp,
        category: category || 'Custom Task',
        budget,
        usersRequired: usersRequired || 0,
        description,
        status: 'Approved' // Automatically approve to make it instantly active
    });

    // Determine which existing Task card to update
    let targetTitle = 'Sponsored Task';
    let taskType = 'Sponsored';
    let taskCategory = 'Other';
    let taskIcon = 'Monitor';
    let taskConfig = {};

    const cat = promotion.category || 'Custom Task';
    if (cat === 'Instagram Follow') {
        targetTitle = 'Like & Follow Task';
        taskType = 'Sponsored';
        taskCategory = 'Instagram';
        taskIcon = 'Camera';
    } else if (cat === 'YouTube Subscribe') {
        targetTitle = 'Like & Follow Task';
        taskType = 'Sponsored';
        taskCategory = 'YouTube';
        taskIcon = 'Youtube';
    } else if (cat === 'Video Watch') {
        targetTitle = 'Watch and Earn Video';
        taskType = 'Video';
        taskCategory = 'YouTube';
        taskIcon = 'Youtube';
        taskConfig = { timer: '30' };
    } else if (cat === 'Website Visit') {
        targetTitle = 'Sponsored Task';
        taskType = 'Sponsored';
        taskCategory = 'Other';
        taskIcon = 'Monitor';
    } else if (cat === 'App Download') {
        targetTitle = 'Sponsored Task';
        taskType = 'Sponsored';
        taskCategory = 'Other';
        taskIcon = 'Monitor';
    } else if (cat === 'Custom Task') {
        targetTitle = 'Like & Follow Task';
        taskType = 'Sponsored';
        taskCategory = 'Other';
        taskIcon = 'Camera';
    }

    let existingTask = await Task.findOne({ title: targetTitle });
    if (existingTask) {
        existingTask.description = promotion.description || `Complete this ${cat} task to earn coins.`;
        existingTask.link = promotion.brandLink;
        existingTask.category = taskCategory;
        existingTask.icon = taskIcon;
        existingTask.config = taskConfig;
        await existingTask.save();
    } else {
        await Task.create({
            title: targetTitle,
            description: promotion.description || `Complete this ${cat} task to earn coins.`,
            coinsReward: 1,
            type: taskType,
            category: taskCategory,
            link: promotion.brandLink,
            icon: taskIcon,
            config: taskConfig,
            status: 'Active'
        });
    }

    res.status(201).json({
        success: true,
        data: promotion
    });
});

// @desc    Get user's promotions
// @route   GET /api/user/promotions
// @access  Private
exports.getMyPromotions = asyncHandler(async (req, res, next) => {
    const promotions = await Promotion.find({ user: req.user.id });

    res.status(200).json({
        success: true,
        count: promotions.length,
        data: promotions
    });
});

// @desc    Update Profile Photo
// @route   PATCH /api/user/data/photo
// @access  Private
exports.updateProfilePhoto = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new ErrorResponse('Please upload an image', 400));
    }

    // Upload to Cloudinary using Stream
    try {
        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'dromoney/profile_pics',
                        resource_type: 'image',
                        format: 'jpg',
                        public_id: `user_${req.user.id}_${Date.now()}`,
                        transformation: [{ width: 500, height: 500, crop: 'limit' }]
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(buffer);
            });
        };

        const result = await uploadFromBuffer(req.file.buffer);

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profileImage: result.secure_url },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: user.profileImage
        });
    } catch (err) {
        console.error('Profile Photo Upload Error:', err);
        return next(new ErrorResponse(`Upload failed: ${err.message || 'Server error'}`, 500));
    }
});

// @desc    Sync & return Future Fund eligibility status (dynamic criteria)
// @route   GET /api/user/data/future-fund/status
// @access  Private
exports.getFutureFundStatus = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    await migratePdfActivationSettings();
    const settings = (await Settings.findOne()) || {};
    const synced = await syncFutureFundCriteria(user, settings);
    if (synced.modified) {
        await user.save({ validateBeforeSave: false });
    }

    const Transaction = require('../models/Transaction');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ffMatch = {
        user: user._id,
        type: 'credit',
        status: 'Success',
        source: { $regex: 'future fund', $options: 'i' },
    };
    const [todayAgg, lifeAgg] = await Promise.all([
        Transaction.aggregate([
            { $match: { ...ffMatch, createdAt: { $gte: todayStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
            { $match: ffMatch },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    const getISTDateString = (dateObj) =>
        new Date(new Date(dateObj).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();

    const todayIstStr = getISTDateString(new Date());
    const resetIstStr = getISTDateString(user.lastAdCountResetAt || 0);
    const adsWatchedToday = todayIstStr === resetIstStr
        ? Math.max(user.todayRewardCount || 0, user.dailyAdCount || 0)
        : 0;
    const tasksCompletedToday = (user.dailyTaskCompletions || []).filter(
        (tc) => getISTDateString(tc.completedAt) === todayIstStr
    ).length;
    const dailyAdTarget = Number(settings.adMaxDailyLimit) || 10;
    const dailyTaskTarget = 10;

    res.status(200).json({
        success: true,
        data: {
            status: user.futureFund.status,
            progress: synced.progress,
            eligible: synced.eligible,
            criteria: synced.criteria,
            targets: synced.targets,
            todayActivityMinutes: synced.activityCurrent,
            activeDaysCount: synced.daysCurrent,
            successfulSales: synced.salesCurrent,
            todayEarnings: todayAgg[0]?.total || 0,
            lifetimeEarnings: lifeAgg[0]?.total || 0,
            dailyProgress: {
                ads: {
                    current: Math.min(dailyAdTarget, adsWatchedToday),
                    target: dailyAdTarget,
                },
                tasks: {
                    current: Math.min(dailyTaskTarget, tasksCompletedToday),
                    target: dailyTaskTarget,
                },
            },
        }
    });
});

// @desc    Heartbeat — count app activity minutes toward Daily Activity / Active Days
// @route   POST /api/user/data/future-fund/activity
// @access  Private
exports.pingFutureFundActivity = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    const minutes = Number(req.body?.minutes) || 1;
    const settings = (await Settings.findOne()) || {};
    const synced = await addFutureFundActivity(user, minutes, settings);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        data: {
            status: user.futureFund.status,
            progress: synced.progress,
            eligible: synced.eligible,
            criteria: synced.criteria,
            targets: synced.targets,
            todayActivityMinutes: synced.activityCurrent,
            activeDaysCount: synced.daysCurrent,
            successfulSales: synced.salesCurrent,
        }
    });
});

// @desc    Update Future Fund Progress (legacy + sync)
// @route   POST /api/user/data/future-fund/progress
// @access  Private
exports.updateFutureFundProgress = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    const settings = (await Settings.findOne()) || {};

    // Optional: allow adding activity minutes via this legacy route
    if (req.body?.type === 'activity' && req.body?.value) {
        await addFutureFundActivity(user, req.body.value, settings);
    } else {
        await syncFutureFundCriteria(user, settings);
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        data: user.futureFund
    });
});

// @desc    Unlock Future Fund (requires all 3 criteria)
// @route   POST /api/user/data/future-fund/unlock
// @access  Private
exports.unlockFutureFund = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    const settings = (await Settings.findOne()) || {};
    const synced = await syncFutureFundCriteria(user, settings);

    if (!synced.eligible) {
        if (user.futureFund?.status === 'active') {
            user.futureFund.status = 'locked';
            await user.save({ validateBeforeSave: false });
        }
        const missing = synced.criteria
            .filter((c) => !c.completed)
            .map((c) => `${c.title} (${c.current}/${c.target})`)
            .join(', ');
        return next(new ErrorResponse(`Complete all criteria first: ${missing}`, 400));
    }

    // Activate only after Invites + Ads + Tasks targets are all met.
    user.futureFund.status = 'active';
    user.futureFund.progress = 100;
    await user.save({ validateBeforeSave: false });

    try {
        const { notifyJourney } = require('../utils/userJourneyPush');
        await notifyJourney(user._id, 'ff_activated', {
            notificationId: `${user._id}_ff_activated`,
        });
    } catch (pushErr) {
        console.error('Future Fund activate notify failed:', pushErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Future Fund unlocked',
        status: user.futureFund.status,
        data: {
            progress: synced.progress,
            criteria: synced.criteria,
        }
    });
});

function mapReferralRow(ref, tx, commission) {
    const cardActive = ref.isPaid && String(ref.withdrawalCard?.status || '') === 'active';
    const registered = !!ref._id;

    let milestone = 'registered';
    if (tx?.status === 'Failed') milestone = 'removed';
    else if (tx?.status === 'Completed' || (cardActive && tx?.status === 'Pending')) milestone = 'card_active';
    else if (cardActive) milestone = 'card_active';
    else if (tx?.status === 'Pending' || registered) milestone = 'card_pending';

    const amount = tx?.amount || (registered ? commission : 0);
    const status = tx?.status || (registered ? 'Pending' : 'Waiting');

    return {
        _id: tx?._id || ref._id,
        referredUser: ref._id ? ref : { name: 'Unknown User' },
        name: ref.name || 'Unknown User',
        phone: ref.phone || '',
        amount,
        status,
        createdAt: tx?.createdAt || ref.createdAt,
        kycStatus: ref.kyc?.status || 'Not Required',
        kycApprovedAt: ref.kycApprovedAt || null,
        cardStatus: ref.withdrawalCard?.status || 'none',
        isPaid: !!ref.isPaid,
        milestone,
    };
}

// @desc    Attach invite code after signup if it was missed (Play Store / Flutter race)
// @route   POST /api/user/data/attach-referral
// @access  Private
exports.attachReferral = asyncHandler(async (req, res, next) => {
    const raw =
        req.body.referralCode ||
        req.body.inviteCode ||
        req.body.referral ||
        req.body.ref ||
        req.body.invite ||
        req.headers['x-referral-code'] ||
        '';

    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    if (user.referredBy) {
        return res.status(200).json({ success: true, attached: false, reason: 'already_linked' });
    }

    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    if (ageMs > maxAgeMs) {
        return res.status(400).json({ success: false, message: 'Invite code can only be added within 14 days of signup' });
    }

    const { findReferrerByCode, extractReferralCode } = require('../utils/referralCode');
    let linked = await findReferrerByCode(raw, {
        excludePhone: user.phone,
        excludeEmail: user.email,
        excludeId: user._id,
    });

    if (linked.reason !== 'ok' && !extractReferralCode(raw)) {
        const { consumeReferralClick } = require('../utils/referralClick');
        linked = await consumeReferralClick(req, {
            extraToken: req.body.referralClickId || req.body.clickId || '',
            excludePhone: user.phone,
            excludeEmail: user.email,
            excludeId: user._id,
        });
    }

    if (linked.reason !== 'ok') {
        if (!extractReferralCode(raw)) {
            return res.status(200).json({ success: true, attached: false, reason: 'no_code' });
        }
        return res.status(400).json({
            success: false,
            message: linked.reason === 'self_referral'
                ? 'You cannot use your own invite code'
                : 'Invalid invite code',
        });
    }

    user.referredBy = linked.referrer._id;
    await user.save({ validateBeforeSave: false });
    await User.findByIdAndUpdate(linked.referrer._id, { $inc: { referralCount: 1 } });
    console.log(`[REFERRAL] Attached ${user._id} to referrer ${linked.referrer._id} after signup`);

    try {
        const { creditReferralOnRegister } = require('../utils/referralReward');
        await creditReferralOnRegister(user);
    } catch (refErr) {
        console.error('[REFERRAL] attach-referral credit:', refErr.message);
    }

    res.status(200).json({ success: true, attached: true });
});

// @desc    Get user's referrals list
// @route   GET /api/user/data/referrals
// @access  Private
exports.getReferrals = asyncHandler(async (req, res, next) => {
    const referrerId = req.user._id || req.user.id;
    const settings = await Settings.findOne().select('referralCommission');
    const commission = Number(settings?.referralCommission) > 0 ? Number(settings.referralCommission) : 200;

    const [transactions, invitedUsers] = await Promise.all([
        ReferralTransaction.find({ referrer: referrerId })
            .populate('referredUser', 'name phone createdAt isPaid kyc kycApprovedAt withdrawalCard isBlocked')
            .sort('-createdAt'),
        User.find({ referredBy: referrerId })
            .select('name phone createdAt isPaid kyc kycApprovedAt withdrawalCard isBlocked referredBy')
            .sort('-createdAt'),
    ]);

    const { creditReferralOnRegister } = require('../utils/referralReward');
    let creditedAny = false;
    for (const invitee of invitedUsers) {
        const hasTx = transactions.some((tx) => String(tx.referredUser?._id || tx.referredUser) === String(invitee._id));
        if (!hasTx) {
            try {
                const result = await creditReferralOnRegister(invitee);
                if (result?.credited) creditedAny = true;
            } catch (err) {
                console.error('[REFERRAL] backfill on list failed:', err.message);
            }
        }
    }

    const freshTx = creditedAny
        ? await ReferralTransaction.find({ referrer: referrerId })
            .populate('referredUser', 'name phone createdAt isPaid kyc kycApprovedAt withdrawalCard isBlocked')
            .sort('-createdAt')
        : transactions;

    const txByInvitee = new Map(
        freshTx
            .filter((tx) => tx.referredUser?._id)
            .map((tx) => [String(tx.referredUser._id), tx])
    );

    const seen = new Set();
    const referralsData = [];

    for (const ref of invitedUsers) {
        const id = String(ref._id);
        seen.add(id);
        referralsData.push(mapReferralRow(ref, txByInvitee.get(id) || null, commission));
    }

    for (const tx of freshTx) {
        const ref = tx.referredUser;
        if (!ref?._id || seen.has(String(ref._id))) continue;
        referralsData.push(mapReferralRow(ref, tx, commission));
    }

    const totalRevenue = referralsData.reduce((sum, r) => {
        if (r.status === 'Waiting KYC' || r.status === 'Waiting') return sum;
        return sum + (Number(r.amount) || 0);
    }, 0);

    res.status(200).json({
        success: true,
        count: referralsData.length,
        totalRevenue,
        data: referralsData,
    });
});

// @desc    Update User Profile (name, email, phone)
// @route   PATCH /api/user/data/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
    const { name, email, phone } = req.body;
    
    // Check if email or phone already exists
    if (email) {
        const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
        if (emailExists) {
            return next(new ErrorResponse('Email already registered by another account', 400));
        }
    }
    
    if (phone) {
        const phoneExists = await User.findOne({ phone, _id: { $ne: req.user.id } });
        if (phoneExists) {
            return next(new ErrorResponse('Phone already registered by another account', 400));
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { 
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone })
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: updatedUser
    });
});

// @desc    Get user's estimated Future Fund reward
// @route   GET /api/user/data/future-fund/estimation
// @access  Private
exports.getFutureFundEstimation = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }
    const adWeight = settings.ffAdScoreWeight || 1;
    const taskWeight = settings.ffTaskScoreWeight || 1;
    const boosterMultiplier = settings.ffBoosterMultiplier || 1.5;

    let adScore = user.dailyAdCount || 0;
    if (user.lastAdCountResetAt && user.lastAdCountResetAt < todayStart) adScore = 0;

    let taskScore = 0;
    if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
        taskScore = user.dailyTaskCompletions.filter(tc => new Date(tc.completedAt) >= todayStart).length;
    }

    let multiplier = 1.0;
    if (user.isTaskBoosterActive || user.isSupportBoosterActive) {
        multiplier = boosterMultiplier;
    }

    let baseScore = (adScore * adWeight) + (taskScore * taskWeight);
    if (baseScore === 0) baseScore = 1;

    let finalScore = baseScore * multiplier;

    const activeUsersCount = await User.countDocuments({ 'futureFund.status': 'active' });
    const estimatedTotalScore = activeUsersCount > 0 ? (activeUsersCount * 5) : 5;
    const estimatedPool = activeUsersCount * 25; 

    let estimatedReward = 0;
    if (estimatedTotalScore > 0) {
        estimatedReward = (finalScore / (estimatedTotalScore + finalScore)) * estimatedPool;
    }

    res.status(200).json({
        success: true,
        data: {
            activityScore: finalScore,
            breakdown: {
                ads: adScore,
                tasks: taskScore,
                multiplier: multiplier
            },
            estimatedTotalPool: estimatedPool,
            estimatedReward: Math.floor(estimatedReward * 100) / 100
        }
    });
});

// @desc    Withdrawal Card quote + auto-filled details
// @route   GET /api/user/data/withdrawal-card
// @access  Private
exports.getWithdrawalCard = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    const {
        getCardQuote,
        withdrawableVirtual,
        isVirtualUnlocked,
        applyWalletMaintenance,
        getVirtualAccountView,
    } = require('../utils/walletLedger');
    const { persistPendingWipeEffects } = require('../utils/pendingWipeSideEffects');

    const settings = (await Settings.findOne()) || {};
    const { expiryWipe, kycWipe } = await applyWalletMaintenance(user);
    const quote = getCardQuote(user, settings);
    user.withdrawalCard.quotedAmount = quote.amount;
    user.withdrawalCard.quotedCredit = quote.credit;
    await user.save({ validateBeforeSave: false });
    await persistPendingWipeEffects(user, expiryWipe, kycWipe);

    const issued = new Date();
    const expires = new Date(issued);
    expires.setMonth(expires.getMonth() + 6);

    res.status(200).json({
        success: true,
        data: {
            card: user.withdrawalCard,
            quote,
            preview: {
                name: user.name,
                phone: user.phone,
                issuedAt: issued,
                expiresAt: expires,
            },
            pendingBalance: user.wallet.pendingBalance || 0,
            virtualBalance: user.wallet.virtualBalance || 0,
            withdrawable: withdrawableVirtual(user),
            lockedReserve: user.withdrawalCard?.lockedReserve || 0,
            virtualUnlocked: isVirtualUnlocked(user),
            virtualAccount: getVirtualAccountView(user),
        },
    });
});
