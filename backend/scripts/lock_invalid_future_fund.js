/**
 * Lock Future Fund for any user marked active who has NOT completed all criteria.
 * Usage: node scripts/lock_invalid_future_fund.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { syncFutureFundCriteria } = require('../utils/futureFund');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const settings = (await Settings.findOne()) || {};
    const activeUsers = await User.find({ 'futureFund.status': 'active' });
    let locked = 0;
    let kept = 0;

    for (const user of activeUsers) {
        const synced = await syncFutureFundCriteria(user, settings);
        if (!synced.eligible) {
            user.futureFund.status = 'locked';
            await user.save({ validateBeforeSave: false });
            locked += 1;
            console.log(`LOCKED ${user.phone || user._id} (progress ${synced.progress}%, not eligible)`);
        } else {
            if (synced.modified) await user.save({ validateBeforeSave: false });
            kept += 1;
            console.log(`KEPT   ${user.phone || user._id} (all criteria met)`);
        }
    }

    console.log(`\nDone. Locked ${locked}, kept active ${kept}, scanned ${activeUsers.length}.`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
