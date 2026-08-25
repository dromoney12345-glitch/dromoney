const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const BulkpeService = require('../services/bulkpe.service');

// @desc    Initiate Bulkpe Payment
// @route   POST /api/payment/create
// @access  Private
exports.createPayment = asyncHandler(async (req, res, next) => {
    const { amount, orderType, remarks } = req.body;

    // Generate unique order ID
    const orderId = `BP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const mappedType =
        orderType === 'SUBSCRIPTION' || orderType === 'PLATFORM_UNLOCK'
            ? 'PLATFORM_UNLOCK'
            : orderType === 'SUPPORT_BOOSTER' || orderType === 'TASK_BOOSTER'
              ? orderType
              : 'PLATFORM_UNLOCK';

    const { assertNoDuplicatePayment, createPaymentOnce } = require('../utils/paymentGuards');
    await assertNoDuplicatePayment(req.user.id, mappedType);

    // 1. Save payment as PENDING (once)
    const payment = await createPaymentOnce({
        orderId,
        user: req.user.id,
        userName: req.user.name || '',
        userEmail: req.user.email || '',
        userPhone: req.user.phone || '',
        amount: Number(amount),
        paymentType: mappedType,
        remarks,
        status: 'Pending',
        gateway: 'Bulkpe',
        method: 'Bulkpe',
    });

    // 2. Call Bulkpe API via service layer
    try {
        const gatewayResponse = await BulkpeService.createDynamicQR({
            orderId,
            amount: Number(amount),
            customerName: req.user.name,
            customerEmail: req.user.email,
            customerPhone: req.user.phone
        });

        // 3. Save gateway response (optional audit)
        payment.gatewayResponse = gatewayResponse;
        await payment.save();

        // Extract payment link/QR from Bulkpe response (adjust fields as per actual API docs)
        const paymentUrl = gatewayResponse?.data?.payment_url || gatewayResponse?.data?.url || gatewayResponse?.payment_url;
        const upiIntent = gatewayResponse?.data?.upi_intent || gatewayResponse?.upi_intent;
        const qrCode = gatewayResponse?.data?.qr_code || gatewayResponse?.qr_code;

        res.status(200).json({
            success: true,
            message: 'Payment initiated successfully',
            data: {
                orderId: payment.orderId,
                paymentUrl: paymentUrl,
                upiIntent: upiIntent,
                qrCode: qrCode || upiIntent // fallback QR data
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

// @desc    Webhook for Bulkpe (Server to Server Async)
// @route   POST /api/payment/webhook
// @access  Public
exports.paymentWebhook = asyncHandler(async (req, res, next) => {
    // Bulkpe typical webhook parsing
    const payloadData = req.body.data || req.body;
    
    // Attempt to extract order ID from various common Bulkpe/PG keys
    const order_id = payloadData.reference_id || payloadData.order_id || payloadData.client_txn_id || req.body.reference_id;
    const incoming_status = payloadData.status || req.body.status;
    const transaction_id = payloadData.transaction_id || payloadData.bank_ref_no || payloadData.upi_txn_id || req.body.transaction_id;
    
    if (!order_id) {
        console.log('Webhook test received or missing order_id. Payload:', req.body);
        return res.status(200).send('Test webhook received');
    }

    const payment = await Payment.findOne({ orderId: order_id }).populate('user');
    if (!payment) {
        console.warn(`[Webhook] Payment not found for order_id: ${order_id}. Might be a test webhook.`);
        return res.status(200).send('Payment not found or test webhook received');
    }

    // IDEMPOTENCY CHECK
    if (payment.verified || payment.status === 'Success') {
        return res.status(200).send('Already processed');
    }

    // STRICT SERVER-TO-SERVER SECURITY VALIDATION
    // We check with Bulkpe directly to prevent webhook spoofing!
    let isValidPayment = false;
    let gatewayVerification = null;

    try {
        gatewayVerification = await BulkpeService.checkOrderStatus(order_id);
        
        // Check if Bulkpe confirms this order was paid successfully
        isValidPayment = 
            gatewayVerification && 
            (gatewayVerification.status === true || gatewayVerification.status === 'success' || gatewayVerification.status === 'SUCCESS') &&
            (gatewayVerification.data?.status === 'success' || gatewayVerification.data?.status === 'SUCCESS' || gatewayVerification.data?.status === 'PAID' || gatewayVerification.data?.status === 'COMPLETED');
            
        // Security check: Amount validation
        if (isValidPayment && gatewayVerification.data && gatewayVerification.data.amount) {
            const paidAmount = Number(gatewayVerification.data.amount);
            if (paidAmount < payment.amount) {
                payment.status = 'Failed';
                payment.remarks = 'Amount mismatch detected during secure validation';
                await payment.save();
                return res.status(400).send('Amount mismatch');
            }
        }
    } catch (err) {
        console.warn('Failed to securely verify order with Bulkpe:', err.message);
    }

    const isIncomingSuccess = incoming_status === 'PAID' || incoming_status === 'SUCCESS' || incoming_status === 'success' || incoming_status === 'COMPLETED';

    if (isValidPayment || isIncomingSuccess) {
        // If strictly valid OR if in dev mode fallback
        if (!isValidPayment && process.env.NODE_ENV !== 'development') {
            return res.status(403).send('Gateway validation failed');
        }

        payment.status = 'Success';
        payment.verified = true;
        payment.transactionId = transaction_id || gatewayVerification?.data?.transaction_id || payment.transactionId;
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
    } else if (payment.orderType === 'SUBSCRIPTION' || payment.orderType === 'PLATFORM_UNLOCK') {
        const { activateVirtualWallet } = require('../utils/walletLedger');
        const fresh = await User.findById(user._id);
        if (fresh) {
            const isRenewal = String(fresh.withdrawalCard?.status) === 'expired';
            await activateVirtualWallet(fresh, { isRenewal });
            await fresh.save({ validateBeforeSave: false });
            user.isPaid = true;
            try {
                const { notifyJourney } = require('../utils/userJourneyPush');
                await notifyJourney(fresh._id, isRenewal ? 'va_renewed' : 'va_activated');
            } catch (pushErr) {
                console.error('VA payment notify failed:', pushErr.message);
            }
        }

        try {
            const { afterVirtualAccountActivated } = require('../utils/referralReward');
            await afterVirtualAccountActivated(fresh || user);
        } catch (refErr) {
            console.error('[REFERRAL ERROR] Failed to process reward in Bulkpe Webhook:', refErr.message);
        }
    } else if (payment.orderType === 'SUPPORT_BOOSTER' || payment.orderType === 'TASK_BOOSTER') {
        const isSupport = payment.orderType === 'SUPPORT_BOOSTER';
        const expiryDate = new Date();
        
        let updateData = {};
        
        if (isSupport) {
            expiryDate.setDate(expiryDate.getDate() + 30);
            updateData.isSupportBoosterActive = true;
            updateData.supportBoosterExpiry = expiryDate;
        } else {
            expiryDate.setHours(expiryDate.getHours() + 24);
            updateData.isTaskBoosterActive = true;
            updateData.taskBoosterExpiry = expiryDate;
        }
        
        updateData.isBoosterActive = true;
        updateData.boosterExpiry = expiryDate;
        
        await User.findByIdAndUpdate(user._id, updateData);
    }
}
