const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis, redisCall } = require('../config/redis');

getRedis();

function sharedStore(prefix) {
    if (!String(process.env.REDIS_URL || process.env.REDIS_TLS_URL || '').trim()) {
        return undefined;
    }
    try {
        return new RedisStore({
            prefix: `rl:${prefix}:`,
            sendCommand: (...args) => redisCall(...args),
        });
    } catch (err) {
        console.error('[RateLimit] Redis store unavailable:', err.message);
        return undefined;
    }
}

function skipWebhooks(req) {
    const path = String(req.originalUrl || req.url || '');
    const method = String(req.method || '').toUpperCase();
    if (
        path.includes('/api/public/offerwall/') ||
        path.includes('/webhook') ||
        path.includes('/api/health') ||
        path.includes('/api/fcm-tokens/')
    ) {
        return true;
    }
    // Public reads (settings, content, tasks) should not burn the rate-limit bucket.
    if (method === 'GET' && path.includes('/api/public/')) return true;
    return false;
}

function ipKey(req) {
    return `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`;
}

function idFromBearerToken(req) {
    const header = String(req.headers?.authorization || '');
    if (!header.startsWith('Bearer ')) return '';
    const token = header.slice(7).trim();
    if (!token || !process.env.JWT_SECRET) return '';
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return String(decoded.id || decoded._id || '');
    } catch {
        return '';
    }
}

function userOrIpKey(req) {
    const userId = req.user?._id || req.user?.id || req.admin?._id || idFromBearerToken(req);
    if (userId) return `u:${userId}`;
    return ipKey(req);
}

const limiterDefaults = {
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
};

const generalApiLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_GENERAL_WINDOW_MIN) || 10) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 2000,
    skip: skipWebhooks,
    // Logged-in KYC/users must not share one bucket with everyone on the same Wi‑Fi / CGNAT IP.
    keyGenerator: userOrIpKey,
    store: sharedStore('general'),
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after a few minutes.',
    },
});

const authLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_AUTH_WINDOW_MIN) || 15) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 15,
    keyGenerator: ipKey,
    store: sharedStore('auth'),
    message: {
        success: false,
        message: 'Too many authentication attempts. Please wait before trying again.',
    },
});

const otpLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_OTP_WINDOW_MIN) || 10) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_OTP_MAX) || 6,
    keyGenerator: ipKey,
    store: sharedStore('otp'),
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait a few minutes before requesting a new OTP.',
    },
});

const walletLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_WALLET_WINDOW_MIN) || 5) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WALLET_MAX) || 15,
    keyGenerator: userOrIpKey,
    store: sharedStore('wallet'),
    message: {
        success: false,
        message: 'Too many wallet/transaction requests. Please wait a few minutes before trying again.',
    },
});

const rewardLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_REWARD_WINDOW_MIN) || 1) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_REWARD_MAX) || 30,
    keyGenerator: userOrIpKey,
    store: sharedStore('reward'),
    message: {
        success: false,
        message: 'Reward requests are too fast. Please slow down.',
    },
});

const writeLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: (Number(process.env.RATE_LIMIT_WRITE_WINDOW_MIN) || 1) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WRITE_MAX) || 40,
    keyGenerator: userOrIpKey,
    store: sharedStore('write'),
    message: {
        success: false,
        message: 'Too many writes. Please wait a moment.',
    },
});

module.exports = {
    generalApiLimiter,
    authLimiter,
    otpLimiter,
    walletLimiter,
    rewardLimiter,
    writeLimiter,
};
