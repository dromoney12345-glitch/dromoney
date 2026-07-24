const axios = require('axios');

/**
 * Send OTP via SMSINDIAHUB
 * @param {string} phone - 10 digit phone number
 * @param {string} otp - 6 digit OTP
 * @returns {Promise} - Axios response
 */
const sendOtpSMS = async (phone, otp) => {
    const apiKey = process.env.SMSINDIAHUB_API_KEY;
    const senderId = process.env.SMSINDIAHUB_SENDER_ID;
    const message = `Welcome to the Dromoney powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;

    // Ensure phone has 91 prefix for India as requested
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

    // Using cloud gateway to avoid ENOTFOUND error on legacy 'sms' subdomain
    const url = `http://cloud.smsindiahub.in/api/mt/SendSMS?APIKey=${apiKey}&senderid=${senderId}&channel=Trans&DCS=0&flashsms=0&number=${formattedPhone}&text=${encodeURIComponent(message)}&peid=1001164203633432409&templateid=1007282516644508833`;

    try {
        const response = await axios.get(url);
        console.log(`[SMS] OTP sent to ${formattedPhone}. Provider response:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`[SMS Error] Failed to send OTP to ${formattedPhone}:`, error.message);
        throw error;
    }
};

module.exports = { sendOtpSMS };
