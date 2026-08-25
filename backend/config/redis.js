const Redis = require('ioredis');

let client = null;
let ready = false;
let loggedSkip = false;

function redisUrl() {
    return String(process.env.REDIS_URL || process.env.REDIS_TLS_URL || '').trim();
}

function getRedis() {
    const url = redisUrl();
    if (!url) {
        if (!loggedSkip) {
            loggedSkip = true;
            console.warn('[Redis] REDIS_URL not set — rate limits stay in-memory (single instance only).');
        }
        return null;
    }

    if (client) return client;

    client = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        connectTimeout: 4000,
        tls: url.startsWith('rediss://') ? {} : undefined,
        lazyConnect: true,
    });

    client.on('ready', () => {
        ready = true;
        console.log('[Redis] connected — shared rate limit + idempotency enabled');
    });
    client.on('error', (err) => {
        ready = false;
        console.error('[Redis] error:', err.message);
    });
    client.on('end', () => {
        ready = false;
    });

    client.connect().catch((err) => {
        ready = false;
        console.error('[Redis] connect failed, falling back to memory/Mongo:', err.message);
    });

    return client;
}

function isRedisReady() {
    return !!(client && ready && client.status === 'ready');
}

async function redisCall(...args) {
    const redis = getRedis();
    if (!redis || !isRedisReady()) {
        throw new Error('redis_unavailable');
    }
    return redis.call(...args);
}

async function closeRedis() {
    if (!client) return;
    try {
        await client.quit();
    } catch {
        client.disconnect();
    }
    client = null;
    ready = false;
}

module.exports = {
    getRedis,
    isRedisReady,
    redisCall,
    redisUrl,
    closeRedis,
};
