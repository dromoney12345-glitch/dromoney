/**
 * Ask Flutter shell to show a system / tray notification.
 * In-app inbox can update via socket while the phone shade stays empty
 * unless native FCM or a local notification runs.
 */
export function showFlutterSystemNotification({ title, body, message, link, type, data } = {}) {
    const t = String(title || '').trim();
    const b = String(body || message || '').trim();
    if (!t || !b) return false;

    const payload = {
        title: t,
        body: b,
        message: b,
        link: link || '/user/home',
        type: type || 'info',
        ...(data && typeof data === 'object' ? data : {}),
    };

    const bridge =
        (typeof window !== 'undefined' && (window.flutter_inappwebview || window.FlutterInAppWebView)) ||
        null;

    let called = false;
    if (bridge && typeof bridge.callHandler === 'function') {
        const handlers = [
            'showLocalNotification',
            'showNotification',
            'displayNotification',
            'onPushMessage',
            'showPushNotification',
        ];
        for (const name of handlers) {
            try {
                bridge.callHandler(name, payload);
                called = true;
            } catch {
                /* handler optional */
            }
        }
    }

    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dromoney_system_notification', { detail: payload }));
            if (typeof window.onDromoneyNotification === 'function') {
                window.onDromoneyNotification(payload);
                called = true;
            }
        }
    } catch {
        /* ignore */
    }

    return called;
}
