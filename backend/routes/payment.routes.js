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

module.exports = router;
