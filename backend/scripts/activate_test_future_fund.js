/**
 * Activate Future Fund for demo test user 9999999999 — ONLY if all criteria are met.
 * Does NOT force-activate without real KYC / ads / tasks progress.
 * Usage: node scripts/activate_test_future_fund.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { syncFutureFundCriteria } = require('../utils/futureFund');

const TEST_PHONE = '9999999999';

async function main() {
    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ phone: TEST_PHONE });
    if (!user) {
        console.log(`Creating test user ${TEST_PHONE}...`);
        user = await User.create({
            name: 'Test Account',
            email: 'testaccount@gmail.com',
            phone: TEST_PHONE,
            isPaid: true,
            kyc: { status: 'Approved' },
        });
    }

    const settings = (await Settings.findOne()) || {};
    const synced = await syncFutureFundCriteria(user, settings);

    if (!synced.eligible) {
        user.futureFund.status = 'locked';
        await user.save({ validateBeforeSave: false });
        console.log(`NOT activated — criteria incomplete for ${user.phone}`);
        synced.criteria.forEach((c) => {
            console.log(`  ${c.title}: ${c.current}/${c.target} ${c.completed ? '✓' : '✗'}`);
        });
        await mongoose.disconnect();
        process.exit(1);
    }

    user.futureFund.status = 'active';
    user.futureFund.progress = 100;
    user.futureFund.criteriaNotified = true;
    await user.save({ validateBeforeSave: false });

    console.log(`Future Fund ACTIVE for ${user.phone} (${user.name}) — criteria verified`);
    console.log('  status:', user.futureFund.status);
    console.log('  progress:', user.futureFund.progress);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
