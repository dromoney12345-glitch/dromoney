/**
 * Normalize / extract referral codes from pasted links or raw codes (backend).
 */
const RESERVED = new Set([
    'REGISTER', 'LOGIN', 'AUTH', 'USER', 'ADMIN', 'JOIN', 'HOME', 'EARN',
    'WALLET', 'PROFILE', 'INCOME', 'EVENTS', 'WATCH', 'HELP', 'API', 'PUBLIC',
    'STORE', 'APPS', 'DETAILS', 'NULL', 'UNDEFINED',
]);

function normalizeCode(code) {
    const cleaned = String(code || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8);
    if (!cleaned || RESERVED.has(cleaned)) return '';
    return cleaned;
}

function extractReferralCode(value) {
    if (!value) return '';
    const raw = String(value).trim();

    const urlInText = raw.match(/https?:\/\/[^\s]+/i);
    if (urlInText && urlInText[0] !== raw) {
        const nested = extractReferralCode(urlInText[0]);
        if (nested) return nested;
    }

    if (raw.startsWith('?') || raw.startsWith('#')) {
        const params = new URLSearchParams(raw.replace(/^#/, ''));
        const fromQuery =
            params.get('invite') ||
            params.get('ref') ||
            params.get('referral') ||
            params.get('code');
        if (fromQuery) return normalizeCode(fromQuery);
    }

    const labeled = raw.match(/invite\s*code\s*[:\-]\s*([A-Za-z0-9]+)/i);
    if (labeled) return normalizeCode(labeled[1]);

    try {
        if (raw.includes('://') || raw.includes('play.google.com') || raw.startsWith('/')) {
            const cleanedUrl = raw.replace(/[),.;]+$/g, '');
            const url = new URL(
                cleanedUrl.includes('://') || cleanedUrl.startsWith('/')
                    ? cleanedUrl
                    : `https://${cleanedUrl}`,
                'https://dromoney.app'
            );

            const refParam =
                url.searchParams.get('invite') ||
                url.searchParams.get('ref') ||
                url.searchParams.get('referral') ||
                url.searchParams.get('utm_content') ||
                url.searchParams.get('code');
            if (refParam) return normalizeCode(refParam);

            const installReferrer = url.searchParams.get('referrer');
            if (installReferrer) {
                let decoded = String(installReferrer);
                try { decoded = decodeURIComponent(decoded); } catch { /* already decoded */ }
                try { decoded = decodeURIComponent(decoded); } catch { /* once is enough */ }
                const match =
                    decoded.match(/(?:^|[&?])(?:ref|invite|referral)=([A-Za-z0-9]+)/i) ||
                    decoded.match(/^([A-Za-z0-9]{4,12})$/);
                if (match) return normalizeCode(match[1]);
            }

            const campaign = url.searchParams.get('pcampaignid') || '';
            const campaignMatch = campaign.match(/web_share([A-Za-z0-9]{4,8})$/i);
            if (campaignMatch) return normalizeCode(campaignMatch[1]);

            const parts = url.pathname.split('/').filter(Boolean);
            const joinIdx = parts.findIndex((p) => p.toLowerCase() === 'join');
            if (joinIdx >= 0 && parts[joinIdx + 1]) return normalizeCode(parts[joinIdx + 1]);

            return '';
        }
    } catch {
        /* fall through */
    }

    if (/nhgfAFF-/i.test(raw)) return normalizeCode(raw.split(/nhgfAFF-/i).pop());
    if (/AFF-/i.test(raw)) return normalizeCode(raw.split(/AFF-/i).pop());
    if (/\/join\//i.test(raw)) return normalizeCode(raw.split(/\/join\//i).pop());
    const kv = raw.match(/(?:^|[?&\s])(?:ref|invite|referral)\s*=\s*([A-Za-z0-9]+)/i);
    if (kv) return normalizeCode(kv[1]);
    return normalizeCode(raw);
}

/**
 * Look up the referrer user for a pasted code / Play Store / /join link.
 */
async function findReferrerByCode(raw, { excludePhone = '', excludeEmail = '', excludeId = null } = {}) {
    const User = require('../models/User');
    const cleanCode = extractReferralCode(raw);
    if (!cleanCode) return { referrer: null, cleanCode: '', reason: 'no_code' };

    const referrer = await User.findOne({
        referralCode: new RegExp(`^${cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (!referrer) return { referrer: null, cleanCode, reason: 'not_found' };

    if (excludeId && String(referrer._id) === String(excludeId)) {
        return { referrer: null, cleanCode, reason: 'self_referral' };
    }
    const samePhone = referrer.phone && excludePhone && String(referrer.phone) === String(excludePhone);
    const sameEmail =
        referrer.email &&
        excludeEmail &&
        String(referrer.email).toLowerCase() === String(excludeEmail).toLowerCase();
    if (samePhone || sameEmail) {
        return { referrer: null, cleanCode, reason: 'self_referral' };
    }

    return { referrer, cleanCode, reason: 'ok' };
}

const PLAY_STORE_REFERRAL_BASE = 'https://play.google.com/store/apps/details?id=com.dromoney.user';

function isPlaceholderReferralBase(base) {
    const b = String(base || '').trim();
    if (!b) return true;
    return /earningapp\.com/i.test(b) || /example\.com/i.test(b);
}

/**
 * Canonical invite base URL stored in settings.
 * Play Store share URLs are stripped of a specific user's ref code.
 */
function normalizeReferralLinkBaseUrl(raw) {
    const value = String(raw || '').trim();
    if (!value || isPlaceholderReferralBase(value)) {
        return PLAY_STORE_REFERRAL_BASE;
    }
    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`);
        if (/play\.google\.com/i.test(url.hostname)) {
            const id = url.searchParams.get('id') || 'com.dromoney.user';
            return `https://play.google.com/store/apps/details?id=${id}`;
        }
        return url.toString();
    } catch {
        return PLAY_STORE_REFERRAL_BASE;
    }
}

module.exports = {
    extractReferralCode,
    normalizeCode,
    findReferrerByCode,
    PLAY_STORE_REFERRAL_BASE,
    isPlaceholderReferralBase,
    normalizeReferralLinkBaseUrl,
};
