const REF_STORAGE_KEY = 'dromoney_referral_code';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dromoney.user';

const RESERVED_CODES = new Set([
    'REGISTER', 'LOGIN', 'AUTH', 'USER', 'ADMIN', 'JOIN', 'HOME', 'EARN',
    'WALLET', 'PROFILE', 'INCOME', 'EVENTS', 'WATCH', 'HELP', 'API', 'PUBLIC',
    'STORE', 'APPS', 'DETAILS', 'NULL', 'UNDEFINED', 'TRUE', 'FALSE',
]);

function extractFromUrlString(rawUrl) {
    try {
        const cleanedUrl = String(rawUrl || '').replace(/[),.;]+$/g, '');
        const url = new URL(
            cleanedUrl.includes('://') || cleanedUrl.startsWith('/')
                ? cleanedUrl
                : `https://${cleanedUrl}`,
            typeof window !== 'undefined' ? window.location.origin : 'https://dromoney.app'
        );

        const inviteParam =
            url.searchParams.get('invite') ||
            url.searchParams.get('ref') ||
            url.searchParams.get('referral') ||
            url.searchParams.get('utm_content') ||
            url.searchParams.get('code');
        if (inviteParam) return normalizeCode(inviteParam);

        const hash = String(url.hash || '').replace(/^#/, '');
        if (hash) {
            const hashParams = new URLSearchParams(hash.startsWith('/') ? hash.split('?')[1] || '' : hash);
            const fromHash =
                hashParams.get('invite') ||
                hashParams.get('ref') ||
                hashParams.get('referral');
            if (fromHash) return normalizeCode(fromHash);
            const hashJoin = hash.match(/join\/([A-Za-z0-9]+)/i);
            if (hashJoin) return normalizeCode(hashJoin[1]);
        }

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
    } catch {
        /* ignore */
    }
    return '';
}

/** Extract an invite code from pasted text, URL, or raw code. */
export function extractReferralCode(value) {
    if (!value) return '';
    const raw = String(value).trim();

    const urlInText = raw.match(/https?:\/\/[^\s]+/i);
    if (urlInText) {
        const fromUrl = extractFromUrlString(urlInText[0]);
        if (fromUrl) return fromUrl;
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

    if (raw.includes('://') || raw.startsWith('/') || raw.includes('play.google.com')) {
        const fromUrl = extractFromUrlString(raw);
        if (fromUrl) return fromUrl;
        if (urlInText) return '';
    }

    if (/nhgfAFF-/i.test(raw)) {
        return normalizeCode(raw.split(/nhgfAFF-/i).pop());
    }
    if (/AFF-/i.test(raw)) {
        return normalizeCode(raw.split(/AFF-/i).pop());
    }
    if (/\/join\//i.test(raw)) {
        return normalizeCode(raw.split(/\/join\//i).pop());
    }
    const kv = raw.match(/(?:^|[?&\s])(?:ref|invite|referral)\s*=\s*([A-Za-z0-9]+)/i);
    if (kv) return normalizeCode(kv[1]);
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
        // Visible in the copied URL so signup can parse it from a pasted link
        url.searchParams.set('ref', cleanCode);
        if (!url.searchParams.get('pcampaignid')) {
            url.searchParams.set('pcampaignid', 'web_share');
        }
    }
    return url.toString();
}

function isPlaceholderReferralBase(base) {
    const b = String(base || '').trim();
    if (!b) return true;
    return /earningapp\.com/i.test(b) || /example\.com/i.test(b);
}

function buildWebJoinLink(code) {
    const cleanCode = extractReferralCode(code);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dromoney.app';
    if (!cleanCode) return `${origin}/join`;
    return `${origin}/join/${cleanCode}`;
}

/**
 * Shareable referral link for Marketing / Profile.
 * Prefer a web /join/CODE link so signup actually receives the code.
 * Play Store is used only when admin explicitly set a Play Store base URL.
 */
export function buildReferralLink(code, baseUrlFromSettings = '') {
    const cleanCode = extractReferralCode(code);
    const base = String(baseUrlFromSettings || '').trim();

    if (/play\.google\.com/i.test(base) || /pcampaignid=web_share/i.test(base)) {
        return buildPlayStoreReferralLink(cleanCode, base);
    }

    if (isPlaceholderReferralBase(base)) {
        return buildWebJoinLink(cleanCode);
    }

    try {
        if (/\/join\/?$/i.test(base) || /\/join\//i.test(base)) {
            if (!cleanCode) return base;
            return `${base.replace(/\/?$/, '/')}${cleanCode}`;
        }
        const url = new URL(base);
        if (cleanCode) url.searchParams.set('ref', cleanCode);
        return url.toString();
    } catch {
        return buildWebJoinLink(cleanCode);
    }
}

export function captureReferralFromLocation(href) {
    const raw = href || (typeof window !== 'undefined' ? window.location.href : '');
    const cleaned = extractReferralCode(raw);
    if (cleaned) return savePendingReferralCode(cleaned);
    return '';
}

export function resolveReferralCodeForRegister(explicit = '') {
    return (
        extractReferralCode(explicit) ||
        getPendingReferralCode() ||
        captureReferralFromLocation() ||
        ''
    );
}

/**
 * Install capture as soon as the webview loads (including splash).
 * Flutter can call window.savePendingReferral('CODE') or pass a full Play Store URL.
 */
export function installReferralCapture() {
    captureReferralFromLocation();

    const apply = (value) => savePendingReferralCode(value);

    if (typeof window !== 'undefined') {
        window.savePendingReferral = apply;
        window.saveReferralCode = apply;
        window.savePendingReferralCode = apply;
    }

    fetchFlutterInstallReferrer(2500).then((code) => {
        if (code) savePendingReferralCode(code);
    });

    return () => {
        if (typeof window === 'undefined') return;
        delete window.savePendingReferral;
        delete window.saveReferralCode;
        delete window.savePendingReferralCode;
    };
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
