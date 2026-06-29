const ErrorResponse = require('../utils/errorResponse');

exports.validateCreatePayment = (req, res, next) => {
    const { amount, orderType } = req.body;

    if (!amount || amount < 1) {
        return next(new ErrorResponse('Please provide a valid amount (minimum 1)', 400));
    }

    const validOrderTypes = ['WALLET_RECHARGE', 'SUBSCRIPTION', 'BOOSTER'];
    if (!orderType || !validOrderTypes.includes(orderType)) {
        return next(new ErrorResponse(`Please provide a valid orderType. Allowed: ${validOrderTypes.join(', ')}`, 400));
    }

    next();
};

exports.validateVerifyPayment = (req, res, next) => {
    const { orderId } = req.body;

    if (!orderId) {
        return next(new ErrorResponse('Please provide an orderId to verify', 400));
    }

    next();
};
