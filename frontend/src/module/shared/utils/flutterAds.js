/**
 * Flutter InAppWebView rewarded ads.
 *
 * Important: many Flutter shells resolve `showRewardAd` when the ad OPENS,
 * not when it finishes. We must keep waiting for earn/close after that.
 *
 * Count rules:
 * - Explicit earn callback / reward payload → count
 * - Ad stayed open ≥ MIN_WATCH_MS and closed (or handler ended) without hard fail → count
 * - Early close / no-fill / error → do NOT count
 */

let adSession = null;

const MIN_WATCH_MS = 5000; // full rewarded ads are typically 5–30s
const EARLY_CLOSE_MS = 2500; // back within this = skip

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

/** Hard failures — never count */
const HARD_FAIL = new Set([
    'failed',
    'error',
    'nofill',
    'no_fill',
    'not_shown',
    'not_ready',
    'unavailable',
    'canceled',
    'cancelled',
    'skipped',
    'skip',
]);

/** Close-ish statuses — normal after a full watch; NOT automatic fail */
const CLOSE_STATUSES = new Set([
    'closed',
    'dismissed',
    'complete',
    'completed',
    'done',
    'finished',
]);

const EARN_STATUSES = new Set([
    'rewarded',
    'user_earned_reward',
    'earned',
    'reward_earned',
    'on_user_earned_reward',
    'reward',
    'success',
]);

/** Ad still playing / just opened — keep waiting */
const OPEN_STATUSES = new Set([
    'shown',
    'opened',
    'loaded',
    'impression',
    'showing',
    'started',
    'display',
]);

function isHardFail(result) {
    if (result === false || result === 0 || result === 'false' || result === '0') return true;
    if (result == null) return false;
    if (typeof result === 'string') return HARD_FAIL.has(normStatus(result));
    if (typeof result === 'object') {
        if (result.rewarded === false || result.earned === false) return true;
        if (result.success === false && result.rewarded !== true && result.earned !== true) return true;
        const status = normStatus(result.status || result.event || result.state || result.reason || result.type);
        return HARD_FAIL.has(status);
    }
    return false;
}

function isOpenOnlyResult(result) {
    if (result == null) return true; // many bridges return null/undefined when ad is shown
    if (typeof result === 'string') return OPEN_STATUSES.has(normStatus(result));
    if (typeof result === 'object') {
        const status = normStatus(result.status || result.event || result.state || result.type);
        return OPEN_STATUSES.has(status);
    }
    return false;
}

export function isRewardedAdSuccess(result) {
    if (result == null) return false;
    if (isHardFail(result)) return false;

    if (typeof result === 'number' && result > 0) return true;

    if (typeof result === 'string') {
        const s = normStatus(result);
        if (EARN_STATUSES.has(s)) return true;
        if (s.includes('reward') && !HARD_FAIL.has(s)) return true;
        return false;
    }

    if (typeof result === 'object') {
        if (result.rewarded === true || result.earned === true) return true;
        if (Number(result.amount) > 0 || Number(result.rewardAmount) > 0) return true;
        if (result.success === true) return true;
        const status = normStatus(
            result.status || result.event || result.state || result.callback || result.type || result.action
        );
        if (EARN_STATUSES.has(status)) return true;
        if (status.includes('reward') && !HARD_FAIL.has(status)) return true;
    }

    return false;
}

function elapsedMs(session) {
    return session?.startedAt ? Date.now() - session.startedAt : 0;
}

function watchedLongEnough(session, minMs = MIN_WATCH_MS) {
    return elapsedMs(session) >= minMs;
}

export function noteRewardedAdEarned(payload) {
    if (!adSession) {
        window.__dromoneyPendingAdReward = Date.now();
        return false;
    }
    if (isHardFail(payload)) return false;
    // No-arg native callback during an open session = earn
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
    return Date.now() - ts < 20000;
}

function shouldCountCompletedSession(session, result) {
    if (!session) return false;
    if (session.earned) return true;
    if (session.failed || isHardFail(result)) return false;
    if (!watchedLongEnough(session, MIN_WATCH_MS)) return false;
    // Early cancel only — long session that closed/finished counts
    if (elapsedMs(session) < EARLY_CLOSE_MS) return false;
    return true;
}

/**
 * Show a rewarded ad. Resolves { ok, reason, elapsedMs }.
 */
export async function showFlutterRewardedAd(placement = 'reward_ad_1', timeoutMs = 180000) {
    const bridge = await waitForFlutterBridge();
    if (!bridge) {
        return { ok: false, reason: 'no_bridge', elapsedMs: 0 };
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
    let result;

    try {
        const tryHandlers = ['showRewardAd', 'showRewardedAd', 'showAdMobReward', 'showRewardedVideo'];
        let handlerError;

        for (const name of tryHandlers) {
            try {
                result = await Promise.race([
                    bridge.callHandler(name, placement),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('ad_timeout')), timeoutMs)),
                ]);
                handlerError = null;
                console.debug('[AdMob] handler', name, 'returned', result, 'earned=', adSession.earned, 'elapsed=', elapsedMs(adSession));
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
            outcome = {
                ok: false,
                reason: String(handlerError?.message || '').includes('ad_timeout') ? 'timeout' : 'error',
                error: handlerError,
            };
        } else if (adSession.earned || isRewardedAdSuccess(result) || consumePendingRewardFlag()) {
            outcome = { ok: true, reason: 'rewarded', result };
        } else if (isHardFail(result) || adSession.failed) {
            outcome = { ok: false, reason: 'failed', result: adSession.failPayload || result };
        } else {
            const returnedQuickly = elapsedMs(adSession) < 2000;

            if (returnedQuickly && !adSession.closed && !adSession.earned) {
                // Handler resolved on SHOW — wait until ad actually ends (earn or close), max 2 min
                console.debug('[AdMob] handler returned early — waiting for earn/close');
                await Promise.race([
                    earnedWait,
                    closedWait,
                    new Promise((resolve) => setTimeout(resolve, 120000)),
                ]);
            } else if (!adSession.earned && !adSession.closed) {
                // Handler returned after a longer session but no close hook yet — brief grace
                await Promise.race([
                    earnedWait,
                    closedWait,
                    new Promise((resolve) => setTimeout(resolve, 2500)),
                ]);
            }

            console.debug(
                '[AdMob] after wait earned=',
                adSession.earned,
                'closed=',
                adSession.closed,
                'failed=',
                adSession.failed,
                'elapsed=',
                elapsedMs(adSession),
                'result=',
                result
            );

            if (adSession.earned || consumePendingRewardFlag() || isRewardedAdSuccess(result)) {
                outcome = { ok: true, reason: 'rewarded', result };
            } else if (adSession.failed || isHardFail(result)) {
                outcome = { ok: false, reason: 'failed', result: adSession.failPayload || result };
            } else if (adSession.closed && !watchedLongEnough(adSession, MIN_WATCH_MS)) {
                outcome = { ok: false, reason: 'dismissed', result };
            } else if (adSession.closed && watchedLongEnough(adSession, MIN_WATCH_MS)) {
                outcome = { ok: true, reason: 'completed_watch', result };
            } else if (!returnedQuickly && watchedLongEnough(adSession, MIN_WATCH_MS) && !isHardFail(result)) {
                // Handler returned only after a full-length session → completed
                outcome = { ok: true, reason: 'completed_watch', result };
            } else if (
                (result === true || result === 1 || result === 'true' || result === '1') &&
                watchedLongEnough(adSession)
            ) {
                outcome = { ok: true, reason: 'rewarded_long_watch', result };
            } else if (shouldCountCompletedSession(adSession, result)) {
                outcome = { ok: true, reason: 'completed_watch', result };
            } else {
                outcome = { ok: false, reason: 'dismissed', result };
            }
        }
    } catch (err) {
        const msg = String(err?.message || err || '');
        if (msg.includes('ad_timeout')) {
            if (adSession?.earned || consumePendingRewardFlag() || shouldCountCompletedSession(adSession, result)) {
                outcome = { ok: true, reason: 'rewarded', result: result ?? null };
            } else {
                outcome = { ok: false, reason: 'timeout' };
            }
        } else {
            outcome = { ok: false, reason: 'error', error: err };
        }
    }

    // Late native callback grace
    await new Promise((r) => setTimeout(r, 500));
    if (!outcome.ok && (adSession?.earned || consumePendingRewardFlag() || shouldCountCompletedSession(adSession, result))) {
        outcome = { ok: true, reason: 'rewarded_late', result: outcome.result ?? result };
    }

    const ms = elapsedMs(adSession);
    clearSessionHooks();
    adSession = null;

    outcome.elapsedMs = ms;
    console.debug('[AdMob] final', outcome);
    return outcome;
}
