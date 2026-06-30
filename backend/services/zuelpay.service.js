const axios = require('axios');
const crypto = require('crypto');

// Using official Zuelpay endpoints
const ZUELPAY_BASE_URL = process.env.ZUELPAY_BASE_URL || 'https://api.zuelpay.in';
const ZUELPAY_API_KEY = process.env.ZUELPAY_API_KEY || 'dummy_api_key';
const ZUELPAY_API_SECRET = process.env.ZUELPAY_API_SECRET || 'dummy_api_secret';
const ZUELPAY_MOBILE = process.env.ZUELPAY_MOBILE || '9680947738';

class ZuelpayService {
    /**
     * Generate security headers/signature
     */
    generateHeaders() {
        const signature = this.generateSignature();
        
        return {
            'Content-Type': 'application/json',
            'Token': ZUELPAY_API_KEY,
            'checkSum': signature
        };
    }

    /**
     * Generate HMAC SHA256 Signature for S2S
     */
    generateSignature() {
        // String to sign: Token:MOBILE
        const dataStr = `${ZUELPAY_API_KEY}:${ZUELPAY_MOBILE}`;
        return crypto
            .createHmac('sha256', ZUELPAY_API_SECRET)
            .update(dataStr)
            .digest('hex');
    }

    /**
     * Create Payment Request
     */
    async createPayment(orderData) {
        try {
            const endpoint = `${ZUELPAY_BASE_URL}/finance/virtual/upilink`;
            const payload = {
                merchant_order_id: orderData.orderId,
                amount: orderData.amount.toString(),
                name: orderData.userName || 'User',
                email: orderData.userEmail || 'user@example.com',
                mobile: orderData.userPhone || '9999999999'
            };

            if (ZUELPAY_API_KEY === 'dummy_api_key') {
                console.log('[Mock Zuelpay] Creating order:', orderData);
                return {
                    status: 'success',
                    data: {
                        payment_url: `http://localhost:5173/payment-status?orderId=${orderData.orderId}&status=mock_success`
                    }
                };
            }

            const headers = this.generateHeaders();
            const response = await this.retryRequest(() => axios.post(endpoint, payload, { headers }));
            
            // Expected Zuelpay response: { result: 0, status: "SUCCESS", payment_link: "...", merchant_order_id: "..." }
            const responseData = response.data;
            if (responseData.result !== 0) {
                throw new Error(responseData.msg || 'Zuelpay request failed');
            }
            if (responseData && responseData.payment_link) {
                // Normalize to expected shape
                responseData.payment_url = responseData.payment_link;
            }
            return responseData;
        } catch (error) {
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.error('[Zuelpay Create Error]:', detail);
            throw new Error(`Failed to initiate payment with gateway: ${detail}`);
        }
    }

    /**
     * Verify Payment (Server to Server)
     */
    async verifyPayment(orderId) {
        try {
            // Using GET request with query param as per Zuelpay documentation structure for status checking
            const endpoint = `${ZUELPAY_BASE_URL}/finance/virtual/status?merchant_order_id=${orderId}`;
            
            if (ZUELPAY_API_KEY === 'dummy_api_key') {
                console.log('[Mock Zuelpay] Verifying order:', orderId);
                return {
                    status: 'success',
                    data: {
                        transaction_id: `MOCK_TXN_${Date.now()}`,
                        amount: 9999 // High amount so amount mismatch doesn't trigger
                    }
                };
            }

            const headers = this.generateHeaders();
            const response = await this.retryRequest(() => axios.get(endpoint, { headers }));
            
            return response.data;
        } catch (error) {
            console.error('[Zuelpay Verify Error]:', error.response?.data || error.message);
            throw new Error('Failed to verify payment with gateway');
        }
    }

    /**
     * Fetch Transaction Status
     */
    async fetchTransaction(transactionId) {
        try {
            const endpoint = `${ZUELPAY_BASE_URL}/finance/virtual/status?merchant_order_id=${transactionId}`;
            const headers = this.generateHeaders();
            const response = await axios.get(endpoint, { headers });
            
            return response.data;
        } catch (error) {
            console.error('[Zuelpay Fetch Error]:', error.response?.data || error.message);
            throw new Error('Failed to fetch transaction from gateway');
        }
    }

    /**
     * Retry HTTP Request for robust networking
     */
    async retryRequest(requestFn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                // If it's a client error (4xx) don't retry, unless it's a timeout (408) or rate limit (429)
                if (error.response && error.response.status < 500 && error.response.status !== 408 && error.response.status !== 429) {
                    throw error; 
                }
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, delay * (i + 1)));
            }
        }
    }
}

module.exports = new ZuelpayService();
