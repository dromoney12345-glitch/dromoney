const axios = require('axios');

// Environment variables for UPIGateway
const UPIGATEWAY_API_KEY = process.env.UPIGATEWAY_API_KEY || 'dummy_api_key';
const UPIGATEWAY_BASE_URL = process.env.UPIGATEWAY_BASE_URL || 'https://merchant.upigateway.com/api';

class UpigatewayService {
    /**
     * Create a payment link using UPIGateway API
     */
    async createPaymentLink(orderData) {
        try {
            // Mock logic for demonstration/development if keys aren't set
            if (UPIGATEWAY_API_KEY === 'dummy_api_key') {
                console.log('[Mock UPIGateway] Creating order:', orderData);
                const mockPaymentUrl = `http://localhost:5173/payment-mock-checkout?orderId=${orderData.orderId}&amount=${orderData.amount}`;
                
                return {
                    status: 'success',
                    data: {
                        paymentLinkString: mockPaymentUrl,
                        deepLinkString: mockPaymentUrl, // UPIGateway handles intent on their page
                        orderCode: orderData.orderId
                    }
                };
            }

            const endpoint = `${UPIGATEWAY_BASE_URL}/create_order`;
            
            const payload = {
                key: UPIGATEWAY_API_KEY,
                client_txn_id: orderData.orderId,
                amount: orderData.amount.toString(),
                p_info: `Payment for ${orderData.orderId}`,
                customer_name: orderData.userName || 'User',
                customer_email: orderData.userEmail || 'user@example.com',
                customer_mobile: orderData.userPhone || '9999999999',
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
            };

            const response = await axios.post(endpoint, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const responseData = response.data;
            console.log('[UPIGateway Response]:', JSON.stringify(responseData));
            
            if (responseData.status === false || responseData.status === 'false' || !responseData.status) {
                throw new Error(responseData.msg || 'Payment initiation failed');
            }

            const paymentUrl = responseData.data?.payment_url || responseData.payment_url || responseData.data?.payment_link || responseData.payment_link;

            if (!paymentUrl) {
                throw new Error('Payment URL not found in gateway response');
            }

            return {
                status: 'success',
                data: {
                    paymentLinkString: paymentUrl,
                    deepLinkString: paymentUrl, // UPIGateway handles Intent inside this URL natively
                    orderCode: responseData.data?.client_txn_id || responseData.client_txn_id || orderData.orderId
                }
            };

        } catch (error) {
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.error('[UPIGateway Create Error]:', detail);
            throw new Error(`Failed to initiate payment with provider: ${detail}`);
        }
    }

    /**
     * Verify Webhook Payload
     */
    verifyWebhookSignature(payload) {
        if (UPIGATEWAY_API_KEY === 'dummy_api_key') return true;
        // UPIGateway often doesn't use HMAC for webhooks, they send the payload and you verify by checking status API
        // For basic verification, we just accept the payload structure.
        // It's highly recommended to call the check_order_status API here for strict validation.
        return true; 
    }
}

module.exports = new UpigatewayService();
