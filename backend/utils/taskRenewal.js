/**
 * Calculates the most recent task renewal tick in IST.
 * Admin times (taskWindowStart, taskRenewalHours) are treated as India Standard Time.
 *
 * Example: start 07:00, renew 24h → ticks every day at 07:00 IST.
 */
function getLastRenewalTick(settings) {
    const windowStart = settings?.taskWindowStart || '07:00';
    const renewalHours = Number(settings?.taskRenewalHours) || 24;

    const [startHourStr, startMinStr] = String(windowStart).split(':');
    const startHour = parseInt(startHourStr, 10) || 0;
    const startMin = parseInt(startMinStr, 10) || 0;

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const istNow = new Date(nowMs + IST_OFFSET_MS);

    // "Today at windowStart" expressed as a real UTC timestamp
    let baseTickMs = Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        startHour,
        startMin,
        0,
        0
    ) - IST_OFFSET_MS;

    // Before today's start → use yesterday's start as the base
    if (nowMs < baseTickMs) {
        baseTickMs -= 24 * 60 * 60 * 1000;
    }

    const renewalIntervalMs = Math.max(renewalHours, 1) * 60 * 60 * 1000;
    const intervalsPassed = Math.floor((nowMs - baseTickMs) / renewalIntervalMs);

    return new Date(baseTickMs + intervalsPassed * renewalIntervalMs);
}

/**
 * Current minutes since midnight in IST (0–1439).
 */
function getIstMinutesNow() {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    return istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
}

/** Inclusive daily window in IST. Supports overnight (e.g. 22:00–06:00). */
function isWithinIstWindow(startStr, endStr) {
    if (!startStr || !endStr) return true;
    const currentMins = getIstMinutesNow();
    const [sh, sm] = String(startStr).split(':').map(Number);
    const startMins = (sh || 0) * 60 + (sm || 0);
    const [eh, em] = String(endStr).split(':').map(Number);
    const endMins = (eh || 0) * 60 + (em || 0);
    if (startMins === endMins) return true;
    if (startMins < endMins) {
        return currentMins >= startMins && currentMins <= endMins;
    }
    return currentMins >= startMins || currentMins <= endMins;
}

module.exports = {
    getLastRenewalTick,
    getIstMinutesNow,
    isWithinIstWindow,
};
