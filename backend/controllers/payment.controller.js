const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const UpigatewayService = require('../services/upigateway.service');

// @desc    Initiate UPIGateway Payment
// @route   POST /api/payment/create
// @access  Private
exports.createPayment = asyncHandler(async (req, res, next) => {
    const { amount, orderType, remarks } = req.body;

    // Generate unique order ID
    const orderId = `ZP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Save payment as PENDING
    const payment = await Payment.create({
        orderId,
        user: req.user.id,
        amount: Number(amount),
        orderType,
        remarks,
        status: 'Pending',
        gateway: 'UPIGateway'
    });

    // 2. Call UPIGateway API via service layer
    try {
        const gatewayResponse = await UpigatewayService.createPaymentLink({
            orderId,
            amount: Number(amount),
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
        });

        // 3. Save gateway response (optional audit)
        payment.gatewayResponse = gatewayResponse;
        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Payment initiated successfully',
            data: {
                orderId: payment.orderId,
                paymentUrl: gatewayResponse?.data?.paymentLinkString,
                upiIntent: gatewayResponse?.data?.deepLinkString,
                qrCode: gatewayResponse?.data?.deepLinkString // fallback QR data
            }
        });
    } catch (error) {
        // If gateway fails, mark order as Failed
        payment.status = 'Failed';
        payment.remarks = 'Gateway initiation failed';
        await payment.save();

        return next(new ErrorResponse(error.message || 'Payment initiation failed', 500));
    }
});

// @desc    Verify Zuelpay Payment (S2S)
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
    const { orderId } = req.body;

    // 1. Fetch payment
    const payment = await Payment.findOne({ orderId }).populate('user');
    
    if (!payment) {
        return next(new ErrorResponse('Invalid order ID', 404));
    }

    // IDEMPOTENCY CHECK: If already verified, do not process again
    if (payment.verified || payment.status === 'Success') {
        return res.status(200).json({
            success: true,
            message: 'Payment already verified',
            data: payment
        });
    }

    if (payment.status === 'Failed' || payment.status === 'CANCELLED') {
        return next(new ErrorResponse('Payment already marked as failed or cancelled', 400));
    }

    // 2. Call Zuelpay Verify API via service layer
    try {
        const verificationResponse = await ZuelpayService.verifyPayment(orderId);
        
        // Ensure the response is genuinely successful based on Zuelpay docs (e.g. status === 'success')
        const isSuccess = verificationResponse?.status === 'success' || verificationResponse?.status === 'SUCCESS';
        
        if (isSuccess) {
            // Compare amount as an extra security check
            const gatewayAmount = Number(verificationResponse?.data?.amount || verificationResponse?.amount);
            if (gatewayAmount && gatewayAmount < payment.amount) {
                // Amount mismatch (partial payment anomaly)
                payment.status = 'Failed';
                payment.remarks = 'Amount mismatch detected during verification';
                await payment.save();
                return next(new ErrorResponse('Payment verification failed due to amount mismatch', 400));
            }

            // Update Payment Document atomically
            payment.status = 'Success';
            payment.verified = true;
            payment.transactionId = verificationResponse?.data?.transaction_id || verificationResponse?.transaction_id;
            payment.gatewayResponse = verificationResponse;
            await payment.save();

            // Handle Business Logic (Wallet/Subscription) AFTER S2S verification
            await handlePaymentSuccess(payment);

            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: payment
            });
        } else {
            payment.status = 'Failed';
            payment.gatewayResponse = verificationResponse;
            await payment.save();
            return next(new ErrorResponse('Payment verification failed by gateway', 400));
        }
    } catch (error) {
        console.error('[Payment Verify Controller Error]:', error);
        return next(new ErrorResponse(error.message || 'Payment verification failed', 500));
    }
});

// @desc    Get Payment Status
// @route   GET /api/payment/status/:orderId
// @access  Private
exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) {
        return next(new ErrorResponse('Payment not found', 404));
    }

    // Make sure user owns the payment
    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to access this payment', 403));
    }

    res.status(200).json({
        success: true,
        data: payment
    });
});

// @desc    Webhook for UPIGateway (Server to Server Async)
// @route   POST /api/payment/webhook
// @access  Public
exports.paymentWebhook = asyncHandler(async (req, res, next) => {
    // 1. Verify webhook signature
    const signature = req.headers['x-webhook-signature'] || req.headers['signature'];
    const payloadData = req.body.data || req.body;

    const isValid = UpigatewayService.verifyWebhookSignature(req.body, signature);
    if (!isValid && process.env.NODE_ENV !== 'development') {
        console.warn('Webhook signature mismatch');
    }

    // UPIGateway typical format: { client_txn_id, status, upi_txn_id }
    const order_id = payloadData.client_txn_id || payloadData.orderCode || req.body.orderCode || req.body.order_id;
    const incoming_status = payloadData.status || req.body.status;
    const transaction_id = payloadData.upi_txn_id || payloadData.txn_id || payloadData.transactionId || req.body.transaction_id;
    const txn_date = payloadData.txn_date || req.body.txn_date;
    
    if (!order_id) {
        console.log('Webhook test received or missing order_id. Payload:', req.body);
        return res.status(200).send('Test webhook received');
    }

    const payment = await Payment.findOne({ orderId: order_id }).populate('user');
    if (!payment) return res.status(404).send('Payment not found');

    // IDEMPOTENCY CHECK
    if (payment.verified || payment.status === 'Success') {
        return res.status(200).send('Already processed');
    }

    // STRICT SERVER-TO-SERVER SECURITY VALIDATION
    // We do NOT trust the incoming webhook blindly. We check with the Gateway directly!
    const gatewayVerification = await UpigatewayService.checkOrderStatus(order_id, txn_date);
    
    // Check if the gateway actually confirms this order was paid successfully
    const isValidPayment = 
        gatewayVerification && 
        (gatewayVerification.status === true || gatewayVerification.status === 'success' || gatewayVerification.status === 'SUCCESS') &&
        (gatewayVerification.data?.status === 'success' || gatewayVerification.data?.status === 'SUCCESS' || gatewayVerification.data?.status === 'PAID');

    // Also compare amount as an extra security check if provided in verification
    if (isValidPayment && gatewayVerification.data && gatewayVerification.data.amount) {
        const paidAmount = Number(gatewayVerification.data.amount);
        if (paidAmount < payment.amount) {
            payment.status = 'Failed';
            payment.remarks = 'Amount mismatch detected during secure validation';
            await payment.save();
            return res.status(400).send('Amount mismatch');
        }
    }

    if (isValidPayment || incoming_status === 'PAID' || incoming_status === 'SUCCESS' || incoming_status === 'success') {
        // If strictly valid OR if in dev mode
        if (!isValidPayment && process.env.NODE_ENV !== 'development') {
            return res.status(403).send('Gateway validation failed');
        }

        payment.status = 'Success';
        payment.verified = true;
        payment.transactionId = transaction_id || gatewayVerification?.data?.upi_txn_id || payment.transactionId;
        payment.gatewayResponse = gatewayVerification || req.body;
        await payment.save();

        await handlePaymentSuccess(payment);
    } else if (incoming_status === 'FAILED' || incoming_status === 'failed' || incoming_status === 'CANCELLED') {
        payment.status = 'Failed';
        payment.gatewayResponse = req.body;
        await payment.save();
    }

    res.status(200).send('Webhook securely processed');
});

/**
 * Handle Business Logic on Successful Payment (Private Helper)
 */
async function handlePaymentSuccess(payment) {
    const user = payment.user; // populated
    
    // ALWAYS record in Transaction model so it shows in User History and Admin Panel
    await Transaction.create({
        user: user._id,
        type: payment.orderType === 'WALLET_RECHARGE' ? 'credit' : 'debit',
        currency: payment.currency || 'INR',
        amount: payment.amount,
        source: `UPIGateway: ${payment.orderType}`,
        status: 'Success'
    });

    if (payment.orderType === 'WALLET_RECHARGE') {
        // Atomic update to avoid race conditions
        await User.findByIdAndUpdate(user._id, {
            $inc: { 'wallet.balance': payment.amount }
        });
    } else if (payment.orderType === 'SUBSCRIPTION') {
        // Subscription activation
        await User.findByIdAndUpdate(user._id, {
            isPaid: true,
            unlockedAt: new Date()
        });
    } else if (payment.orderType === 'BOOSTER') {
        // Booster activation
        await User.findByIdAndUpdate(user._id, {
            isTaskBoosterActive: true,
            taskBoosterExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 Hours
        });
    }
}
