const REF_STORAGE_KEY = 'dromoney_referral_code';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dromoney.user';

const RESERVED_CODES = new Set([
    'REGISTER', 'LOGIN', 'AUTH', 'USER', 'ADMIN', 'JOIN', 'HOME', 'EARN',
    'WALLET', 'PROFILE', 'INCOME', 'EVENTS', 'WATCH', 'HELP', 'API', 'PUBLIC',
    'STORE', 'APPS', 'DETAILS', 'NULL', 'UNDEFINED', 'TRUE', 'FALSE',
]);

/** Extract a referral code from pasted text, URL, or raw code. */
export function extractReferralCode(value) {
    if (!value) return '';
    const raw = String(value).trim();

    // If share message has a URL inside, prefer extracting from that URL
    const urlInText = raw.match(/https?:\/\/[^\s]+/i);
    if (urlInText && !raw.startsWith('http') && !raw.includes('play.google.com') && !raw.startsWith('/')) {
        const fromEmbedded = extractReferralCode(urlInText[0]);
        if (fromEmbedded) return fromEmbedded;
    }

    try {
        if (raw.includes('://') || raw.startsWith('/') || raw.includes('play.google.com')) {
            // Handle URLs that may have trailing punctuation from chat apps
            const cleanedUrl = raw.replace(/[),.;]+$/g, '');
            const url = new URL(
                cleanedUrl.includes('://') || cleanedUrl.startsWith('/')
                    ? cleanedUrl
                    : `https://${cleanedUrl}`,
                typeof window !== 'undefined' ? window.location.origin : 'https://dromoney.app'
            );

            const refParam =
                url.searchParams.get('ref') ||
                url.searchParams.get('referral') ||
                url.searchParams.get('code');
            if (refParam) return normalizeCode(refParam);

            // Play Store install referrer: referrer=ref%3DABC123
            const installReferrer = url.searchParams.get('referrer');
            if (installReferrer) {
                const decoded = decodeURIComponent(installReferrer);
                const match =
                    decoded.match(/(?:^|[&?])ref=([A-Za-z0-9]+)/i) ||
                    decoded.match(/^([A-Za-z0-9]{4,12})$/);
                if (match) return normalizeCode(match[1]);
            }

            // Legacy broken links: ...&pcampaignid=web_shareHYM1SE
            const campaign = url.searchParams.get('pcampaignid') || '';
            const campaignMatch = campaign.match(/web_share([A-Za-z0-9]{4,8})$/i);
            if (campaignMatch) return normalizeCode(campaignMatch[1]);

            // Only take code from /join/CODE paths — never from /user/auth/register etc.
            const parts = url.pathname.split('/').filter(Boolean);
            const joinIdx = parts.findIndex((p) => p.toLowerCase() === 'join');
            if (joinIdx >= 0 && parts[joinIdx + 1]) return normalizeCode(parts[joinIdx + 1]);

            return '';
        }
    } catch {
        // fall through to string parsing
    }

    if (/nhgfAFF-/i.test(raw)) {
        return normalizeCode(raw.split(/nhgfAFF-/i).pop());
    }
    if (/AFF-/i.test(raw)) {
        return normalizeCode(raw.split(/AFF-/i).pop());
    }
    // Pasted path like ".../join/ABC123"
    if (/\/join\//i.test(raw)) {
        return normalizeCode(raw.split(/\/join\//i).pop());
    }
    if (raw.includes('/') && !/user\/auth|\/login|\/register/i.test(raw)) {
        return normalizeCode(raw.split('/').pop());
    }
    return normalizeCode(raw);
}

function normalizeCode(code) {
    const cleaned = String(code || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8);
    if (!cleaned || RESERVED_CODES.has(cleaned)) return '';
    return cleaned;
}

export function savePendingReferralCode(code) {
    const cleaned = extractReferralCode(code);
    if (!cleaned) return '';
    try {
        localStorage.setItem(REF_STORAGE_KEY, cleaned);
    } catch {
        /* ignore */
    }
    return cleaned;
}

export function getPendingReferralCode() {
    try {
        return extractReferralCode(localStorage.getItem(REF_STORAGE_KEY) || '');
    } catch {
        return '';
    }
}

export function clearPendingReferralCode() {
    try {
        localStorage.removeItem(REF_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * Play Store share link with Google Play Install Referrer payload.
 * Example: ...&referrer=ref%3DHYM1SE&pcampaignid=web_share
 *
 * Never concatenates the code onto pcampaignid (that caused web_shareHYM1SE bug).
 */
export function buildPlayStoreReferralLink(code, baseUrlFromSettings = '') {
    const cleanCode = extractReferralCode(code);

    let url;
    try {
        const base = String(baseUrlFromSettings || '').trim();
        if (base && /play\.google\.com/i.test(base)) {
            url = new URL(base);
            // Strip broken leftover where code was glued to pcampaignid
            const campaign = url.searchParams.get('pcampaignid') || '';
            if (/web_share/i.test(campaign)) {
                url.searchParams.set('pcampaignid', 'web_share');
            }
        } else {
            url = new URL(PLAY_STORE_URL);
            url.searchParams.set('pcampaignid', 'web_share');
        }
    } catch {
        url = new URL(PLAY_STORE_URL);
        url.searchParams.set('pcampaignid', 'web_share');
    }

    if (cleanCode) {
        url.searchParams.set('referrer', `ref=${cleanCode}`);
        if (!url.searchParams.get('pcampaignid')) {
            url.searchParams.set('pcampaignid', 'web_share');
        }
    }
    return url.toString();
}

/**
 * Shareable referral link for Marketing / Profile.
 * Uses admin Play Store base when set; always embeds code via referrer=ref=CODE.
 */
export function buildReferralLink(code, baseUrlFromSettings = '') {
    const cleanCode = extractReferralCode(code);
    const base = String(baseUrlFromSettings || '').trim();

    // Admin Play Store URL (or empty) → always proper Play Store + referrer
    if (!base || /play\.google\.com/i.test(base) || /pcampaignid=web_share/i.test(base)) {
        return buildPlayStoreReferralLink(cleanCode, base);
    }

    // Custom non–Play Store base from admin
    try {
        if (/\/join\/?$/i.test(base) || /\/join\//i.test(base)) {
            if (!cleanCode) return base;
            return `${base.replace(/\/?$/, '/')}${cleanCode}`;
        }
        const url = new URL(base);
        if (cleanCode) url.searchParams.set('ref', cleanCode);
        return url.toString();
    } catch {
        return buildPlayStoreReferralLink(cleanCode, '');
    }
}

/** Try to read install referrer from Flutter native bridge (if implemented). */
export async function fetchFlutterInstallReferrer(timeoutMs = 2000) {
    try {
        const bridge = window.flutter_inappwebview || window.FlutterInAppWebView;
        if (!bridge || typeof bridge.callHandler !== 'function') return '';

        const result = await Promise.race([
            bridge.callHandler('getInstallReferrer'),
            new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs)),
        ]);

        if (!result) return '';
        if (typeof result === 'string') return extractReferralCode(result);
        if (typeof result === 'object') {
            return extractReferralCode(
                result.referrer || result.ref || result.code || result.referral || ''
            );
        }
    } catch {
        /* ignore */
    }
    return '';
}

export { REF_STORAGE_KEY, PLAY_STORE_URL };
