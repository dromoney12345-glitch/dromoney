const express = require('express');
const { register, login, getMe, sendLoginOtp, verifyLoginOtp, sendRegisterOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login); 
router.post('/send-otp', otpLimiter, sendLoginOtp); 
router.post('/send-otp-register', otpLimiter, sendRegisterOtp);
router.post('/verify-otp', otpLimiter, verifyLoginOtp); 
router.get('/me', protect, getMe);

module.exports = router;
