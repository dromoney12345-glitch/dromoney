import { getFlutterBridge, waitForFlutterBridge } from './flutterAds';

const REF_STORAGE_KEY = 'dromoney_referral_code';
const REF_COOKIE = 'dromoney_ref';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dromoney.user';

const RESERVED_CODES = new Set([
    'REGISTER', 'LOGIN', 'AUTH', 'USER', 'ADMIN', 'JOIN', 'HOME', 'EARN',
    'WALLET', 'PROFILE', 'INCOME', 'EVENTS', 'WATCH', 'HELP', 'API', 'PUBLIC',
    'STORE', 'APPS', 'DETAILS', 'NULL', 'UNDEFINED', 'TRUE', 'FALSE',
]);

const UTM_NOISE = new Set([
    'INVITE', 'SHARE', 'ORGANIC', 'GOOGLE', 'PLAY', 'ANDROID', 'WEBSHARE', 'WEB',
]);

function normalizeCode(code) {
    const cleaned = String(code || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8);
    if (!cleaned || RESERVED_CODES.has(cleaned)) return '';
    return cleaned;
}

function looksLikeInviteCode(value) {
    const cleaned = normalizeCode(value);
    if (!cleaned || cleaned.length < 4) return '';
    if (UTM_NOISE.has(cleaned)) return '';
    return cleaned;
}

/** Play Install Referrer payload: `ref=CODE` or `utm_source=invite&utm_content=CODE`. */
function parseReferrerPayload(raw) {
    if (raw == null) return '';
    if (typeof raw === 'object') {
        return parseReferrerPayload(
            raw.referrer ||
            raw.installReferrer ||
            raw.ref ||
            raw.code ||
            raw.referral ||
            raw.invite ||
            ''
        );
    }

    let decoded = String(raw).trim();
    if (!decoded) return '';
    try { decoded = decodeURIComponent(decoded); } catch { /* already decoded */ }
    try { decoded = decodeURIComponent(decoded); } catch { /* once is enough */ }
    decoded = decoded.replace(/^referrer=/i, '');

    try {
        const params = new URLSearchParams(decoded.includes('=') ? decoded : `ref=${decoded}`);
        const campaign = params.get('utm_campaign') || '';
        const candidates = [
            params.get('ref'),
            params.get('invite'),
            params.get('referral'),
            params.get('utm_content'),
            params.get('code'),
            /^(web_share|google|organic|invite|share)$/i.test(campaign) ? '' : campaign,
        ];
        for (const candidate of candidates) {
            const code = looksLikeInviteCode(candidate);
            if (code) return code;
        }
    } catch {
        /* fall through */
    }

    const match =
        decoded.match(/(?:^|[?&\s#])(?:ref|invite|referral|utm_content)\s*=\s*([A-Za-z0-9]+)/i) ||
        decoded.match(/^([A-Za-z0-9]{4,12})$/);
    if (match) return looksLikeInviteCode(match[1]);
    return '';
}

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
        if (inviteParam) {
            const fromParam = looksLikeInviteCode(inviteParam) || normalizeCode(inviteParam);
            if (fromParam) return fromParam;
        }

        const hash = String(url.hash || '').replace(/^#/, '');
        if (hash) {
            const hashParams = new URLSearchParams(hash.startsWith('/') ? hash.split('?')[1] || '' : hash);
            const fromHash =
                hashParams.get('invite') ||
                hashParams.get('ref') ||
                hashParams.get('referral') ||
                hashParams.get('utm_content');
            if (fromHash) {
                const cleanedHash = looksLikeInviteCode(fromHash) || normalizeCode(fromHash);
                if (cleanedHash) return cleanedHash;
            }
            const hashJoin = hash.match(/join\/([A-Za-z0-9]+)/i);
            if (hashJoin) return normalizeCode(hashJoin[1]);
            const fromHashPayload = parseReferrerPayload(hash);
            if (fromHashPayload) return fromHashPayload;
        }

        const installReferrer = url.searchParams.get('referrer');
        if (installReferrer) {
            const fromInstall = parseReferrerPayload(installReferrer);
            if (fromInstall) return fromInstall;
        }

        const campaign = url.searchParams.get('pcampaignid') || '';
        const campaignMatch = campaign.match(/web_share([A-Za-z0-9]{4,8})$/i);
        if (campaignMatch) return looksLikeInviteCode(campaignMatch[1]);

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
    if (value == null) return '';
    if (typeof value === 'object') return parseReferrerPayload(value);

    const raw = String(value).trim();
    if (!raw) return '';

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
            params.get('utm_content') ||
            params.get('code');
        if (fromQuery) return looksLikeInviteCode(fromQuery) || normalizeCode(fromQuery);
    }

    const labeled = raw.match(/invite\s*code\s*[:\-]\s*([A-Za-z0-9]+)/i);
    if (labeled) return looksLikeInviteCode(labeled[1]) || normalizeCode(labeled[1]);

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
    const fromPayload = parseReferrerPayload(raw);
    if (fromPayload) return fromPayload;
    const kv = raw.match(/(?:^|[?&\s])(?:ref|invite|referral)\s*=\s*([A-Za-z0-9]+)/i);
    if (kv) return looksLikeInviteCode(kv[1]) || normalizeCode(kv[1]);
    if (/^[A-Za-z0-9]{4,8}$/.test(raw.trim())) return looksLikeInviteCode(raw) || normalizeCode(raw);
    return '';
}

function readReferralCookie() {
    if (typeof document === 'undefined') return '';
    const parts = String(document.cookie || '').split(';');
    for (const part of parts) {
        const [key, ...rest] = part.trim().split('=');
        if (key === REF_COOKIE) {
            try {
                return decodeURIComponent(rest.join('='));
            } catch {
                return rest.join('=');
            }
        }
    }
    return '';
}

function persistReferralEverywhere(code) {
    const cleaned = extractReferralCode(code);
    if (!cleaned) return '';
    try { localStorage.setItem(REF_STORAGE_KEY, cleaned); } catch { /* ignore */ }
    try { sessionStorage.setItem(REF_STORAGE_KEY, cleaned); } catch { /* ignore */ }
    try {
        document.cookie = `${REF_COOKIE}=${encodeURIComponent(cleaned)}; path=/; max-age=1209600; SameSite=Lax`;
    } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
        window.__pendingReferral = cleaned;
    }
    return cleaned;
}

function emitReferralSaved(code) {
    if (typeof window === 'undefined' || !code) return;
    try {
        window.dispatchEvent(new CustomEvent('dromoney_referral_saved', { detail: code }));
    } catch {
        /* ignore */
    }
}

export function savePendingReferralCode(code) {
    const cleaned = persistReferralEverywhere(code);
    if (cleaned) emitReferralSaved(cleaned);
    return cleaned;
}

export function getPendingReferralCode() {
    const sources = [];
    try { sources.push(localStorage.getItem(REF_STORAGE_KEY)); } catch { /* ignore */ }
    try { sources.push(sessionStorage.getItem(REF_STORAGE_KEY)); } catch { /* ignore */ }
    if (typeof window !== 'undefined') sources.push(window.__pendingReferral);
    sources.push(readReferralCookie());

    for (const source of sources) {
        const cleaned = extractReferralCode(source || '');
        if (cleaned) {
            persistReferralEverywhere(cleaned);
            return cleaned;
        }
    }
    return '';
}

export function clearPendingReferralCode() {
    try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
    try { sessionStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
    try { document.cookie = `${REF_COOKIE}=; path=/; max-age=0`; } catch { /* ignore */ }
    if (typeof window !== 'undefined') window.__pendingReferral = '';
}

/**
 * Play Store share link with Google Play Install Referrer payload.
 * Native app reads `referrer=` via Play Install Referrer API after install.
 */
export function buildPlayStoreReferralLink(code, baseUrlFromSettings = '') {
    const cleanCode = extractReferralCode(code);

    let url;
    try {
        const base = String(baseUrlFromSettings || '').trim();
        if (base && /play\.google\.com/i.test(base)) {
            url = new URL(base);
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
        url.searchParams.set(
            'referrer',
            `utm_source=invite&utm_medium=share&utm_content=${cleanCode}&ref=${cleanCode}`
        );
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

/** Canonical invite base URL (Play Store without a specific user's code). */
export function normalizeReferralLinkBaseUrl(raw) {
    const value = String(raw || '').trim();
    if (!value || isPlaceholderReferralBase(value)) {
        return PLAY_STORE_URL;
    }
    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`);
        if (/play\.google\.com/i.test(url.hostname)) {
            const id = url.searchParams.get('id') || 'com.dromoney.user';
            return `https://play.google.com/store/apps/details?id=${id}`;
        }
        return url.toString();
    } catch {
        return PLAY_STORE_URL;
    }
}

function buildWebJoinLink(code) {
    const cleanCode = extractReferralCode(code);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dromoney.app';
    if (!cleanCode) return `${origin}/join`;
    return `${origin}/join/${cleanCode}`;
}

/**
 * Shareable referral link — always the admin Play Store base + invite referrer.
 * Matches Admin → Affiliates "Referral Base URL" so the link never flips to /join/.
 */
export function buildReferralLink(code, baseUrlFromSettings = '') {
    return buildPlayStoreReferralLink(code, normalizeReferralLinkBaseUrl(baseUrlFromSettings));
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

const REF_CLICK_KEY = 'dromoney_referral_click';

export function saveReferralClickId(clickId) {
    const token = String(clickId || '').trim();
    if (!token) return '';
    try { localStorage.setItem(REF_CLICK_KEY, token); } catch { /* ignore */ }
    return token;
}

export function getReferralClickId() {
    try { return String(localStorage.getItem(REF_CLICK_KEY) || '').trim(); } catch { return ''; }
}

export function clearReferralClickId() {
    try { localStorage.removeItem(REF_CLICK_KEY); } catch { /* ignore */ }
}

export async function captureReferralFromClipboard() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return '';
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return '';
        if (!/dromoney|play\.google|invite\s*code|\/join\/|[?&]ref=/i.test(text)) return '';
        return savePendingReferralCode(text);
    } catch {
        return '';
    }
}

function readNativeWindowReferrer() {
    if (typeof window === 'undefined') return '';
    const hosts = [window.Android, window.android, window.Native, window.native];
    const methods = ['getInstallReferrer', 'getPlayInstallReferrer', 'getReferrer', 'getReferralCode'];
    for (const host of hosts) {
        if (!host) continue;
        for (const method of methods) {
            try {
                if (typeof host[method] === 'function') {
                    const value = host[method]();
                    const code = extractReferralCode(value);
                    if (code) return code;
                } else if (typeof host[method] === 'string' && host[method]) {
                    const code = extractReferralCode(host[method]);
                    if (code) return code;
                }
            } catch {
                /* optional native bridge */
            }
        }
    }

    const extras = [
        window.__installReferrer,
        window.installReferrer,
        window.__pendingReferral,
        window.referralCode,
    ];
    for (const extra of extras) {
        const code = extractReferralCode(extra || '');
        if (code) return code;
    }
    return '';
}

function extractFromBridgeResult(result) {
    if (!result) return '';
    if (typeof result === 'string') return extractReferralCode(result);
    if (typeof result === 'object') {
        return extractReferralCode(
            result.referrer ||
            result.installReferrer ||
            result.ref ||
            result.code ||
            result.referral ||
            result.invite ||
            result
        );
    }
    return '';
}

const INSTALL_REFERRER_HANDLERS = [
    'getInstallReferrer',
    'getPlayInstallReferrer',
    'getPlayReferrer',
    'getReferrer',
    'getReferralCode',
    'getInviteCode',
    'installReferrer',
];

async function callInstallReferrerHandlers(bridge, timeoutMs) {
    if (!bridge || typeof bridge.callHandler !== 'function') return '';
    for (const handler of INSTALL_REFERRER_HANDLERS) {
        try {
            const result = await Promise.race([
                bridge.callHandler(handler),
                new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs)),
            ]);
            const code = extractFromBridgeResult(result);
            if (code) return code;
        } catch {
            /* try next handler name */
        }
    }
    return '';
}

/** Try to read install referrer from Flutter / Android native (Play Store download). */
export async function fetchFlutterInstallReferrer(timeoutMs = 8000) {
    const started = Date.now();
    const budget = Math.max(timeoutMs, 0);

    const fromBridge = await callInstallReferrerHandlers(getFlutterBridge(), Math.min(800, budget || 800));
    if (fromBridge) {
        savePendingReferralCode(fromBridge);
        return fromBridge;
    }

    const alreadySaved = getPendingReferralCode() || readNativeWindowReferrer();
    if (alreadySaved) {
        persistReferralEverywhere(alreadySaved);
        return alreadySaved;
    }

    if (budget <= 0) return '';

    const bridge = await waitForFlutterBridge(Math.min(budget, 4000));
    if (!bridge && typeof window !== 'undefined' && !window.Android && !window.android) {
        return getPendingReferralCode();
    }
    const remainingAfterWait = Math.max(200, budget - (Date.now() - started));
    const fromReady = await callInstallReferrerHandlers(bridge, Math.min(1500, remainingAfterWait));
    if (fromReady) {
        savePendingReferralCode(fromReady);
        return fromReady;
    }

    while (Date.now() - started < budget) {
        const polled =
            getPendingReferralCode() ||
            readNativeWindowReferrer() ||
            (await callInstallReferrerHandlers(getFlutterBridge(), 400));
        if (polled) {
            savePendingReferralCode(polled);
            return polled;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return getPendingReferralCode();
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
        window.onInstallReferrer = apply;
        window.onReferralCode = apply;

        if (!window.__dromoneyRefCaptureBound) {
            window.__dromoneyRefCaptureBound = true;
            window.addEventListener('message', (event) => {
                const data = event?.data;
                if (data == null) return;
                if (typeof data === 'object') {
                    if (data.referrer || data.installReferrer || data.ref || data.referral || data.invite || data.referralCode || data.code) {
                        apply(data);
                    }
                    return;
                }
                const text = String(data);
                if (
                    /ref=/i.test(text) ||
                    /utm_content=/i.test(text) ||
                    /\/join\//i.test(text) ||
                    /play\.google\.com/i.test(text) ||
                    /invite\s*code/i.test(text) ||
                    /^[A-Za-z0-9]{4,8}$/.test(text.trim())
                ) {
                    apply(text);
                }
            });
            window.addEventListener('flutterInAppWebViewPlatformReady', () => {
                fetchFlutterInstallReferrer(8000);
            });
            window.addEventListener('hashchange', () => captureReferralFromLocation());
        }
    }

    if (!installReferralCapture._started) {
        installReferralCapture._started = true;
        captureReferralFromClipboard();
        fetchFlutterInstallReferrer(15000).then((code) => {
            if (code) savePendingReferralCode(code);
        });
    }

    return () => {};
}

export { REF_STORAGE_KEY, PLAY_STORE_URL };
