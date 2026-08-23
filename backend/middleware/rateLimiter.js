const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware Suite
 * Dynamically configurable via .env parameters with secure fallbacks.
 */

// 1. General API Baseline (Default: 500 requests per 10 minutes per IP)
const generalApiLimiter = rateLimit({
    windowMs: (Number(process.env.RATE_LIMIT_GENERAL_WINDOW_MIN) || 10) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const path = String(req.originalUrl || req.url || '');
        return path.includes('/api/public/offerwall/');
    },
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after a few minutes.'
    }
});

// 2. Auth Limiter (Login, Register - Default: 15 attempts per 15 minutes)
const authLimiter = rateLimit({
    windowMs: (Number(process.env.RATE_LIMIT_AUTH_WINDOW_MIN) || 15) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please wait before trying again.'
    }
});

// 3. OTP Limiter (Send & Verify OTP - Default: 6 requests per 10 minutes)
const otpLimiter = rateLimit({
    windowMs: (Number(process.env.RATE_LIMIT_OTP_WINDOW_MIN) || 10) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_OTP_MAX) || 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait a few minutes before requesting a new OTP.'
    }
});

// 4. Wallet & Withdrawal Limiter (Withdrawal and payment creation - Default: 15 requests per 5 minutes)
const walletLimiter = rateLimit({
    windowMs: (Number(process.env.RATE_LIMIT_WALLET_WINDOW_MIN) || 5) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WALLET_MAX) || 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many wallet/transaction requests. Please wait a few minutes before trying again.'
    }
});

// 5. Reward & Task Limiter (Default: 30 submissions per minute)
const rewardLimiter = rateLimit({
    windowMs: (Number(process.env.RATE_LIMIT_REWARD_WINDOW_MIN) || 1) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_REWARD_MAX) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Reward requests are too fast. Please slow down.'
    }
});

module.exports = {
    generalApiLimiter,
    authLimiter,
    otpLimiter,
    walletLimiter,
    rewardLimiter
};

