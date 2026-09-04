/**
 * Reset fake Future Fund progress on test user 9999999999 to REAL counts only.
 * Usage: node scripts/reset_test_ff_progress.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const RewardHistory = require('../models/RewardHistory');
const { syncFutureFundCriteria } = require('../utils/futureFund');

const TEST_PHONE = '9999999999';

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ phone: TEST_PHONE });
    if (!user) {
        console.error('Test user not found');
        process.exit(1);
    }

    const fromHistory = await RewardHistory.countDocuments({ userId: user._id });
    const fromCatalog = (user.watchedAds || []).length;
    const realAds = Math.max(fromHistory, fromCatalog);
    const realTasks =
        (Array.isArray(user.completedTasks) ? user.completedTasks.length : 0) +
        (Array.isArray(user.dailyTaskCompletions) ? user.dailyTaskCompletions.length : 0);

    console.log('Before:', {
        lifetimeAdsWatched: user.lifetimeAdsWatched,
        lifetimeTasksCompleted: user.lifetimeTasksCompleted,
        ffStatus: user.futureFund?.status,
    });

    user.lifetimeAdsWatched = realAds;
    user.lifetimeTasksCompleted = realTasks;
    user.futureFund = user.futureFund || {};
    user.futureFund.status = 'locked';
    user.futureFund.criteriaNotified = false;

    const settings = (await Settings.findOne()) || {};
    const synced = await syncFutureFundCriteria(user, settings);
    await user.save({ validateBeforeSave: false });

    console.log('After (real only):', {
        lifetimeAdsWatched: user.lifetimeAdsWatched,
        lifetimeTasksCompleted: user.lifetimeTasksCompleted,
        ffStatus: user.futureFund.status,
        progress: synced.progress,
        eligible: synced.eligible,
    });
    synced.criteria.forEach((c) => {
        console.log(`  ${c.title}: ${c.current}/${c.target} ${c.completed ? '✓' : '✗'}`);
    });

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
