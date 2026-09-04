const fs = require('fs');
const p = 'd:/desktop/dromoney/backend/controllers/razorpayController.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf("} else if (pType === 'BUSINESS_IDEA_UNLOCK') {");
const end = s.indexOf('// One pending / one success unlock only', start);
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const neu = `} else if (pType === 'BUSINESS_IDEA_UNLOCK' || pType === 'SUPPORT_CHAT_RENEWAL' || pType === 'BUSINESS_HUB_PLAN') {
        const quote = await resolvePaymentQuote({
            type: pType,
            ideaId,
            planName: reqPlanName || planName,
            user,
        });
        if (quote.error) return next(new ErrorResponse(quote.error, quote.status || 400));
        pType = quote.paymentType || pType;
        finalAmount = Number(quote.payableAmount || quote.amount || 0);
        planName = quote.planName || planName;
        durationDays = quote.durationDays || durationDays;
    } else if (!reqPlanName) {
        if (pType === 'SUPPORT_BOOSTER') {
            planName = 'Support Booster';
        } else if (pType === 'TASK_BOOSTER') {
            planName = 'Task Booster';
        }
    }

    `;
s = s.slice(0, start) + neu + s.slice(end);
fs.writeFileSync(p, s);
console.log('patched ok');
