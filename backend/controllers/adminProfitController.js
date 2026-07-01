const AdminProfit = require('../models/AdminProfit');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all admin profits
// @route   GET /api/admin/profits
// @access  Private/Admin
exports.getAdminProfits = asyncHandler(async (req, res, next) => {
    const profits = await AdminProfit.find().populate('event', 'title tag').sort('-createdAt');

    res.status(200).json({
        success: true,
        count: profits.length,
        data: profits
    });
});
