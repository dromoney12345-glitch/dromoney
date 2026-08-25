/**
 * Helpers for Flutter InAppWebView rewarded ads.
 * Some devices inject the bridge late or return inconsistent ad results.
 */

export function isFlutterApp() {
    return !!(
        window.flutter_inappwebview ||
        window.FlutterInAppWebView ||
        navigator.userAgent?.includes('Flutter')
    );
}

export function getFlutterBridge() {
    const bridge = window.flutter_inappwebview || window.FlutterInAppWebView;
    if (bridge && typeof bridge.callHandler === 'function') {
        return bridge;
    }
    return null;
}

/** Wait until Flutter injects callHandler (common on slower devices). */
export function waitForFlutterBridge(timeoutMs = 2500) {
    return new Promise((resolve) => {
        const existing = getFlutterBridge();
        if (existing) {
            resolve(existing);
            return;
        }

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('flutterInAppWebViewPlatformReady', onReady);
            clearInterval(poll);
            clearTimeout(timer);
            resolve(value);
        };

        const onReady = () => finish(getFlutterBridge());
        window.addEventListener('flutterInAppWebViewPlatformReady', onReady);

        const poll = setInterval(() => {
            const bridge = getFlutterBridge();
            if (bridge) finish(bridge);
        }, 100);

        const timer = setTimeout(() => finish(getFlutterBridge()), timeoutMs);
    });
}

/**
 * Count an AdMob rewarded ad only when the SDK says the user earned the reward.
 * Back / close / no-fill / null must NOT count — that was filling the progress bar early.
 */
export function isRewardedAdSuccess(result) {
    if (result === true || result === 1 || result === 'true' || result === '1') return true;
    if (result === false || result === 0 || result === 'false' || result === '0') return false;
    if (result == null || result === undefined) return false;
    if (typeof result === 'object') {
        if (result.rewarded === true || result.success === true || result.earned === true) return true;
        if (Number(result.amount) > 0) return true;
        if (result.rewardType || result.type === 'RewardItem') return true;
        if (result.rewarded === false || result.success === false || result.earned === false) return false;
        const status = String(result.status || result.event || result.state || '').toLowerCase();
        if (['rewarded', 'completed', 'success', 'earned', 'user_earned_reward'].includes(status)) return true;
        if (['failed', 'dismissed', 'closed', 'canceled', 'cancelled', 'error', 'nofill', 'no_fill', 'skipped'].includes(status)) {
            return false;
        }
    }
    if (typeof result === 'string') {
        const v = result.toLowerCase();
        if (['rewarded', 'completed', 'success', 'ok', 'earned', 'user_earned_reward'].includes(v)) return true;
        if (['failed', 'error', 'dismissed', 'closed', 'canceled', 'cancelled', 'nofill', 'no_fill', 'skipped'].includes(v)) {
            return false;
        }
    }
    return false;
}

/**
 * Show a rewarded ad via Flutter. Resolves { ok, reason }.
 * Does not throw for normal "no fill" cases.
 */
export async function showFlutterRewardedAd(placement = 'reward_ad_1', timeoutMs = 180000) {
    const bridge = await waitForFlutterBridge();
    if (!bridge) {
        return { ok: false, reason: 'no_bridge' };
    }

    try {
        const result = await Promise.race([
            bridge.callHandler('showRewardAd', placement),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('ad_timeout')), timeoutMs)
            ),
        ]);

        if (isRewardedAdSuccess(result)) {
            return { ok: true, reason: 'rewarded', result };
        }
        return { ok: false, reason: 'no_fill', result };
    } catch (err) {
        const msg = String(err?.message || err || '');
        if (msg.includes('ad_timeout')) {
            return { ok: false, reason: 'timeout' };
        }
        return { ok: false, reason: 'error', error: err };
    }
}
