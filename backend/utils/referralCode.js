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
                url.searchParams.get('code');
            if (refParam) return normalizeCode(refParam);

            const installReferrer = url.searchParams.get('referrer');
            if (installReferrer) {
                const decoded = decodeURIComponent(installReferrer);
                const match =
                    decoded.match(/(?:^|[&?])ref=([A-Za-z0-9]+)/i) ||
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
    return normalizeCode(raw);
}

module.exports = { extractReferralCode, normalizeCode };
