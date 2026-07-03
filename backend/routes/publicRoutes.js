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
        const axios = require('axios');
        const payload = {
            key: process.env.UPIGATEWAY_API_KEY,
            client_txn_id: `TEST_${Date.now()}`,
            amount: "10",
            p_info: "Test",
            customer_name: "Test User",
            customer_email: "test@example.com",
            customer_mobile: "9999999999",
            redirect_url: "https://dromoney.com/payment-success"
        };
        const response = await axios.post(`${process.env.UPIGATEWAY_BASE_URL}/create_order`, payload);
        res.json({ success: true, rawResponse: response.data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

module.exports = router;
