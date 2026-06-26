const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Settings = require('../models/Settings');
const ReferralTransaction = require('../models/ReferralTransaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

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

        user.markModified('kyc');
        await user.save();

        // Send Push Notification to User
        try {
            const { sendNotificationToUser } = require('./fcmController');
            await sendNotificationToUser(user._id, {
                title: 'KYC Received 📑',
                body: 'Your KYC documents are successfully received and are under review by our team.',
                data: {
                    type: 'kyc',
                    link: '/user/profile'
                }
            });
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
            message: 'KYC documents submitted for verification',
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
    
    // Check for referral reward
    if (user.referredBy && !user.isPaid) {
        try {
            const settings = await Settings.findOne();
            const commission = settings ? settings.referralCommission : 200;
            if (settings && settings.referralSystemEnabled) {
                const referrer = await User.findById(user.referredBy);
                if (referrer) {
                    referrer.wallet.balance += commission;
                    referrer.wallet.referralEarnings += commission;
                    referrer.wallet.lifetimeEarnings += commission;
                    referrer.referralCount += 1;
                    await referrer.save();

                    await ReferralTransaction.create({
                        referrer: referrer._id,
                        referredUser: user._id,
                        amount: commission,
                        status: 'Completed'
                    });
                }
            }
        } catch (err) {
            console.error('Simulation Referral Error:', err.message);
        }
    }

    user.isPaid = true;
    user.unlockedAt = new Date();
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Platform unlocked successfully',
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

// @desc    Update Future Fund Progress
// @route   POST /api/user/data/future-fund/progress
// @access  Private
exports.updateFutureFundProgress = asyncHandler(async (req, res, next) => {
    const { type, value } = req.body; // type: 'sales', 'activity', 'days'
    const user = await User.findById(req.user.id);

    if (!user.futureFund) {
        user.futureFund = { progress: 0, criteria: [] };
    }

    // Initialize default criteria if empty
    if (!user.futureFund.criteria || user.futureFund.criteria.length === 0) {
        user.futureFund.criteria = [
            { id: 1, title: 'Successful Sales', target: 10, current: 0, completed: false },
            { id: 2, title: 'Daily Activity', target: 15, current: 0, completed: false },
            { id: 3, title: 'Active Days', target: 7, current: 0, completed: false }
        ];
    }

    const criterion = user.futureFund.criteria.find(c => {
        if (type === 'sales' && c.id === 1) return true;
        if (type === 'activity' && c.id === 2) return true;
        if (type === 'days' && c.id === 3) return true;
        return false;
    });

    if (criterion) {
        if (type === 'activity') {
            criterion.current += value; // value is minutes to add
        } else if (type === 'sales') {
            criterion.current += value; // add successful sales
        } else if (type === 'days') {
            criterion.current = value; // set total active days
        }

        if (criterion.current >= criterion.target) {
            criterion.completed = true;
        }
    }

    // Recalculate total progress
    const totalCriteria = user.futureFund.criteria.length;
    let completedWeight = 0;

    user.futureFund.criteria.forEach(c => {
        // Simple weight: each criterion contributes equally to the 100%
        const ratio = Math.min(c.current / c.target, 1);
        completedWeight += ratio;
    });

    user.futureFund.progress = Math.round((completedWeight / totalCriteria) * 100);

    await user.save();

    res.status(200).json({
        success: true,
        data: user.futureFund
    });
});
// @desc    Unlock Future Fund
// @route   POST /api/user/data/future-fund/unlock
// @access  Private
exports.unlockFutureFund = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (user.futureFund.progress < 100) {
        return next(new ErrorResponse('Please complete all criteria first', 400));
    }

    // Mark as unlocked/active
    user.futureFund.status = 'active'; 
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Future Fund unlocked',
        status: user.futureFund.status
    });
});

// @desc    Get user's referrals list
// @route   GET /api/user/data/referrals
// @access  Private
exports.getReferrals = asyncHandler(async (req, res, next) => {
    // Fetch directly from User collection to ensure no missing referrals (even if transaction is missing)
    const referredUsers = await User.find({ referredBy: req.user.id })
        .select('name phone createdAt')
        .sort('-createdAt');

    // Also fetch transactions to get the exact amounts if needed
    const transactions = await ReferralTransaction.find({ referrer: req.user.id });

    const referralsData = referredUsers.map(user => {
        const tx = transactions.find(t => t.referredUser?.toString() === user._id.toString());
        return {
            _id: tx ? tx._id : user._id,
            referredUser: user,
            amount: tx ? tx.amount : 200, // default commission if tx missing
            status: tx ? tx.status : 'Completed',
            createdAt: user.createdAt
        };
    });

    res.status(200).json({
        success: true,
        count: referralsData.length,
        data: referralsData
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
