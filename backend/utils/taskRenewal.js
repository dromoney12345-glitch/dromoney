

/**
 * Calculates the most recent task renewal tick based on settings.
 * 
 * If start time is 07:00 and interval is 12 hours:
 * - Ticks are at 07:00 and 19:00 daily.
 * - If current time is 20:00, the last tick was today at 19:00.
 * - If current time is 05:00, the last tick was yesterday at 19:00.
 * 
 * @param {Object} settings - Database Settings object containing taskWindowStart and taskRenewalHours
 * @returns {Date} - The Date object of the most recent renewal tick
 */
function getLastRenewalTick(settings) {
    const windowStart = settings?.taskWindowStart || '07:00';
    const renewalHours = settings?.taskRenewalHours || 24;

    const [startHourStr, startMinStr] = windowStart.split(':');
    const startHour = parseInt(startHourStr, 10);
    const startMin = parseInt(startMinStr, 10);
    
    let now = new Date();
    
    // Create a base tick for "Today at Start Time"
    let baseTick = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0, 0);

    // If baseTick is in the future, it means we are before today's start time (e.g. now=05:00, baseTick=07:00)
    if (now < baseTick) {
        // Shift baseTick to yesterday
        baseTick.setDate(baseTick.getDate() - 1);
    }

    // Now baseTick is guaranteed to be <= now.
    // Calculate how many `renewalHours` intervals have passed since `baseTick`.
    const diffMs = now.getTime() - baseTick.getTime();
    const renewalIntervalMs = renewalHours * 60 * 60 * 1000;
    
    const intervalsPassed = Math.floor(diffMs / renewalIntervalMs);
    
    // Calculate the most recent tick by adding the passed intervals to the base tick
    const lastTickTime = baseTick.getTime() + (intervalsPassed * renewalIntervalMs);
    
    return new Date(lastTickTime);
}

module.exports = {
    getLastRenewalTick
};
