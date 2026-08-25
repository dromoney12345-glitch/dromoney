const express = require('express');
const { 
    updateKyc, 
    unlockPlatform, 
    completeCourse,
    submitPromotion, 
    getMyPromotions, 
    updateProfilePhoto,
    updateFutureFundProgress,
    unlockFutureFund,
    getFutureFundStatus,
    pingFutureFundActivity,
    getReferrals,
    attachReferral,
    updateProfile,
    getFutureFundEstimation,
    clearPersonalNotifications,
    getMyNotifications,
    markNotificationRead,
    getWithdrawalCard
} = require('../controllers/userController');
const { submitTask } = require('../controllers/taskSubmissionController');
const { unlockIdea } = require('../controllers/businessIdeaController');
const { createOrder, verifyPayment, submitManualPayment, checkPendingManualPayment, getPaymentQuote } = require('../controllers/razorpayController');
const { rewardUserForAd } = require('../controllers/adController');
const { joinEvent, submitResult } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { getOfferwallSession } = require('../controllers/offerwallController');
const upload = require('../middleware/upload');
const { uploadToCloud, uploadMiddleware } = require('../controllers/adminUploadController');

const router = express.Router();

// Public Webhook (Must be before protect)
router.post('/bank-verification-webhook', (req, res) => {
    console.log('Bank verification webhook test received:', req.body);
    res.status(200).send('Bank verification webhook OK');
});

router.use(protect); // Secure all routes

const { submitFeedback } = require('../controllers/feedbackController');
const { submitReport } = require('../controllers/reportController');

const { walletLimiter, rewardLimiter, writeLimiter } = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');

router.patch('/kyc', writeLimiter, upload.single('document'), updateKyc);
router.post('/unlock', walletLimiter, idempotency(), unlockPlatform);
router.post('/complete-course', writeLimiter, completeCourse);
router.post('/promotions', writeLimiter, idempotency(), submitPromotion);
router.get('/promotions', getMyPromotions);
router.get('/referrals', getReferrals);
router.post('/attach-referral', writeLimiter, attachReferral);
router.get('/offerwall', getOfferwallSession);
router.patch('/profile', updateProfile);
router.patch('/photo', upload.single('photo'), updateProfilePhoto);
router.post('/future-fund/progress', updateFutureFundProgress);
router.post('/future-fund/unlock', walletLimiter, idempotency(), unlockFutureFund);
router.get('/future-fund/status', getFutureFundStatus);
router.post('/future-fund/activity', pingFutureFundActivity);
router.get('/future-fund/estimation', getFutureFundEstimation);
router.get('/withdrawal-card', getWithdrawalCard);
router.post('/feedback', writeLimiter, submitFeedback);
router.post('/reports', writeLimiter, submitReport);
router.post('/business-ideas/unlock', walletLimiter, idempotency(), unlockIdea);
router.post('/ads/reward', rewardLimiter, idempotency(), rewardUserForAd);
router.post('/events/:id/join', writeLimiter, joinEvent);
router.post('/events/:id/submit', rewardLimiter, idempotency(), submitResult);
router.get('/notifications', getMyNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/notifications', clearPersonalNotifications);

// Razorpay & Payment Routes
router.get('/payment-quote', getPaymentQuote);
router.post('/razorpay/create-order', walletLimiter, idempotency(), createOrder);
router.post('/razorpay/verify', walletLimiter, idempotency(), verifyPayment);
router.post('/manual-payment', walletLimiter, idempotency(), upload.single('screenshot'), submitManualPayment);
router.get('/manual-payment/check', checkPendingManualPayment);

router.post('/tasks/submit', rewardLimiter, idempotency(), submitTask);
router.post('/upload', uploadMiddleware, uploadToCloud);

module.exports = router;


