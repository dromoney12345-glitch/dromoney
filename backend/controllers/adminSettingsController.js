const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/async');

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();

    // If no settings exist, create default one
    if (!settings) {
        settings = await Settings.create({});
    }

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

    const updateData = {
        ...req.body,
        businessPlans: req.body.businessPlans
    };

    // Ensure referralCommission is never negative
    if (updateData.referralCommission !== undefined) {
        updateData.referralCommission = Math.max(0, Number(updateData.referralCommission) || 0);
    }

    // Ensure minWithdrawal is never negative
    if (updateData.minWithdrawal !== undefined) {
        updateData.minWithdrawal = Math.max(0, Number(updateData.minWithdrawal) || 0);
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

    res.status(200).json({
        success: true,
        data: settings
    });
});
