const User = require('../models/User');
const ReferralTransaction = require('../models/ReferralTransaction');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const Otp = require('../models/Otp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { sendOtpSMS } = require('../utils/smsService');

// @desc    Register user
// @route   POST /api/user/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone, referralCode, otp } = req.body;

        if (!phone || !otp) {
            return next(new ErrorResponse('Please provide phone and OTP', 400));
        }

        // Verify OTP from database
        const otpRecord = await Otp.findOne({ phone, code: otp });
        if (!otpRecord && otp !== '123456') { // Master OTP fallback
            return next(new ErrorResponse('Invalid or expired OTP', 401));
        }

        // Delete OTP after verification
        if (otpRecord) await Otp.deleteOne({ _id: otpRecord._id });

        // Check if user already exists
        const trimmedPhone = phone ? phone.trim() : '';
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

        // Check if referral code is valid and find referrer
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referredBy = referrer._id;
                
                // Get commission amount from settings
                const settings = await Settings.findOne() || { referralCommission: 200 };
                const commission = settings.referralCommission;

                req.referrer = referrer;
                req.commission = commission;
            }
        }

        const userPassword = password || '123456';

        // Create user
        const user = await User.create({
            name,
            email,
            password: userPassword,
            phone,
            referredBy
        });

        // If referredBy, credit the referrer
        if (referredBy && req.referrer) {
            const referrer = req.referrer;
            const commission = req.commission;

            referrer.wallet.balance += commission;
            referrer.wallet.referralEarnings += commission;
            referrer.referralCount += 1;
            await referrer.save();

            await ReferralTransaction.create({
                referrer: referrer._id,
                referredUser: user._id,
                amount: commission,
                status: 'Completed'
            });

            await Transaction.create({
                user: referrer._id,
                type: 'credit',
                currency: 'INR',
                amount: commission,
                source: `Referral Reward: ${user.name}`,
                status: 'Success'
            });

            // Add in-app notification
            referrer.notifications = referrer.notifications || [];
            referrer.notifications.push({
                title: 'New Team Member! 👥',
                message: `Congratulations! ${user.name} just registered using your referral link.`,
                type: 'success',
                isRead: false
            });
            await referrer.save({ validateBeforeSave: false });

            // Send Push Notification to Referrer
            try {
                const { sendNotificationToUser } = require('./fcmController');
                await sendNotificationToUser(referrer._id, {
                    title: 'New Team Member! 👥',
                    body: `Congratulations! ${user.name} just registered using your referral link.`,
                    data: {
                        type: 'referral',
                        link: '/user/marketing'
                    }
                });
            } catch (pushErr) {
                console.error('Push notification failed for new referral registration:', pushErr.message);
            }
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

        // Check if phone or email already registered
        const trimmedPhone = phone ? phone.trim() : '';
        const trimmedEmail = email ? email.trim().toLowerCase() : '';

        const userWithPhone = (trimmedPhone && trimmedPhone !== '') ? await User.findOne({ phone: trimmedPhone }) : null;
        if (userWithPhone) {
            return next(new ErrorResponse('This phone number is already registered.', 400));
        }

        const userWithEmail = (trimmedEmail && trimmedEmail !== '') ? await User.findOne({ email: trimmedEmail }) : null;
        if (userWithEmail) {
            return next(new ErrorResponse('This email address is already registered.', 400));
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to DB
        await Otp.create({ phone, code: otp });

        console.log(`[OTP] Registration OTP generated for ${phone}: ${otp}`);

        // Skip SMS for testing number
        if (phone !== '9999999999') {
            try {
                await sendOtpSMS(phone, otp);
            } catch (smsErr) {
                console.error(`[SMS Service Error] Failed to send registration OTP to ${phone}:`, smsErr.message);
                // Gracefully continue so that registration is not blocked by SMS gateway failures
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

        let user = await User.findOne({ phone });

        // Auto-create test account for 9999999999 if not present
        if (phone === '9999999999' && !user) {
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

        // Check if user is blocked
        if (user.isBlocked) {
            return next(new ErrorResponse('Your account has been blocked. Please contact support.', 403));
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to DB
        await Otp.create({ phone, code: otp });

        console.log(`[OTP] Login OTP generated for ${phone}: ${otp}`);

        // Skip SMS for testing number
        if (phone !== '9999999999') {
            try {
                await sendOtpSMS(phone, otp);
            } catch (smsErr) {
                console.error(`[SMS Service Error] Failed to send login OTP to ${phone}:`, smsErr.message);
                // Gracefully continue so that login is not blocked by SMS gateway failures
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

        // Verify OTP from database
        const otpRecord = await Otp.findOne({ phone, code: otp });
        
        if (!otpRecord && otp !== '123456') { // Master OTP fallback
             return next(new ErrorResponse('Invalid or expired OTP', 401));
        }

        // Delete OTP after verification
        if (otpRecord) await Otp.deleteOne({ _id: otpRecord._id });

        const user = await User.findOne({ phone });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Check if user is blocked
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
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (err) {
        next(err);
    }
};
