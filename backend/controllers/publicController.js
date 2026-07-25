const Settings = require('../models/Settings');
const User = require('../models/User');

// @desc    Get Public Settings (Subset of settings for users)
// @route   GET /api/public/settings
// @access  Public
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne().select('appName contactEmail contactPhone adminUpiId qrScannerImage bankDetails referralSystemEnabled referralCommission registrationFee minWithdrawal futureFundDailyTasksTarget futureFundWatchAdTarget futureFundEventsTarget futureFundBoostersTarget futureFundSalesTarget futureFundDaysTarget businessPlans maintenanceMode registrationOpen taskWindowStart taskWindowEnd');
        
        // Add fallbacks for existing documents that might not have newer schema fields
        const responseData = settings ? settings.toObject() : {
            referralCommission: 200,
            referralSystemEnabled: true,
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
            futureFundDailyTasksTarget: 10,
            futureFundWatchAdTarget: 5,
            futureFundEventsTarget: 3,
            futureFundBoostersTarget: 1,
            futureFundSalesTarget: 10,
            futureFundDaysTarget: 7
        };

        if (settings && !responseData.adminUpiId) {
            responseData.adminUpiId = 'dromoney@upi'; // Default fallback
        }
        
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
        const referrer = await User.findOne({ referralCode: code.toUpperCase() }).select('name');
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
