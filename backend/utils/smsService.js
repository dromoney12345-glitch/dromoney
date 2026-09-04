const axios = require('axios');

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
}

function isSuccessErrorCode(code) {
    const c = String(code ?? '').trim();
    return c === '000' || c === '0' || c.toLowerCase() === 'ok';
}

/**
 * Send OTP via SMSINDIAHUB with DLT PEId + TemplateId.
 *
 * Panel Delivered row uses:
 *   PEID 1001164203633432409
 *   TEID 1007282516644508833
 * Template (2 vars): Welcome to the {#var#} powered by Appzeto.Your OTP for registration is {#var#}.BGADEC
 *
 * Rejected + PEID "(Collection)" + Error 609 = PE/Template IDs not attached on API send.
 */
const sendOtpSMS = async (phone, otp) => {
    const apiKey = process.env.SMSINDIAHUB_API_KEY;
    const senderId = process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC';
    const peId = process.env.SMSINDIAHUB_PEID || '1001164203633432409';
    const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID || '1007282516644508833';
    // Keep brand short if DLT var max-length is tight; override via env.
    const brand = process.env.SMSINDIAHUB_BRAND_NAME || 'Dromoney';
    const route = process.env.SMSINDIAHUB_ROUTE || '1';

    if (!apiKey) {
        throw new Error('SMSINDIAHUB_API_KEY is not configured');
    }

    const phone10 = normalizePhone(phone);
    if (!/^[6-9]\d{9}$/.test(phone10) && phone10 !== '9999999999') {
        throw new Error('Invalid phone number for SMS');
    }

    const message = `Welcome to the ${brand} powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;
    const formattedPhone = `91${phone10}`;

    // Exact param names from SMS India Hub HTTP API samples (APIKey + PEId + TemplateId + route).
    const qs = new URLSearchParams({
        APIKey: apiKey,
        senderid: senderId,
        channel: 'Trans',
        DCS: '0',
        flashsms: '0',
        number: formattedPhone,
        text: message,
        route,
        PEId: peId,
        TemplateId: templateId,
    }).toString();

    const bases = [
        'https://cloud.smsindiahub.in/api/mt/SendSMS',
        'http://cloud.smsindiahub.in/api/mt/SendSMS',
    ];

    let lastError;
    for (const base of bases) {
        try {
            const response = await axios.get(`${base}?${qs}`, {
                timeout: 20000,
                validateStatus: () => true,
            });
            const data = response.data;
            const errorCode = data?.ErrorCode ?? data?.errorCode;
            const errorMessage = data?.ErrorMessage || data?.errorMessage || data?.Message || '';

            if (response.status >= 400) {
                lastError = new Error(`SMS HTTP ${response.status}: ${errorMessage || 'request failed'}`);
                continue;
            }

            if (!isSuccessErrorCode(errorCode)) {
                lastError = new Error(`SMS provider rejected: ${errorCode || 'unknown'} ${errorMessage}`.trim());
                console.error(`[SMS Error] ${formattedPhone}: code=${errorCode} msg=${errorMessage}`);
                continue;
            }

            const jobId = data?.JobId || data?.jobId || 'n/a';
            const messageId = data?.MessageData?.[0]?.MessageId || 'n/a';
            const echoed = data?.MessageData?.[0]?.Message || message;
            console.log(
                `[SMS] SUCCESS ErrorCode=${errorCode} PEId=${peId} TemplateId=${templateId} route=${route} ` +
                    `to=${formattedPhone} JobId=${jobId} MessageId=${messageId}`
            );
            console.log(`[SMS] text: ${echoed}`);
            return data;
        } catch (error) {
            lastError = error;
            console.error(`[SMS Error] ${base} failed:`, error.message);
        }
    }

    throw lastError || new Error('SMS send failed');
};

module.exports = { sendOtpSMS, normalizePhone };
