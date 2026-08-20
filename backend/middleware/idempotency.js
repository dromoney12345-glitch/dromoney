const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Idempotency Middleware for safe request deduplication.
 * Prevents double withdrawals, double payments, and duplicate coin rewards.
 * 
 * Usage:
 * app.post('/withdraw', idempotency({ required: true }), handler)
 */
const idempotency = (options = { required: false }) => {
    return async (req, res, next) => {
        // Idempotency applies primarily to mutating requests (POST, PUT, PATCH, DELETE)
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        const rawKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
        
        // If not required and no key provided, generate a fallback key for sensitive payment/withdraw operations if user exists
        let key = rawKey;
        if (!key && !options.required) {
            return next();
        }

        if (!key && options.required) {
            return res.status(400).json({
                success: false,
                message: 'X-Idempotency-Key header is required for this operation to prevent duplicate processing.'
            });
        }

        // Namespace key with userId to avoid collisions between users
        const userId = req.user?._id || req.user?.id || 'anonymous';
        const namespacedKey = `${userId}:${key}`;
        const endpoint = req.originalUrl || req.baseUrl + req.path;
        const requestHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(req.body || {}))
            .digest('hex');

        try {
            // Check for existing idempotency record
            const existingRecord = await IdempotencyKey.findOne({ key: namespacedKey });

            if (existingRecord) {
                // If request is still executing
                if (existingRecord.inFlight) {
                    return res.status(409).json({
                        success: false,
                        message: 'Concurrent request in flight. Please wait a moment.'
                    });
                }

                // Return cached response
                res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
                return res.status(existingRecord.responseStatus || 200).json(existingRecord.responseBody);
            }

            // Create initial in-flight record
            const newRecord = await IdempotencyKey.create({
                key: namespacedKey,
                userId: req.user?._id || null,
                endpoint,
                requestHash,
                inFlight: true
            });

            // Intercept res.json to capture response
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                // Restore original method
                res.json = originalJson;

                // Save result asynchronously in DB
                IdempotencyKey.findByIdAndUpdate(newRecord._id, {
                    responseStatus: res.statusCode || 200,
                    responseBody: body,
                    inFlight: false
                }).catch(err => console.error('[Idempotency] Failed to cache response:', err));

                return originalJson(body);
            };

            next();
        } catch (err) {
            // If duplicate key race condition caught by mongo unique index
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'A duplicate request is already being processed.'
                });
            }
            console.error('[Idempotency] Error in middleware:', err);
            next();
        }
    };
};

module.exports = idempotency;
