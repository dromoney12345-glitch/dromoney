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

// @desc    Clear personal notifications
// @route   DELETE /api/user/data/notifications
// @access  Private
exports.clearPersonalNotifications = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    
    user.notifications = [];
    await user.save();
    
    res.status(200).json({ success: true, data: {} });
});

// @desc    Update KYC Status and Documents
// @route   PATCH /api/user/data/kyc
// @access  Private
exports.updateKyc = asyncHandler(async (req, res, next) => {
    const { documentNumber } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Check Admin KYC Timing Window (IST)
    const Settings = require('../models/Settings');
    const { isWithinIstWindow } = require('../utils/taskRenewal');
    const settings = await Settings.findOne();
    const kycStart = settings?.kycWindowStart || '07:00';
    const kycEnd = settings?.kycWindowEnd || '19:00';
    if (!isWithinIstWindow(kycStart, kycEnd)) {
        const formatTime = (t) => {
            const [h, m] = t.split(':');
            let hrs = parseInt(h, 10);
            const ampm = hrs >= 12 ? 'pm' : 'am';
            hrs = hrs % 12 || 12;
            const mins = parseInt(m, 10);
            return mins > 0 ? `${hrs}:${m}${ampm}` : `${hrs}${ampm}`;
        };
        return next(new ErrorResponse(`KYC submissions are only available between ${formatTime(kycStart)} and ${formatTime(kycEnd)}`, 400));
    }

    // Prevent resubmission if already Approved/Verified
    if (user.kyc?.status === 'Approved' || user.kyc?.status === 'Verified') {
        return res.status(200).json({
            success: true,
            message: 'KYC already approved'
        });
    }

    if (!req.file) {
        return next(new ErrorResponse('Please upload your Aadhaar Card image', 400));
    }

    if (!documentNumber) {
        return next(new ErrorResponse('Please provide Aadhaar Number', 400));
    }

    // Upload to Cloudinary using Stream (Memory Storage)
    try {
        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'dromoney/kyc',
                        resource_type: 'image',
                        format: 'jpg',
                        public_id: `aadhaar_${user._id}_${Date.now()}`
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
        
        // Update user KYC data
        user.kyc = {
            status: 'Pending',
            documentType: 'Aadhaar',
            documentNumber: documentNumber,
            documentImage: result.secure_url,
            rejectionReason: ''
        };

        user.notifications = user.notifications || [];
        user.notifications.push({
            title: 'KYC Received 📑',
            message: 'Your KYC documents are successfully received. After 1 hour your KYC will be confirmed, please wait.',
            type: 'info',
            createdAt: new Date()
        });

        user.markModified('kyc');
        await user.save();

        try {
            const { notifyJourney } = require('../utils/userJourneyPush');
            await notifyJourney(user._id, 'kyc_submitted', { skipInApp: true });
        } catch (pushErr) {
            console.error('Push notification failed for KYC submission:', pushErr.message);
        }

        // Send Push Notification to Admins
        try {
            const { sendNotificationToAllAdmins } = require('./fcmController');
            await sendNotificationToAllAdmins({
                title: 'KYC Pending Approval 📂',
                body: `User ${user.name} has submitted KYC documents. Review details.`,
                data: {
                    type: 'kyc_alert',
                    link: '/admin/kyc'
                }
            });
        } catch (pushErr) {
            console.error('Admin push notification failed for KYC pending approval:', pushErr.message);
        }
        
        return res.status(200).json({
            success: true,
            message: 'After 1 hour your KYC will be confirmed, please wait.',
            data: {
                status: user.kyc.status,
                documentImage: user.kyc.documentImage
            }
        });
    } catch (err) {
        console.error('KYC UPLOAD ERROR:', err);
        return next(new ErrorResponse(`Upload failed: ${err.message || 'Server error'}`, 500));
    }
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
        const { creditReferralOnQualifiedUnlock } = require('../utils/referralReward');
        await creditReferralOnQualifiedUnlock(user);
    } catch (err) {
        console.error('Simulation Referral Error:', err.message);
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
        const missing = synced.criteria
            .filter((c) => !c.completed)
            .map((c) => `${c.title} (${c.current}/${c.target})`)
            .join(', ');
        return next(new ErrorResponse(`Complete all criteria first: ${missing}`, 400));
    }

    user.futureFund.status = 'active';
    await user.save({ validateBeforeSave: false });

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

// @desc    Get user's referrals list
// @route   GET /api/user/data/referrals
// @access  Private
exports.getReferrals = asyncHandler(async (req, res, next) => {
    const referrerId = req.user._id || req.user.id;
    const { daysSince } = require('../utils/walletLedger');

    const transactions = await ReferralTransaction.find({ referrer: referrerId })
        .populate('referredUser', 'name phone createdAt isPaid kyc kycApprovedAt withdrawalCard isBlocked')
        .sort('-createdAt');

    const referralsData = transactions.map((tx) => {
        const ref = tx.referredUser || {};
        const kycStatus = String(ref.kyc?.status || '').toLowerCase();
        const kycDone = kycStatus === 'approved' || kycStatus === 'verified';
        const cardActive = ref.isPaid && ref.withdrawalCard?.status === 'active';
        const days = kycDone ? daysSince(ref.kycApprovedAt) : null;
        const daysLeft = days != null ? Math.max(0, 28 - days) : null;

        let milestone = 'waiting_kyc';
        if (ref.isBlocked) milestone = 'suspended';
        else if (cardActive) milestone = 'card_active';
        else if (kycDone && days != null) {
            if (days >= 28) milestone = 'suspended';
            else if (days >= 14) milestone = 'day14';
            else if (days >= 7) milestone = 'day7';
            else if (days <= 3) milestone = 'day3_bonus';
            else milestone = 'card_pending';
        }

        return {
            _id: tx._id,
            referredUser: ref._id ? ref : { name: 'Unknown User' },
            name: ref.name || 'Unknown User',
            phone: ref.phone || '',
            amount: tx.amount || 200,
            status: tx.status || 'Pending',
            createdAt: tx.createdAt,
            kycStatus: ref.kyc?.status || 'Not Started',
            kycApprovedAt: ref.kycApprovedAt || null,
            cardStatus: ref.withdrawalCard?.status || 'none',
            isPaid: !!ref.isPaid,
            daysSinceKyc: days,
            daysLeft,
            milestone,
        };
    });

    const totalRevenue = referralsData.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

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
        migrateWalletSplits,
        ensureWithdrawalCardShape,
        getCardQuote,
        withdrawableVirtual,
    } = require('../utils/walletLedger');

    const settings = (await Settings.findOne()) || {};
    migrateWalletSplits(user);
    ensureWithdrawalCardShape(user);
    const quote = getCardQuote(user, settings);
    user.withdrawalCard.quotedAmount = quote.amount;
    user.withdrawalCard.quotedCredit = quote.credit;
    await user.save({ validateBeforeSave: false });

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
            virtualUnlocked: !!user.isPaid && user.withdrawalCard?.status === 'active',
        },
    });
});
