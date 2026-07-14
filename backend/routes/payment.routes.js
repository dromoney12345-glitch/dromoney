const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validateCreatePayment, validateVerifyPayment } = require('../validators/payment.validator');
const { 
    createPayment, 
    verifyPayment, 
    getPaymentStatus, 
    paymentWebhook 
} = require('../controllers/payment.controller');

// --- Protected Routes (Require Authentication) ---

// POST /api/payment/create
router.post('/create', protect, validateCreatePayment, createPayment);

// POST /api/payment/verify
router.post('/verify', protect, validateVerifyPayment, verifyPayment);

// GET /api/payment/status/:orderId
router.get('/status/:orderId', protect, getPaymentStatus);

// --- Public Routes ---

// POST /api/payment/webhook (Async Gateway Updates)
router.post('/webhook', paymentWebhook);

// POST /api/payment/credit-webhook (Async Gateway Updates for Axis Current Account)
router.post('/credit-webhook', (req, res) => {
    console.log('Credit webhook test received:', req.body);
    res.status(200).send('Credit webhook OK');
});

module.exports = router;
