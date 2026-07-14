const axios = require('axios');
require('dotenv').config();

class BulkpeService {
    constructor() {
        // Defaults to the production URL, can be overridden in .env
        this.baseURL = process.env.BULKPE_API_URL || 'https://api.bulkpe.in/client';
        this.apiKey = process.env.BULKPE_API_KEY;

        if (!this.apiKey) {
            console.warn('[BulkpeService] Warning: BULKPE_API_KEY is not defined in environment variables.');
        }

        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Create a dynamic UPI payment (PG Collection)
     * @param {Object} paymentData 
     * @param {string} paymentData.orderId - Unique local order ID
     * @param {number} paymentData.amount - Amount in INR
     * @param {string} paymentData.customerName - Name of the user
     * @param {string} paymentData.customerEmail - Email of the user
     * @param {string} paymentData.customerPhone - Phone of the user
     * @returns {Promise<Object>} Gateway response containing QR/Link
     */
    async createDynamicQR({ orderId, amount, customerName, customerEmail, customerPhone }) {
        try {
            const payload = {
                amount: amount,
                reference_id: orderId,
                customer_name: customerName || 'User',
                customer_email: customerEmail || 'user@example.com',
                customer_phone: customerPhone || '9999999999',
                description: `Payment for Order ${orderId}`
            };

            // Assuming standard Bulkpe PG endpoint. Will adjust if needed based on API response.
            const response = await this.api.post('/createDynamicVpa', payload);
            
            return response.data;
        } catch (error) {
            console.error('[BulkpeService] createDynamicQR Error:', error.response?.data || error.message);
            throw new Error('Failed to initiate Bulkpe payment');
        }
    }

    /**
     * Verify payment status directly with Bulkpe API
     * @param {string} orderId 
     * @returns {Promise<Object>} Verification details
     */
    async checkOrderStatus(orderId) {
        try {
            const response = await this.api.get(`/pg/status/${orderId}`);
            return response.data;
        } catch (error) {
            console.error('[BulkpeService] checkOrderStatus Error:', error.response?.data || error.message);
            throw new Error('Failed to verify Bulkpe payment status');
        }
    }
}

module.exports = new BulkpeService();
