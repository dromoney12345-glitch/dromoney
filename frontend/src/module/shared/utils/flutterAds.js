/**
 * Flutter InAppWebView rewarded ads.
 * Progress may increase ONLY after AdMob onUserEarnedReward.
 * Back / close / dismiss / no-fill must never count.
 */

let adSession = null;

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

function normStatus(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const FAIL_STATUSES = new Set([
    'failed',
    'error',
    'dismissed',
    'closed',
    'canceled',
    'cancelled',
    'skipped',
    'skip',
    'nofill',
    'no_fill',
    'not_shown',
    'impression',
    'opened',
    'shown',
    'loaded',
    'clicked',
]);

const EARN_STATUSES = new Set([
    'rewarded',
    'user_earned_reward',
    'earned',
    'reward_earned',
    'on_user_earned_reward',
]);

function isFailResult(result) {
    if (result === false || result === 0 || result === 'false' || result === '0') return true;
    if (result == null) return false;
    if (typeof result === 'string') return FAIL_STATUSES.has(normStatus(result));
    if (typeof result === 'object') {
        if (result.rewarded === false || result.success === false || result.earned === false) return true;
        const status = normStatus(result.status || result.event || result.state || result.reason || result.type);
        return FAIL_STATUSES.has(status);
    }
    return false;
}

/**
 * Strict: only an explicit AdMob reward counts.
 * Bare true / 1 is ignored — Flutter often returns that when the user hits back.
 */
export function isRewardedAdSuccess(result) {
    if (result == null || result === true || result === 1 || result === 'true' || result === '1') {
        return false;
    }
    if (isFailResult(result)) return false;
    if (typeof result === 'string') return EARN_STATUSES.has(normStatus(result));
    if (typeof result === 'object') {
        if (result.rewarded === true || result.earned === true) return true;
        if (result.success === true && (result.rewarded === true || result.earned === true || result.amount != null)) {
            return Number(result.amount) > 0 || result.rewarded === true || result.earned === true;
        }
        const status = normStatus(result.status || result.event || result.state || result.callback);
        return EARN_STATUSES.has(status);
    }
    return false;
}

export function noteRewardedAdEarned(payload) {
    if (!adSession) return false;
    if (isFailResult(payload)) return false;
    // Native onUserEarnedReward often calls JS with no args. During an open ad session that is the earn signal.
    if (payload == null || payload === true || payload === 1 || isRewardedAdSuccess(payload)) {
        adSession.earned = true;
        if (typeof adSession.resolveEarned === 'function') adSession.resolveEarned();
        return true;
    }
    return false;
}

export function noteRewardedAdClosed() {
    if (!adSession) return;
    adSession.closed = true;
    if (typeof adSession.resolveClosed === 'function') adSession.resolveClosed();
}

function installSessionHooks() {
    const onEarned = (payload) => noteRewardedAdEarned(payload);
    const onClosed = () => noteRewardedAdClosed();

    window.onAdMobUserEarnedReward = onEarned;
    window.onRewardedAdEarned = onEarned;
    window.onUserEarnedReward = onEarned;
    window.onRewardedAdClosed = onClosed;
    window.onRewardedAdDismissed = onClosed;
    window.onAdMobAdDismissed = onClosed;
    window.onAdMobAdFailed = onClosed;
}

function clearSessionHooks() {
    delete window.onAdMobUserEarnedReward;
    delete window.onRewardedAdEarned;
    delete window.onUserEarnedReward;
    delete window.onRewardedAdClosed;
    delete window.onRewardedAdDismissed;
    delete window.onAdMobAdDismissed;
    delete window.onAdMobAdFailed;
}

/**
 * Show a rewarded ad. Resolves { ok, reason }.
 * ok is true only if AdMob reported a reward (callback or explicit result object).
 */
export async function showFlutterRewardedAd(placement = 'reward_ad_1', timeoutMs = 180000) {
    const bridge = await waitForFlutterBridge();
    if (!bridge) {
        return { ok: false, reason: 'no_bridge' };
    }

    adSession = { earned: false, closed: false };
    const earnedWait = new Promise((resolve) => {
        adSession.resolveEarned = () => resolve(true);
    });
    installSessionHooks();

    try {
        const result = await Promise.race([
            bridge.callHandler('showRewardAd', placement),
            new Promise((_, reject) => setTimeout(() => reject(new Error('ad_timeout')), timeoutMs)),
        ]);

        if (adSession.earned || isRewardedAdSuccess(result)) {
            return { ok: true, reason: 'rewarded', result };
        }

        // Reward callback usually arrives just before / with dismiss. Wait briefly.
        const lateEarn = await Promise.race([
            earnedWait,
            new Promise((resolve) => setTimeout(() => resolve(false), 800)),
        ]);

        if (adSession.earned || lateEarn) {
            return { ok: true, reason: 'rewarded', result };
        }

        if (isFailResult(result) || adSession.closed) {
            return { ok: false, reason: 'dismissed', result };
        }

        return { ok: false, reason: 'dismissed', result };
    } catch (err) {
        const msg = String(err?.message || err || '');
        if (msg.includes('ad_timeout')) {
            return { ok: false, reason: 'timeout' };
        }
        return { ok: false, reason: 'error', error: err };
    } finally {
        clearSessionHooks();
        adSession = null;
    }
}
