const User = require('../models/User');
const Settings = require('../models/Settings');
const BusinessIdea = require('../models/BusinessIdea');
const Otp = require('../models/Otp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { getLastRenewalTick } = require('../utils/taskRenewal');
const { syncFutureFundCriteria } = require('../utils/futureFund');
const { sendOtpSMS, normalizePhone } = require('../utils/smsService');

const { findReferrerByCode } = require('../utils/referralCode');

async function saveOtpForPhone(phone, otp) {
    await Otp.deleteMany({ phone });
    return Otp.create({ phone, code: otp });
}

async function findValidOtp(phone, code) {
    return Otp.findOne({ phone, code: String(code).trim() }).sort({ createdAt: -1 });
}

// @desc    Register user
// @route   POST /api/user/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone, otp } = req.body;
        const rawReferral =
            req.body.referralCode ||
            req.body.inviteCode ||
            req.body.referral ||
            req.body.ref ||
            req.body.invite ||
            req.headers['x-referral-code'] ||
            '';

        if (!phone || !otp) {
            return next(new ErrorResponse('Please provide phone and OTP', 400));
        }

        const trimmedPhoneEarly = normalizePhone(phone);
        const otpCode = String(otp).trim();

        // Mock OTP bypass — ONLY for test number 9999999999
        const isMockTestNumber = trimmedPhoneEarly === '9999999999';
        const isMockOtp = otpCode === '123456';

        // Verify OTP: allow mock bypass for test number, otherwise check DB
        let otpRecord = null;
        if (!(isMockTestNumber && isMockOtp)) {
            otpRecord = await findValidOtp(trimmedPhoneEarly, otpCode);
            if (!otpRecord) {
                return next(new ErrorResponse('Invalid or expired OTP', 401));
            }
        }

        // Delete OTP after verification (skip for mock)
        if (otpRecord) await Otp.deleteMany({ phone: trimmedPhoneEarly });

        // Check if user already exists
        const trimmedPhone = trimmedPhoneEarly;
        const trimmedEmail = email ? email.trim().toLowerCase() : '';

        const userWithPhone = (trimmedPhone && trimmedPhone !== '') ? await User.findOne({ phone: trimmedPhone }) : null;
        if (userWithPhone) {
            return next(new ErrorResponse('This phone number is already registered.', 400));
        }

        // Strict email validation — reject fake/invalid email formats
        if (trimmedEmail) {
            const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            const emailParts = trimmedEmail.split('@');
            const localPart = emailParts[0];
            const domainWithoutTld = emailParts[1]?.split('.')[0];

            if (!emailRegex.test(trimmedEmail)) {
                return next(new ErrorResponse('Please enter a valid email address (e.g. name@gmail.com)', 400));
            }
            // Block fake emails where username == domain name (e.g. suhani@suhani.com)
            if (localPart && domainWithoutTld && localPart === domainWithoutTld) {
                return next(new ErrorResponse('Please use a real email address (e.g. name@gmail.com)', 400));
            }
        }

        const userWithEmail = (trimmedEmail && trimmedEmail !== '') ? await User.findOne({ email: trimmedEmail }) : null;
        if (userWithEmail) {
            return next(new ErrorResponse('This email address is already registered.', 400));
        }

        // Resolve invite code (Play Store link, /join/CODE, or deferred install click)
        // ₹200 is credited to the referrer Pending Wallet immediately on register
        let referredBy = null;
        const linked = await findReferrerByCode(rawReferral, {
            excludePhone: trimmedPhone,
            excludeEmail: trimmedEmail,
        });
        let resolved = linked;
        if (resolved.reason !== 'ok') {
            const incomingCode = require('../utils/referralCode').extractReferralCode(rawReferral);
            if (!incomingCode) {
                const { consumeReferralClick } = require('../utils/referralClick');
                resolved = await consumeReferralClick(req, {
                    extraToken: req.body.referralClickId || req.body.clickId || '',
                    excludePhone: trimmedPhone,
                    excludeEmail: trimmedEmail,
                });
            }
        }
        if (resolved.reason === 'ok') {
            referredBy = resolved.referrer._id;
            console.log(`[REFERRAL] Linked new user to referrer ${referredBy} (code ${resolved.cleanCode}) — ₹200 on register`);
        } else if (rawReferral) {
            console.warn(`[REFERRAL] Invite not attached (${resolved.reason}): ${String(rawReferral).slice(0, 120)}`);
        }

        const userPassword = password || '123456';

        // Create user
        const user = await User.create({
            name,
            email: trimmedEmail || email,
            password: userPassword,
            phone: trimmedPhone || phone,
            referredBy: referredBy || undefined,
        });

        if (referredBy) {
            await User.findByIdAndUpdate(referredBy, { $inc: { referralCount: 1 } });
            try {
                const { creditReferralOnRegister } = require('../utils/referralReward');
                const result = await creditReferralOnRegister(user);
                console.log('[REFERRAL] register credit:', result);
            } catch (refErr) {
                console.error('[REFERRAL] register credit failed:', refErr.message);
            }
        }

        try {
            const { notifyJourney } = require('../utils/userJourneyPush');
            await notifyJourney(user._id, 'welcome');
        } catch (pushErr) {
            console.error('Welcome push failed:', pushErr.message);
        }

        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Send OTP for Registration
// @route   POST /api/user/auth/send-otp-register
// @access  Public
exports.sendRegisterOtp = async (req, res, next) => {
    try {
        const { phone, email } = req.body;

        if (!phone) {
            return next(new ErrorResponse('Please provide a phone number', 400));
        }

        const trimmedPhone = normalizePhone(phone);
        const trimmedEmail = email ? email.trim().toLowerCase() : '';

        if (!/^[6-9]\d{9}$/.test(trimmedPhone) && trimmedPhone !== '9999999999') {
            return next(new ErrorResponse('Please enter a valid 10-digit mobile number', 400));
        }

        const userWithPhone = trimmedPhone ? await User.findOne({ phone: trimmedPhone }) : null;
        if (userWithPhone) {
            return next(new ErrorResponse('This phone number is already registered.', 400));
        }

        const userWithEmail = trimmedEmail ? await User.findOne({ email: trimmedEmail }) : null;
        if (userWithEmail) {
            return next(new ErrorResponse('This email address is already registered.', 400));
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtpForPhone(trimmedPhone, otp);

        console.log(`[OTP] Registration OTP generated for ${trimmedPhone}`);

        if (trimmedPhone !== '9999999999') {
            try {
                await sendOtpSMS(trimmedPhone, otp);
            } catch (smsErr) {
                console.error(`[SMS Service Error] Failed to send registration OTP to ${trimmedPhone}:`, smsErr.message);
                await Otp.deleteMany({ phone: trimmedPhone });
                return next(new ErrorResponse('OTP SMS could not be sent. Please try again in a minute.', 502));
            }
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Send OTP for Login
// @route   POST /api/user/auth/send-otp
// @access  Public
exports.sendLoginOtp = async (req, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return next(new ErrorResponse('Please provide a phone number', 400));
        }

        const trimmedPhone = normalizePhone(phone);
        if (!/^[6-9]\d{9}$/.test(trimmedPhone) && trimmedPhone !== '9999999999') {
            return next(new ErrorResponse('Please enter a valid 10-digit mobile number', 400));
        }

        let user = await User.findOne({ phone: trimmedPhone });

        // Auto-create test account for 9999999999 if not present
        if (trimmedPhone === '9999999999' && !user) {
            user = await User.create({
                name: 'Test Account',
                email: 'testaccount@gmail.com',
                phone: '9999999999',
                password: 'password123',
                isPaid: true
            });
        }

        if (!user) {
            return next(new ErrorResponse('No account found with this phone number. Please register.', 404));
        }

        if (user.isBlocked) {
            return next(new ErrorResponse('Your account has been blocked. Please contact support.', 403));
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtpForPhone(trimmedPhone, otp);

        console.log(`[OTP] Login OTP generated for ${trimmedPhone}`);

        if (trimmedPhone !== '9999999999') {
            try {
                await sendOtpSMS(trimmedPhone, otp);
            } catch (smsErr) {
                console.error(`[SMS Service Error] Failed to send login OTP to ${trimmedPhone}:`, smsErr.message);
                await Otp.deleteMany({ phone: trimmedPhone });
                return next(new ErrorResponse('OTP SMS could not be sent. Please try again in a minute.', 502));
            }
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Verify OTP and Login
// @route   POST /api/user/auth/verify-otp
// @access  Public
exports.verifyLoginOtp = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return next(new ErrorResponse('Please provide phone and OTP', 400));
        }

        const trimmedPhone = normalizePhone(phone);
        const code = String(otp).trim();

        // Mock OTP bypass — ONLY for test number 9999999999
        const isMockTestNumber = trimmedPhone === '9999999999';
        const isMockOtp = code === '123456';

        let otpRecord = null;
        if (!(isMockTestNumber && isMockOtp)) {
            otpRecord = await findValidOtp(trimmedPhone, code);
            if (!otpRecord) {
                return next(new ErrorResponse('Invalid or expired OTP', 401));
            }
        }

        if (otpRecord) await Otp.deleteMany({ phone: trimmedPhone });

        const user = await User.findOne({ phone: trimmedPhone });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        if (user.isBlocked) {
            return next(new ErrorResponse('Your account has been blocked. Please contact support.', 403));
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Login user (Legacy fallback for email/password)
// @route   POST /api/user/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide an email and password', 400));
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return next(new ErrorResponse('Your account has been blocked. Please contact support.', 403));
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            // Increment failed login attempts
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            await user.save();

            // Check if attempts reached 3 or more
            if (user.failedLoginAttempts >= 3) {
                try {
                    const { sendNotificationToAllAdmins } = require('./fcmController');
                    await sendNotificationToAllAdmins({
                        title: 'Security Alert 🚨',
                        body: `Multiple failed login attempts or rapid IP switches detected for ${user.name}.`,
                        data: {
                            type: 'security_alert',
                            link: '/admin/users'
                        }
                    });
                } catch (pushErr) {
                    console.error('Admin push notification failed for security alert:', pushErr.message);
                }
            }

            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Reset failed login attempts on success
        if (user.failedLoginAttempts > 0) {
            user.failedLoginAttempts = 0;
            await user.save();
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isPaid: user.isPaid
        }
    });
};

// @desc    Get current logged in user
// @route   GET /api/user/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        let user = await User.findById(req.user.id);
        const settings = await Settings.findOne() || {};

        if (user) {
            let modified = false;

            // 1. Clear old style completedTasks so they can be renewed
            if (user.completedTasks && user.completedTasks.length > 0) {
                user.completedTasks = [];
                modified = true;
            }

            // 2. Filter dailyTaskCompletions older than renewal hours
            if (user.dailyTaskCompletions && user.dailyTaskCompletions.length > 0) {
                const lastRenewalTick = getLastRenewalTick(settings);
                const activeCompletions = user.dailyTaskCompletions.filter(
                    c => new Date(c.completedAt) >= lastRenewalTick
                );
                
                if (activeCompletions.length !== user.dailyTaskCompletions.length) {
                    user.dailyTaskCompletions = activeCompletions;
                    modified = true;
                }
            }

            // 3. Check booster expiry
            if (user.isBoosterActive && user.boosterExpiry && new Date(user.boosterExpiry) <= new Date()) {
                user.isBoosterActive = false;
                modified = true;
            }
            if (user.isSupportBoosterActive && user.supportBoosterExpiry && new Date(user.supportBoosterExpiry) <= new Date()) {
                user.isSupportBoosterActive = false;
                modified = true;
            }
            if (user.isTaskBoosterActive && user.taskBoosterExpiry && new Date(user.taskBoosterExpiry) <= new Date()) {
                user.isTaskBoosterActive = false;
                modified = true;
            }

            // 4. Sync Future Fund criteria (invites / ads / tasks)
            try {
                const ff = await syncFutureFundCriteria(user, settings);
                if (ff.modified) modified = true;
            } catch (ffErr) {
                console.error('Future Fund sync on getMe failed:', ffErr.message);
            }

            try {
                const { applyWalletMaintenance } = require('../utils/walletLedger');
                const { persistPendingWipeEffects } = require('../utils/pendingWipeSideEffects');
                const { applyInviteDay28IfDue } = require('../utils/referralReward');
                const { sendFirstTimeVaReminders } = require('../utils/journeyReminders');
                const { expiryWipe, kycWipe, migrated } = await applyWalletMaintenance(user);
                const claw = await applyInviteDay28IfDue(user);
                const reminderChanged = await sendFirstTimeVaReminders(user);
                const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
                if (Date.now() - last > 60 * 60 * 1000) {
                    user.lastActiveAt = new Date();
                    if (user.inactiveReminderSent) user.inactiveReminderSent = false;
                    modified = true;
                }
                if (migrated || expiryWipe.cyclesApplied > 0 || kycWipe.cyclesApplied > 0 || claw.applied || reminderChanged) {
                    modified = true;
                }
                if (modified) {
                    await user.save({ validateBeforeSave: false });
                }
                await persistPendingWipeEffects(user, expiryWipe, kycWipe);
            } catch (wErr) {
                console.error('Wallet split migrate failed:', wErr.message);
                if (modified) {
                    await user.save({ validateBeforeSave: false });
                }
            }

            // Backfill invite commission for referred users (idempotent)
            if (user.referredBy) {
                try {
                    const { creditReferralOnRegister } = require('../utils/referralReward');
                    await creditReferralOnRegister(user);
                } catch (refErr) {
                    console.error('[REFERRAL] getMe credit failed:', refErr.message);
                }
            }
        }

        const userObj = user.toObject();
        const { quoteMegaEligibility } = require('../utils/moneyQuotes');
        const { getVirtualAccountView } = require('../utils/walletLedger');
        userObj.megaEligibility = quoteMegaEligibility(user.wallet?.balance);
        userObj.virtualAccount = getVirtualAccountView(user);

        res.status(200).json({
            success: true,
            data: userObj,
            settings: {
                referralLinkBaseUrl: require('../utils/referralCode').normalizeReferralLinkBaseUrl(
                    settings.referralLinkBaseUrl
                )
            }
        });
    } catch (err) {
        next(err);
    }
};
