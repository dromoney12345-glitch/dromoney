/**
 * A/B: send same OTP template with brand "1234" (known Delivered) vs "Dromoney" (often Rejected).
 * Usage: node scripts/sms_ab_brand_test.js [phone]
 */
require('dotenv').config({ override: true });

process.env.SMSINDIAHUB_BRAND_NAME = process.env.SMSINDIAHUB_BRAND_NAME || '1234';

const { sendOtpSMS } = require('../utils/smsService');

const phone = process.argv[2] || '8839044030';
const otp = String(Math.floor(100000 + Math.random() * 900000));

(async () => {
    console.log('Sending with brand =', process.env.SMSINDIAHUB_BRAND_NAME, 'otp =', otp, 'phone =', phone);
    const data = await sendOtpSMS(phone, otp);
    console.log(JSON.stringify(data, null, 2));
    console.log('\nNow open SMS India Hub → Delivery Report.');
    console.log('Check PEID is numeric (not Collection) and Status is Delivered.');
})().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
