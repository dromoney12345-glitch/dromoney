const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');
const { getRedis, isRedisReady } = require('../config/redis');

const TTL_SECONDS = Number(process.env.IDEMPOTENCY_TTL_SECONDS) || 86400;
const LOCK_SECONDS = 90;
const DEDUPE_SECONDS = 8;

function requestHash(req) {
    const raw = req.is('multipart/form-data') ? `multipart:${req.originalUrl}` : JSON.stringify(req.body || {});
    return crypto.createHash('sha256').update(raw).digest('hex');
}

function fingerprintKey(req) {
    const userId = req.user?._id || req.user?.id || req.admin?._id || 'anonymous';
    const endpoint = req.originalUrl || `${req.baseUrl || ''}${req.path || ''}`;
    return crypto
        .createHash('sha256')
        .update(`${userId}|${req.method}|${endpoint}|${JSON.stringify(req.body || {})}`)
        .digest('hex')
        .slice(0, 40);
}

function attachCapture(res, persist) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        res.json = originalJson;
        persist(res.statusCode || 200, body).catch((err) => {
            console.error('[Idempotency] Failed to cache response:', err.message);
        });
        return originalJson(body);
    };
}

async function redisGetJson(redis, key) {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Money/write routes:
 * - X-Idempotency-Key → 24h cached response (safe retries)
 * - no header → 8s fingerprint lock (stops double-tap, allows a later real second request)
 */
const idempotency = (options = {}) => {
    const required = options.required === true;

    return async (req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        const headerKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
        if (!headerKey && required) {
            return res.status(400).json({
                success: false,
                message: 'X-Idempotency-Key header is required for this operation to prevent duplicate processing.',
            });
        }

        const userId = req.user?._id || req.user?.id || req.admin?._id || 'anonymous';
        const durable = Boolean(headerKey);
        const key = durable ? String(headerKey).slice(0, 128) : fingerprintKey(req);
        if (!key) return next();
        if (!durable && req.is('multipart/form-data')) return next();

        const namespacedKey = `${userId}:${key}`;
        const endpoint = req.originalUrl || `${req.baseUrl || ''}${req.path || ''}`;
        const hash = requestHash(req);
        const redis = getRedis();

        try {
            if (redis && isRedisReady()) {
                const respKey = `idemp:resp:${namespacedKey}`;
                const lockKey = `idemp:lock:${namespacedKey}`;

                if (durable) {
                    const cached = await redisGetJson(redis, respKey);
                    if (cached) {
                        if (cached.requestHash && cached.requestHash !== hash) {
                            return res.status(422).json({
                                success: false,
                                message: 'Idempotency key was reused with a different payload.',
                            });
                        }
                        res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
                        return res.status(cached.responseStatus || 200).json(cached.responseBody);
                    }
                }

                const locked = await redis.set(lockKey, '1', 'EX', durable ? LOCK_SECONDS : DEDUPE_SECONDS, 'NX');
                if (locked !== 'OK') {
                    return res.status(409).json({
                        success: false,
                        message: 'Concurrent request in flight. Please wait a moment.',
                    });
                }

                attachCapture(res, async (status, body) => {
                    if (durable) {
                        await redis.set(
                            respKey,
                            JSON.stringify({ responseStatus: status, responseBody: body, requestHash: hash }),
                            'EX',
                            TTL_SECONDS
                        );
                    }
                    await redis.del(lockKey);
                });

                res.on('close', () => {
                    if (!res.writableEnded) redis.del(lockKey).catch(() => {});
                });
                return next();
            }

            const existingRecord = await IdempotencyKey.findOne({ key: namespacedKey });
            if (existingRecord) {
                if (existingRecord.inFlight) {
                    return res.status(409).json({
                        success: false,
                        message: 'Concurrent request in flight. Please wait a moment.',
                    });
                }
                if (durable) {
                    if (existingRecord.requestHash && existingRecord.requestHash !== hash) {
                        return res.status(422).json({
                            success: false,
                            message: 'Idempotency key was reused with a different payload.',
                        });
                    }
                    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
                    return res.status(existingRecord.responseStatus || 200).json(existingRecord.responseBody);
                }
                return res.status(409).json({
                    success: false,
                    message: 'Concurrent request in flight. Please wait a moment.',
                });
            }

            const newRecord = await IdempotencyKey.create({
                key: namespacedKey,
                userId: req.user?._id || null,
                endpoint,
                requestHash: hash,
                inFlight: true,
            });

            attachCapture(res, async (status, body) => {
                if (durable) {
                    await IdempotencyKey.findByIdAndUpdate(newRecord._id, {
                        responseStatus: status,
                        responseBody: body,
                        inFlight: false,
                        requestHash: hash,
                    });
                } else {
                    await IdempotencyKey.deleteOne({ _id: newRecord._id });
                }
            });

            next();
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'A duplicate request is already being processed.',
                });
            }
            console.error('[Idempotency] Error in middleware:', err.message);
            next();
        }
    };
};

module.exports = idempotency;
