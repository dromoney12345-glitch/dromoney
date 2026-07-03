const express = require('express');
const { getContent, getBulkContent, getActiveBanners, downloadLogo } = require('../controllers/contentController');
const { getBoosters } = require('../controllers/adminBoosterController'); // Reusing controller but for public view (could filter isActive: true)
const { getPublicNotifications } = require('../controllers/notificationController');
const { getBusinessIdeas, getBusinessIdeaById } = require('../controllers/businessIdeaController');
const { getAds, getAdById } = require('../controllers/adController');
const { getEvents, getEvent } = require('../controllers/eventController');
const { getTasks } = require('../controllers/adminContentController');
const { getOptionalUser } = require('../middleware/authMiddleware');

const router = express.Router();

const { getPublicSettings, getReferrerName } = require('../controllers/publicController');

router.get('/content/download-logo', downloadLogo);
router.get('/content/bulk', getBulkContent);
router.get('/content/:key', getContent);
router.get('/banners', getActiveBanners);
router.get('/boosters', getBoosters); // Public view of boosters
router.get('/notifications', getOptionalUser, getPublicNotifications);
router.get('/business-ideas', getOptionalUser, getBusinessIdeas);
router.get('/business-ideas/:id', getOptionalUser, getBusinessIdeaById);
router.get('/ads', getOptionalUser, getAds);
router.get('/ads/:id', getOptionalUser, getAdById);
router.get('/events', getOptionalUser, getEvents);
router.get('/events/:id', getOptionalUser, getEvent);
router.get('/tasks', getTasks);
router.get('/settings', getPublicSettings);
router.get('/referrer/:code', getReferrerName);

// --- TEST ROUTE FOR DEBUGGING UPIGATEWAY ---
router.get('/test-payment', async (req, res) => {
    try {
        const UpigatewayService = require('../services/upigateway.service');
        const testOrderData = {
            orderId: `TEST_${Date.now()}`,
            amount: 10,
            userName: 'Test User',
            userEmail: 'test@example.com',
            userPhone: '9999999999'
        };
        const response = await UpigatewayService.createPaymentLink(testOrderData);
        res.json({ success: true, serviceResponse: response });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

module.exports = router;
