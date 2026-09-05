const PENDING_KEY = 'pending_mobile_fcm_token';

export function normalizeFcmToken(raw) {
    if (raw == null) return '';
    let value = raw;
    if (typeof value === 'object') {
        value = value.token || value.fcmToken || value.data || '';
        if (typeof value === 'object' && value) {
            value = value.token || value.fcmToken || '';
        }
    }
    let token = String(value || '').trim();
    if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
    ) {
        token = token.slice(1, -1).trim();
    }
    if (token.startsWith('{')) {
        try {
            const parsed = JSON.parse(token);
            token = String(parsed.token || parsed.fcmToken || '').trim();
        } catch {
            /* keep original */
        }
    }
    if (!token || token === 'null' || token === 'undefined' || token.length < 20) {
        return '';
    }
    return token;
}

export function rememberPendingFcmToken(raw) {
    const token = normalizeFcmToken(raw);
    if (!token) return '';
    try {
        localStorage.setItem(PENDING_KEY, token);
    } catch {
        /* ignore quota */
    }
    return token;
}

export function readPendingFcmToken() {
    try {
        const queued = Array.isArray(window.__pendingFcmTokens) ? window.__pendingFcmTokens : [];
        for (let i = queued.length - 1; i >= 0; i -= 1) {
            const token = normalizeFcmToken(queued[i]);
            if (token) {
                rememberPendingFcmToken(token);
                return token;
            }
        }
        return normalizeFcmToken(localStorage.getItem(PENDING_KEY));
    } catch {
        return '';
    }
}

export async function saveFcmTokenToServer(raw, platform = 'mobile') {
    const token = rememberPendingFcmToken(raw);
    if (!token) return false;
    if (!localStorage.getItem('dromoney_token')) return false;
    try {
        const { default: api } = await import('../services/api');
        const platformNorm = String(platform || 'mobile').toLowerCase();
        // Flutter WebView always stores as mobile so Android/iOS tray gets the right token bucket
        const resolved =
            platformNorm === 'web' && !isFlutterWebView()
                ? 'web'
                : platformNorm === 'web'
                    ? 'mobile'
                    : platformNorm || 'mobile';
        await api.post('/fcm-tokens/save', {
            token,
            platform: resolved,
            fcmToken: token,
        });
        try {
            localStorage.removeItem(PENDING_KEY);
            window.__pendingFcmTokens = [];
        } catch {
            /* ignore */
        }
        return true;
    } catch (err) {
        console.error('[FCM] save failed:', err?.message || err);
        return false;
    }
}

export function installFcmTokenBridge() {
    const handler = (token) => {
        rememberPendingFcmToken(token);
        saveFcmTokenToServer(token, 'mobile');
    };
    window.saveMobileFcmToken = handler;
    window.saveFcmToken = handler;
    window.saveAppFcmToken = handler;
    window.onFcmToken = handler;
    window.receiveFcmToken = handler;
}

export function isFlutterWebView() {
    if (typeof window === 'undefined') return false;
    return !!(
        window.flutter_inappwebview ||
        window.FlutterInAppWebView ||
        window.FlutterTokenChannel ||
        navigator.userAgent?.includes('Flutter')
    );
}

async function callNativeTokenHandlers(bridge) {
    if (!bridge || typeof bridge.callHandler !== 'function') return '';
    const handlers = ['getFcmToken', 'requestFcmToken', 'getToken', 'fetchFcmToken'];
    for (const name of handlers) {
        try {
            const native = await bridge.callHandler(name);
            const token = normalizeFcmToken(native);
            if (token) return token;
        } catch {
            /* try next */
        }
    }
    return '';
}

/**
 * Persist any pending token and pull a fresh native FCM token from Flutter.
 * Retries a few times because the bridge often appears after first paint.
 */
export async function requestNativeFcmToken() {
    const pending = readPendingFcmToken();
    if (pending && localStorage.getItem('dromoney_token')) {
        await saveFcmTokenToServer(pending, 'mobile');
    }

    const tryOnce = async () => {
        const wv =
            typeof window !== 'undefined'
                ? window.flutter_inappwebview || window.FlutterInAppWebView
                : null;
        const token = await callNativeTokenHandlers(wv);
        if (token) {
            await saveFcmTokenToServer(token, 'mobile');
            return true;
        }
        return false;
    };

    if (await tryOnce()) return;

    // Bridge may not be ready yet — retry briefly
    for (const wait of [800, 2000, 4000]) {
        await new Promise((r) => setTimeout(r, wait));
        if (await tryOnce()) return;
    }
}
