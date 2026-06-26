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
    getReferrals,
    updateProfile,
    getFutureFundEstimation,
    clearPersonalNotifications
} = require('../controllers/userController');
const { submitTask } = require('../controllers/taskSubmissionController');
const { unlockIdea } = require('../controllers/businessIdeaController');
const { createOrder, verifyPayment, submitManualPayment } = require('../controllers/razorpayController');
const { rewardUserForAd } = require('../controllers/adController');
const { joinEvent, submitResult } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadToCloud, uploadMiddleware } = require('../controllers/adminUploadController');

const router = express.Router();

router.use(protect); // Secure all routes

const { submitFeedback } = require('../controllers/feedbackController');
const { submitReport } = require('../controllers/reportController');

router.patch('/kyc', upload.single('document'), updateKyc);
router.post('/unlock', unlockPlatform);
router.post('/complete-course', completeCourse);
router.post('/promotions', submitPromotion);
router.get('/promotions', getMyPromotions);
router.get('/referrals', getReferrals);
router.patch('/profile', updateProfile);
router.patch('/photo', upload.single('photo'), updateProfilePhoto);
router.post('/future-fund/progress', updateFutureFundProgress);
router.post('/future-fund/unlock', unlockFutureFund);
router.get('/future-fund/estimation', getFutureFundEstimation);
router.post('/feedback', submitFeedback);
router.post('/reports', submitReport);
router.post('/business-ideas/unlock', unlockIdea);
router.post('/ads/reward', rewardUserForAd);
router.post('/events/:id/join', joinEvent);
router.post('/events/:id/submit', submitResult);
router.delete('/notifications', clearPersonalNotifications);

// Razorpay & Payment Routes
router.post('/razorpay/create-order', createOrder);
router.post('/razorpay/verify', verifyPayment);
router.post('/manual-payment', upload.single('screenshot'), submitManualPayment);

router.post('/tasks/submit', submitTask);
router.post('/upload', uploadMiddleware, uploadToCloud);

module.exports = router;


