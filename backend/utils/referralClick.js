const crypto = require('crypto');
const ReferralClick = require('../models/ReferralClick');
const { findReferrerByCode } = require('./referralCode');

const CLICK_TTL_MS = 48 * 60 * 60 * 1000;

function clientIp(req) {
    const raw = String(req.headers['x-forwarded-for'] || req.ip || '')
        .split(',')[0]
        .trim()
        .replace(/^::ffff:/, '');
    if (!raw || raw === '::1' || raw === '127.0.0.1') return '';
    return raw;
}

function clientUa(req) {
    return String(req.headers['user-agent'] || '').slice(0, 240);
}

async function recordReferralClick(req, rawCode) {
    const linked = await findReferrerByCode(rawCode);
    if (linked.reason !== 'ok') {
        return { recorded: false, reason: linked.reason, clickId: '', code: linked.cleanCode || '' };
    }

    const ip = clientIp(req) || 'unknown';
    const click = await ReferralClick.create({
        code: linked.cleanCode,
        referrer: linked.referrer._id,
        ip,
        userAgent: clientUa(req),
        token: crypto.randomBytes(12).toString('hex'),
    });

    return { recorded: true, clickId: click.token, code: linked.cleanCode };
}

async function consumeReferralClick(req, { extraToken = '', excludePhone = '', excludeEmail = '', excludeId = null } = {}) {
    const token = String(
        extraToken ||
        req.body?.referralClickId ||
        req.body?.clickId ||
        req.headers['x-referral-click'] ||
        ''
    ).trim();

    if (token) {
        const click = await ReferralClick.findOne({ token, consumedAt: null });
        if (click) {
            const linked = await findReferrerByCode(click.code, { excludePhone, excludeEmail, excludeId });
            if (linked.reason === 'ok') {
                click.consumedAt = new Date();
                click.consumedBy = excludeId || undefined;
                await click.save();
                return linked;
            }
        }
    }

    const ip = clientIp(req);
    if (!ip) return { referrer: null, cleanCode: '', reason: 'no_code' };

    const since = new Date(Date.now() - CLICK_TTL_MS);
    const ua = clientUa(req);
    const clicks = await ReferralClick.find({
        ip,
        consumedAt: null,
        createdAt: { $gte: since },
    })
        .sort({ createdAt: -1 })
        .limit(8);

    const click = clicks.find((row) => row.userAgent && ua && row.userAgent === ua) || clicks[0];
    if (!click) return { referrer: null, cleanCode: '', reason: 'no_code' };

    const linked = await findReferrerByCode(click.code, { excludePhone, excludeEmail, excludeId });
    if (linked.reason === 'ok') {
        click.consumedAt = new Date();
        click.consumedBy = excludeId || undefined;
        await click.save();
    }
    return linked;
}

module.exports = {
    clientIp,
    recordReferralClick,
    consumeReferralClick,
};
