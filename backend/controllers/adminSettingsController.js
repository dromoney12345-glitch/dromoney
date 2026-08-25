const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/async');
const { persistPdfActivationDefaults, migratePdfActivationSettings } = require('../utils/futureFund');

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();

    // If no settings exist, create default one
    if (!settings) {
        settings = await Settings.create({});
    }
    await migratePdfActivationSettings();
    settings = await Settings.findOne();
    await persistPdfActivationDefaults(settings);

    const admin = await Admin.findOne();
    const settingsObj = settings.toObject();
    
    if (admin) {
        settingsObj.adminEmail = admin.email;
    }

    res.status(200).json({
        success: true,
        data: settingsObj
    });
});

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    const wasMaintenance = !!(settings && settings.maintenanceMode);

    const updateData = { ...req.body };
    if (updateData.businessPlans === undefined) {
        delete updateData.businessPlans;
    }
    Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
    });

    if (updateData.referralLinkBaseUrl !== undefined) {
        const { normalizeReferralLinkBaseUrl } = require('../utils/referralCode');
        updateData.referralLinkBaseUrl = normalizeReferralLinkBaseUrl(updateData.referralLinkBaseUrl);
    }

    // Ensure referralCommission is never negative
    if (updateData.referralCommission !== undefined) {
        updateData.referralCommission = Math.max(0, Number(updateData.referralCommission) || 0);
    }

    // Ensure minWithdrawal is never negative
    if (updateData.minWithdrawal !== undefined) {
        updateData.minWithdrawal = Math.max(0, Number(updateData.minWithdrawal) || 0);
    }

    if (updateData.offerwallUserSharePercent !== undefined) {
        const pct = Number(updateData.offerwallUserSharePercent);
        updateData.offerwallUserSharePercent = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 100));
    }

    if (updateData.offerwallEnabled !== undefined) {
        updateData.offerwallEnabled = !!updateData.offerwallEnabled;
    }

    ['futureFundKycTarget', 'futureFundWatchAdTarget', 'futureFundDailyTasksTarget'].forEach((key) => {
        if (updateData[key] !== undefined) {
            updateData[key] = Math.max(1, Number(updateData[key]) || 1);
        }
    });
    if (updateData.futureFundKycTarget !== undefined) {
        updateData.futureFundSalesTarget = updateData.futureFundKycTarget;
    }

    if (!settings) {
        settings = await Settings.create(updateData);
    } else {
        settings = await Settings.findOneAndUpdate({}, { $set: updateData }, {
            new: true,
            runValidators: true
        });
    }

    // Update Admin email/password if provided
    if (req.body.adminEmail || req.body.adminPassword) {
        const admin = await Admin.findOne();
        if (admin) {
            if (req.body.adminEmail) admin.email = req.body.adminEmail;
            if (req.body.adminPassword) admin.password = req.body.adminPassword;
            await admin.save();
        }
    }

    if (settings?.maintenanceMode && !wasMaintenance) {
        try {
            const { JOURNEY_STEPS } = require('../utils/userJourneyPush');
            const { deliverNotification } = require('./notificationController');
            const Notification = require('../models/Notification');
            const def = JOURNEY_STEPS.maintenance;
            const notification = await Notification.create({
                title: def.title,
                message: def.body,
                type: 'alert',
                audience: 'all',
                status: 'sent',
                targetUrl: '/user/home',
            });
            await deliverNotification(notification);
            settings.maintenanceNotifiedAt = new Date();
            await settings.save();
        } catch (err) {
            console.error('Maintenance notify failed:', err.message);
        }
    }

    res.status(200).json({
        success: true,
        data: settings
    });
});
