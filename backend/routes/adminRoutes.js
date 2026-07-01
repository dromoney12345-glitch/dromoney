const express = require('express');
const router = express.Router();

const { login, getMe } = require('../controllers/adminAuthController');
const { getStats, getDashboardAlerts, getEngagement } = require('../controllers/adminDashboardController');
const { getUsers, manageKYC, toggleBlock, getPendingKyc, deleteUser, getUserTransactions, distributeFutureFundProfit, getFutureFundReport, updateOverrideProfit, getFutureFundHistory } = require('../controllers/adminUserController');
const { 
    createTask, getTasks, updateTask,
    deleteContent 
} = require('../controllers/adminContentController');
const { 
    createAd, getAdminAds, updateAd, deleteAd 
} = require('../controllers/adController');
const { getWithdrawals, updateWithdrawalStatus } = require('../controllers/adminWithdrawalController');
const { getPayments, updatePaymentStatus } = require('../controllers/adminPaymentController');
const { getPromotions, updatePromotionStatus } = require('../controllers/adminPromotionController');
const { getAllFeedbacks, markAsRead } = require('../controllers/feedbackController');
const { getAllReports, updateReportStatus } = require('../controllers/reportController');
const { sendBroadcast, getNotifications, deleteNotification, clearAllNotifications } = require('../controllers/notificationController');
const { 
    adminGetBusinessIdeas, 
    createBusinessIdea, 
    updateBusinessIdea, 
    deleteBusinessIdea 
} = require('../controllers/businessIdeaController');
const { getEvents, getEventParticipants, updateParticipantStatus, createEvent, updateEvent, deleteEvent, approveWinners } = require('../controllers/eventController');
const { getSettings, updateSettings } = require('../controllers/adminSettingsController');
const { getAdminSubmissions, approveSubmission, rejectSubmission } = require('../controllers/taskSubmissionController');

const { protectAdmin } = require('../middleware/authMiddleware');

// Settings Routes
router.route('/settings')
    .get(protectAdmin, getSettings)
    .put(protectAdmin, updateSettings);

// Auth Routes
router.post('/auth/login', login);
router.get('/auth/me', protectAdmin, getMe);

// Dashboard Routes
router.get('/dashboard/stats', protectAdmin, getStats);
router.get('/dashboard/alerts', protectAdmin, getDashboardAlerts);
router.get('/dashboard/engagement', protectAdmin, getEngagement);



// User Management Routes
router.get('/users', protectAdmin, getUsers);
router.get('/users/future-fund/report', protectAdmin, getFutureFundReport);
router.post('/users/future-fund/distribute', protectAdmin, distributeFutureFundProfit);
router.put('/users/:id/future-fund/override', protectAdmin, updateOverrideProfit);
router.get('/users/future-fund/history', protectAdmin, getFutureFundHistory);
router.get('/users/:id/transactions', protectAdmin, getUserTransactions);
router.put('/users/:id/kyc', protectAdmin, manageKYC);
router.put('/users/:id/block', protectAdmin, toggleBlock);
router.delete('/users/:id', protectAdmin, deleteUser);
router.get('/kyc/pending', protectAdmin, getPendingKyc);

// Content Management Routes
const { updateContent } = require('../controllers/contentController');
const { uploadToCloud, uploadMiddleware } = require('../controllers/adminUploadController');
router.post('/content', protectAdmin, updateContent);
router.post('/upload', protectAdmin, uploadMiddleware, uploadToCloud);

const { getAffiliateStats } = require('../controllers/adminAffiliateController');
router.get('/affiliates', protectAdmin, getAffiliateStats);

router.route('/tasks').post(protectAdmin, createTask).get(protectAdmin, getTasks);
router.route('/tasks/:id').put(protectAdmin, updateTask);
router.get('/tasks/submissions', protectAdmin, getAdminSubmissions);
router.put('/tasks/submissions/:id/approve', protectAdmin, approveSubmission);
router.put('/tasks/submissions/:id/reject', protectAdmin, rejectSubmission);
router.route('/ads')
    .post(protectAdmin, createAd)
    .get(protectAdmin, getAdminAds);
router.route('/ads/:id')
    .put(protectAdmin, updateAd)
    .delete(protectAdmin, deleteAd);

router.delete('/content/:type/:id', protectAdmin, deleteContent);

// Withdrawal Routes
router.get('/withdrawals', protectAdmin, getWithdrawals);
router.put('/withdrawals/:id', protectAdmin, updateWithdrawalStatus);

// Payment (Membership) Routes
router.get('/payments', protectAdmin, getPayments);
router.put('/payments/:id', protectAdmin, updatePaymentStatus);

// Promotion Routes
router.get('/promotions', protectAdmin, getPromotions);
router.put('/promotions/:id', protectAdmin, updatePromotionStatus);

// Banner Routes
const { getBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/adminMarketingController');
router.route('/banners')
    .get(protectAdmin, getBanners)
    .post(protectAdmin, createBanner);
router.route('/banners/:id')
    .put(protectAdmin, updateBanner)
    .delete(protectAdmin, deleteBanner);

// Booster Routes
const { getBoosters, createBooster, updateBooster, deleteBooster } = require('../controllers/adminBoosterController');
router.route('/boosters')
    .get(protectAdmin, getBoosters)
    .post(protectAdmin, createBooster);
router.route('/boosters/:id')
    .put(protectAdmin, updateBooster)
    .delete(protectAdmin, deleteBooster);

// Feedback Routes
router.get('/feedbacks', protectAdmin, getAllFeedbacks);
router.patch('/feedbacks/:id/read', protectAdmin, markAsRead);

// Report Routes
router.get('/reports', protectAdmin, getAllReports);
router.patch('/reports/:id/status', protectAdmin, updateReportStatus);

// Notification Routes
router.route('/notifications')
    .get(protectAdmin, getNotifications)
    .post(protectAdmin, sendBroadcast);

router.route('/business-ideas')
    .get(protectAdmin, adminGetBusinessIdeas)
    .post(protectAdmin, createBusinessIdea);

router.route('/business-ideas/:id')
    .put(protectAdmin, updateBusinessIdea)
    .delete(protectAdmin, deleteBusinessIdea);

// Event Routes
router.route('/events')
    .get(protectAdmin, getEvents)
    .post(protectAdmin, createEvent);

router.route('/events/:id')
    .put(protectAdmin, updateEvent)
    .delete(protectAdmin, deleteEvent);

router.get('/events/:id/participants', protectAdmin, getEventParticipants);
router.put('/events/participants/:id', protectAdmin, updateParticipantStatus);
router.post('/events/:id/approve-winners', protectAdmin, approveWinners);

// Admin Profit Routes
const { getAdminProfits } = require('../controllers/adminProfitController');
router.get('/profits', protectAdmin, getAdminProfits);

module.exports = router;
