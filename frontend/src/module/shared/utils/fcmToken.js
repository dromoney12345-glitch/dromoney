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
        await api.post('/fcm-tokens/save', { token, platform, fcmToken: token });
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
}

export function isFlutterWebView() {
    return !!(
        (typeof window !== 'undefined' && window.flutter_inappwebview) ||
        (typeof window !== 'undefined' && window.FlutterTokenChannel)
    );
}

export async function requestNativeFcmToken() {
    const pending = readPendingFcmToken();
    if (pending && localStorage.getItem('dromoney_token')) {
        await saveFcmTokenToServer(pending, 'mobile');
    }

    const wv = typeof window !== 'undefined' ? window.flutter_inappwebview : null;
    if (wv && typeof wv.callHandler === 'function') {
        try {
            const native = await wv.callHandler('getFcmToken');
            if (native) await saveFcmTokenToServer(native, 'mobile');
        } catch {
            /* Flutter handler optional */
        }
    }
}
