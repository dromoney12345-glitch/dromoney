const Settings = require('../models/Settings');
const User = require('../models/User');
const { extractReferralCode, normalizeReferralLinkBaseUrl } = require('../utils/referralCode');
const { migratePdfActivationSettings } = require('../utils/futureFund');

// @desc    Get Public Settings (Subset of settings for users)
// @route   GET /api/public/settings
// @access  Public
exports.getPublicSettings = async (req, res) => {
    try {
        await migratePdfActivationSettings();
        const settings = await Settings.findOne().select('appName contactEmail contactPhone adminUpiId qrScannerImage bankDetails referralSystemEnabled referralCommission referralLinkBaseUrl registrationFee minWithdrawal offerwallEnabled futureFundKycTarget futureFundDailyTasksTarget futureFundWatchAdTarget futureFundEventsTarget futureFundBoostersTarget futureFundSalesTarget futureFundDaysTarget futureFundActivityMinutes businessPlans maintenanceMode registrationOpen taskWindowStart taskWindowEnd taskRenewalHours kycWindowStart kycWindowEnd');
        
        // Add fallbacks for existing documents that might not have newer schema fields
        const responseData = settings ? settings.toObject() : {
            referralCommission: 200,
            referralSystemEnabled: true,
            offerwallEnabled: false,
            registrationFee: 499,
            businessPlans: [
                {
                    title: 'Pro Membership',
                    subtitle: 'अपना बिजनेस शुरू करें...',
                    price: 499,
                    duration: '/ Yearly',
                    durationInDays: 30,
                    benefits: [
                        { title: '24/7 Expert Support', subtitle: 'Premium Benefit unlocked', iconType: 'support', colorType: 'emerald' },
                        { title: 'Weekly Live Meetings', subtitle: 'Premium Benefit unlocked', iconType: 'meeting', colorType: 'indigo' },
                        { title: 'Daily Strategies', subtitle: 'Premium Benefit unlocked', iconType: 'zap', colorType: 'amber' }
                    ]
                }
            ],
            futureFundKycTarget: 10,
            futureFundDailyTasksTarget: 50,
            futureFundWatchAdTarget: 50,
            futureFundEventsTarget: 3,
            futureFundBoostersTarget: 1,
            futureFundSalesTarget: 10,
            futureFundDaysTarget: 7,
            futureFundActivityMinutes: 15
        };

        if (settings && !responseData.adminUpiId) {
            responseData.adminUpiId = 'BHARATPE2R0P0Z7W3H84355@unitype';
        }
        if (settings && !responseData.qrScannerImage) {
            responseData.qrScannerImage = '/payment-qr.png';
        }
        if (settings && !responseData.taskRenewalHours) {
            responseData.taskRenewalHours = 24;
        }
        if (settings && !responseData.futureFundActivityMinutes) {
            responseData.futureFundActivityMinutes = 15;
        }
        if (settings && responseData.offerwallEnabled == null) {
            responseData.offerwallEnabled = false;
        }
        if (settings && !responseData.futureFundKycTarget) {
            responseData.futureFundKycTarget = responseData.futureFundSalesTarget || 10;
        }
        if (settings && !responseData.futureFundWatchAdTarget) {
            responseData.futureFundWatchAdTarget = 50;
        }
        if (settings && !responseData.futureFundDailyTasksTarget) {
            responseData.futureFundDailyTasksTarget = 50;
        }
        if (settings && !responseData.kycWindowStart) {
            responseData.kycWindowStart = '07:00';
        }
        if (settings && !responseData.kycWindowEnd) {
            responseData.kycWindowEnd = '19:00';
        }
        responseData.referralLinkBaseUrl = normalizeReferralLinkBaseUrl(responseData.referralLinkBaseUrl);
        
        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get Referrer details by referral code
// @route   GET /api/public/referrer/:code
// @access  Public
exports.getReferrerName = async (req, res) => {
    try {
        const { code } = req.params;
        const cleanCode = extractReferralCode(code);
        if (!cleanCode) {
            return res.status(404).json({ success: false, message: 'Invalid Invite Code' });
        }
        const referrer = await User.findOne({ referralCode: new RegExp(`^${cleanCode}$`, 'i') }).select('name');
        if (!referrer) {
            return res.status(404).json({ success: false, message: 'Invalid Referral Code' });
        }
        res.status(200).json({
            success: true,
            name: referrer.name
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Record invite-link open before Play Store install (deferred attribution)
// @route   POST /api/public/referral-click
// @access  Public
exports.recordReferralClick = async (req, res) => {
    try {
        const { recordReferralClick } = require('../utils/referralClick');
        const raw =
            req.body.referralCode ||
            req.body.code ||
            req.body.ref ||
            req.body.invite ||
            '';
        const result = await recordReferralClick(req, raw);
        res.status(200).json({
            success: true,
            recorded: !!result.recorded,
            clickId: result.clickId || '',
            code: result.code || '',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
