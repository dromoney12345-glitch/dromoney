/**
 * Flutter InAppWebView rewarded ads.
 * Progress may increase ONLY after a real AdMob reward signal.
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

let flutterAppReadySent = false;

/** Tell Flutter the WebView UI is ready so native splash can hide without a spinner flash. */
export function notifyFlutterAppReady() {
    if (flutterAppReadySent) return;
    const send = (bridge) => {
        if (!bridge || typeof bridge.callHandler !== 'function' || flutterAppReadySent) return false;
        try {
            bridge.callHandler('appReady');
            bridge.callHandler('hideSplash');
            flutterAppReadySent = true;
            return true;
        } catch {
            return false;
        }
    };
    if (send(getFlutterBridge())) return;
    waitForFlutterBridge(8000).then((bridge) => send(bridge));
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
    'not_ready',
    'unavailable',
]);

const EARN_STATUSES = new Set([
    'rewarded',
    'user_earned_reward',
    'earned',
    'reward_earned',
    'on_user_earned_reward',
    'reward',
    'complete',
    'completed',
    'success',
]);

function isFailResult(result) {
    if (result === false || result === 0 || result === 'false' || result === '0') return true;
    if (result == null) return false;
    if (typeof result === 'string') return FAIL_STATUSES.has(normStatus(result));
    if (typeof result === 'object') {
        if (result.rewarded === false || result.earned === false) return true;
        if (result.success === false && result.rewarded !== true && result.earned !== true) return true;
        const status = normStatus(result.status || result.event || result.state || result.reason || result.type);
        if (EARN_STATUSES.has(status)) return false;
        return FAIL_STATUSES.has(status);
    }
    return false;
}

/**
 * Explicit AdMob reward shapes from Flutter / JS callbacks.
 * Bare true/1 alone is NOT enough (often returned on back) — see watchedLongEnough gate.
 */
export function isRewardedAdSuccess(result) {
    if (result == null) return false;
    if (isFailResult(result)) return false;

    if (typeof result === 'number' && result > 0) return true;

    if (typeof result === 'string') {
        const s = normStatus(result);
        if (EARN_STATUSES.has(s)) return true;
        if (s.includes('reward') && !FAIL_STATUSES.has(s)) return true;
        return false;
    }

    if (typeof result === 'object') {
        if (result.rewarded === true || result.earned === true) return true;
        if (Number(result.amount) > 0 || Number(result.rewardAmount) > 0) return true;
        if (result.success === true && (result.rewarded === true || result.earned === true || Number(result.amount) > 0)) {
            return true;
        }
        // Many Flutter bridges return { success: true } only after onUserEarnedReward
        if (result.success === true && result.dismissed !== true && result.closed !== true) {
            return true;
        }
        const status = normStatus(
            result.status || result.event || result.state || result.callback || result.type || result.action
        );
        if (EARN_STATUSES.has(status)) return true;
        if (status.includes('reward') && !FAIL_STATUSES.has(status)) return true;
    }

    return false;
}

function watchedLongEnough(session, minMs = 4500) {
    if (!session?.startedAt) return false;
    return Date.now() - session.startedAt >= minMs;
}

export function noteRewardedAdEarned(payload) {
    if (!adSession) {
        // Persist a short-lived flag if callback arrives slightly outside session
        window.__dromoneyPendingAdReward = Date.now();
        return false;
    }
    if (isFailResult(payload)) return false;
    // Native onUserEarnedReward often calls JS with no args — during an open session that IS the earn signal.
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

export function noteRewardedAdFailed(payload) {
    if (!adSession) return;
    adSession.failed = true;
    adSession.failPayload = payload;
    if (typeof adSession.resolveClosed === 'function') adSession.resolveClosed();
}

function installSessionHooks() {
    const onEarned = (payload) => noteRewardedAdEarned(payload);
    const onClosed = () => noteRewardedAdClosed();
    const onFailed = (payload) => noteRewardedAdFailed(payload);

    window.onAdMobUserEarnedReward = onEarned;
    window.onRewardedAdEarned = onEarned;
    window.onUserEarnedReward = onEarned;
    window.onRewardEarned = onEarned;
    window.onAdMobReward = onEarned;
    window.rewardUser = onEarned;
    window.onRewardedAdClosed = onClosed;
    window.onRewardedAdDismissed = onClosed;
    window.onAdMobAdDismissed = onClosed;
    window.onAdClosed = onClosed;
    window.onAdMobAdFailed = onFailed;
    window.onRewardedAdFailed = onFailed;
}

function clearSessionHooks() {
    delete window.onAdMobUserEarnedReward;
    delete window.onRewardedAdEarned;
    delete window.onUserEarnedReward;
    delete window.onRewardEarned;
    delete window.onAdMobReward;
    delete window.rewardUser;
    delete window.onRewardedAdClosed;
    delete window.onRewardedAdDismissed;
    delete window.onAdMobAdDismissed;
    delete window.onAdClosed;
    delete window.onAdMobAdFailed;
    delete window.onRewardedAdFailed;
}

function consumePendingRewardFlag() {
    const ts = Number(window.__dromoneyPendingAdReward || 0);
    if (!ts) return false;
    delete window.__dromoneyPendingAdReward;
    // Only accept if flag is fresh (within last 20s)
    return Date.now() - ts < 20000;
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

    delete window.__dromoneyPendingAdReward;
    adSession = { earned: false, closed: false, failed: false, startedAt: Date.now() };
    const earnedWait = new Promise((resolve) => {
        adSession.resolveEarned = () => resolve(true);
    });
    const closedWait = new Promise((resolve) => {
        adSession.resolveClosed = () => resolve(true);
    });
    installSessionHooks();

    let outcome = { ok: false, reason: 'dismissed', result: null };

    try {
        const tryHandlers = ['showRewardAd', 'showRewardedAd', 'showAdMobReward', 'showRewardedVideo'];
        let result;
        let handlerError;

        for (const name of tryHandlers) {
            try {
                result = await Promise.race([
                    bridge.callHandler(name, placement),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('ad_timeout')), timeoutMs)),
                ]);
                handlerError = null;
                break;
            } catch (err) {
                handlerError = err;
                const msg = String(err?.message || err || '');
                if (msg.includes('ad_timeout')) throw err;
                if (/not\s*found|no\s*handler|unimplemented|missing/i.test(msg)) continue;
                break;
            }
        }

        if (handlerError && result === undefined) {
            const msg = String(handlerError?.message || handlerError || '');
            if (msg.includes('ad_timeout')) {
                outcome = { ok: false, reason: 'timeout' };
            } else {
                outcome = { ok: false, reason: 'error', error: handlerError };
            }
        } else if (adSession.earned || isRewardedAdSuccess(result) || consumePendingRewardFlag()) {
            outcome = { ok: true, reason: 'rewarded', result };
        } else if ((result === true || result === 1 || result === 'true' || result === '1') && watchedLongEnough(adSession)) {
            outcome = { ok: true, reason: 'rewarded_long_watch', result };
        } else {
            await Promise.race([
                closedWait,
                earnedWait,
                new Promise((resolve) => setTimeout(resolve, 500)),
            ]);

            const lateEarn = await Promise.race([
                earnedWait,
                new Promise((resolve) => setTimeout(() => resolve(false), 3500)),
            ]);

            if (adSession.earned || lateEarn || consumePendingRewardFlag() || isRewardedAdSuccess(result)) {
                outcome = { ok: true, reason: 'rewarded', result };
            } else if (watchedLongEnough(adSession, 8000) && result && typeof result === 'object' && result.success === true && !isFailResult(result)) {
                outcome = { ok: true, reason: 'rewarded_success_object', result };
            } else if (adSession.failed) {
                outcome = { ok: false, reason: 'failed', result: adSession.failPayload || result };
            } else {
                outcome = { ok: false, reason: 'dismissed', result };
            }
        }
    } catch (err) {
        const msg = String(err?.message || err || '');
        if (msg.includes('ad_timeout')) {
            if (adSession?.earned || consumePendingRewardFlag()) {
                outcome = { ok: true, reason: 'rewarded', result: null };
            } else {
                outcome = { ok: false, reason: 'timeout' };
            }
        } else {
            outcome = { ok: false, reason: 'error', error: err };
        }
    }

    // Grace period: native reward callback sometimes arrives right after handler resolve
    await new Promise((r) => setTimeout(r, 400));
    if (!outcome.ok && (adSession?.earned || consumePendingRewardFlag())) {
        outcome = { ok: true, reason: 'rewarded_late', result: outcome.result };
    }

    clearSessionHooks();
    adSession = null;
    return outcome;
}
