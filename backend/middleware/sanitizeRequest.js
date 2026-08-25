/**
 * Strip Mongo operator keys without replacing req.query (Express 5-safe).
 */
function clean(value, depth = 0) {
    if (depth > 8 || value == null) return value;
    if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
    if (typeof value !== 'object') return value;

    const out = {};
    for (const [key, nested] of Object.entries(value)) {
        if (key.startsWith('$') || key.includes('.')) continue;
        out[key] = clean(nested, depth + 1);
    }
    return out;
}

function mutateObject(target) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) return;
    const cleaned = clean(target);
    for (const key of Object.keys(target)) {
        if (!(key in cleaned)) delete target[key];
    }
    Object.assign(target, cleaned);
}

module.exports = function sanitizeRequest(req, res, next) {
    try {
        if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
            mutateObject(req.body);
        }
        if (req.params && typeof req.params === 'object') {
            mutateObject(req.params);
        }
        if (req.query && typeof req.query === 'object') {
            const cleaned = clean(req.query);
            for (const key of Object.keys(req.query)) {
                if (!(key in cleaned)) {
                    try {
                        delete req.query[key];
                    } catch {
                        /* Express 5 query may be a getter */
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Sanitize] skipped:', err.message);
    }
    next();
};
