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
 * Send OTP via SMSINDIAHUB (DLT template).
 * Throws if credentials missing or provider returns a non-success ErrorCode.
 */
const sendOtpSMS = async (phone, otp) => {
    const apiKey = process.env.SMSINDIAHUB_API_KEY;
    const senderId = process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC';
    const peid = process.env.SMSINDIAHUB_PEID || '1001164203633432409';
    const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID || '1007282516644508833';

    if (!apiKey) {
        throw new Error('SMSINDIAHUB_API_KEY is not configured');
    }

    const phone10 = normalizePhone(phone);
    if (!/^[6-9]\d{9}$/.test(phone10) && phone10 !== '9999999999') {
        throw new Error('Invalid phone number for SMS');
    }

    // Exact DLT-approved template text (do not change spacing/words without re-registering template)
    const message = `Welcome to the Dromoney powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;
    const formattedPhone = `91${phone10}`;

    const params = new URLSearchParams({
        APIKey: apiKey,
        senderid: senderId,
        channel: 'Trans',
        DCS: '0',
        flashsms: '0',
        number: formattedPhone,
        text: message,
        peid,
        templateid: templateId,
    });

    const bases = [
        'https://cloud.smsindiahub.in/api/mt/SendSMS',
        'http://cloud.smsindiahub.in/api/mt/SendSMS',
    ];

    let lastError;
    for (const base of bases) {
        try {
            const response = await axios.get(`${base}?${params.toString()}`, {
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
                console.error(`[SMS Error] ${formattedPhone}:`, data);
                continue;
            }

            console.log(`[SMS] OTP accepted for ${formattedPhone}. JobId:`, data?.JobId || data?.jobId || 'n/a');
            return data;
        } catch (error) {
            lastError = error;
            console.error(`[SMS Error] ${base} failed:`, error.message);
        }
    }

    throw lastError || new Error('SMS send failed');
};

module.exports = { sendOtpSMS, normalizePhone };
