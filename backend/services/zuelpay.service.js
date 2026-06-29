const axios = require('axios');
const crypto = require('crypto');

// Replace with official Zuelpay endpoints once available
const ZUELPAY_BASE_URL = process.env.ZUELPAY_BASE_URL || 'https://api.zuelpay.com/v1';
const ZUELPAY_API_KEY = process.env.ZUELPAY_API_KEY || 'dummy_api_key';
const ZUELPAY_API_SECRET = process.env.ZUELPAY_API_SECRET || 'dummy_api_secret';

class ZuelpayService {
    /**
     * Generate security headers/signature
     */
    generateHeaders(payload = {}) {
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(payload, timestamp);
        
        return {
            'Content-Type': 'application/json',
            'X-Api-Key': ZUELPAY_API_KEY,
            'X-Timestamp': timestamp,
            'X-Signature': signature
        };
    }

    /**
     * Generate HMAC SHA256 Signature for S2S
     */
    generateSignature(payload, timestamp) {
        // Typically, gateway signatures combine payload string and timestamp
        const dataStr = JSON.stringify(payload) + timestamp;
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
            const endpoint = `${ZUELPAY_BASE_URL}/order/create`; // Replace with official Zuelpay endpoint
            const payload = {
                order_id: orderData.orderId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                customer_name: orderData.userName,
                customer_email: orderData.userEmail,
                customer_phone: orderData.userPhone,
                return_url: `${process.env.FRONTEND_URL}/payment-status?orderId=${orderData.orderId}`
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

            const headers = this.generateHeaders(payload);
            const response = await this.retryRequest(() => axios.post(endpoint, payload, { headers }));
            
            // Expected Zuelpay response shape: { status: 'success', data: { payment_url: '...' } }
            return response.data;
        } catch (error) {
            console.error('[Zuelpay Create Error]:', error.response?.data || error.message);
            throw new Error('Failed to initiate payment with gateway');
        }
    }

    /**
     * Verify Payment (Server to Server)
     */
    async verifyPayment(orderId) {
        try {
            const endpoint = `${ZUELPAY_BASE_URL}/order/verify`; // Replace with official Zuelpay endpoint
            const payload = { order_id: orderId };
            
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

            const headers = this.generateHeaders(payload);
            const response = await this.retryRequest(() => axios.post(endpoint, payload, { headers }));
            
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
            const endpoint = `${ZUELPAY_BASE_URL}/transaction/${transactionId}`; // Replace with official Zuelpay endpoint
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
