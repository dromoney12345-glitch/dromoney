/**
 * Task renewal helpers (IST-aligned, mirrors backend/utils/taskRenewal.js)
 */

export function getLastRenewalTick(settings) {
    const windowStart = settings?.taskWindowStart || '07:00';
    const renewalHours = Number(settings?.taskRenewalHours) || 24;

    const [startHourStr, startMinStr] = String(windowStart).split(':');
    const startHour = parseInt(startHourStr, 10) || 0;
    const startMin = parseInt(startMinStr, 10) || 0;

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const istNow = new Date(nowMs + IST_OFFSET_MS);

    let baseTickMs = Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        startHour,
        startMin,
        0,
        0
    ) - IST_OFFSET_MS;

    if (nowMs < baseTickMs) {
        baseTickMs -= 24 * 60 * 60 * 1000;
    }

    const renewalIntervalMs = Math.max(renewalHours, 1) * 60 * 60 * 1000;
    const intervalsPassed = Math.floor((nowMs - baseTickMs) / renewalIntervalMs);

    return new Date(baseTickMs + intervalsPassed * renewalIntervalMs);
}

export function getIstMinutesNow() {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    return istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
}

export function isWithinTaskWindow(startStr, endStr) {
    if (!startStr || !endStr) return true;
    const currentMins = getIstMinutesNow();
    const [sh, sm] = startStr.split(':').map(Number);
    const startMins = (sh || 0) * 60 + (sm || 0);
    const [eh, em] = endStr.split(':').map(Number);
    const endMins = (eh || 0) * 60 + (em || 0);
    if (startMins < endMins) {
        return currentMins >= startMins && currentMins <= endMins;
    }
    return currentMins >= startMins || currentMins <= endMins;
}
