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
            
            // Extract native UPI intent links (bhim_link usually maps to upi://pay)
            const upiIntent = responseData.data?.upi_intent?.bhim_link || responseData.upi_intent?.bhim_link;

            if (!paymentUrl) {
                throw new Error('Payment URL not found in gateway response');
            }

            return {
                status: 'success',
                data: {
                    paymentLinkString: paymentUrl,
                    deepLinkString: upiIntent || paymentUrl,
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
     * UPIGateway uses server-to-server validation via check_order_status
     */
    verifyWebhookSignature(payload) {
        return true; 
    }

    /**
     * Strictly Validate Order Status with Gateway
     * This prevents anyone from spoofing webhooks!
     */
    async checkOrderStatus(clientTxnId, txnDate = null) {
        if (UPIGATEWAY_API_KEY === 'dummy_api_key') return { status: 'success' };
        
        try {
            const payload = {
                key: UPIGATEWAY_API_KEY,
                client_txn_id: clientTxnId
            };
            
            if (txnDate) payload.txn_date = txnDate; // Required by some versions

            const response = await axios.post(`${UPIGATEWAY_BASE_URL}/check_order_status`, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            return response.data;
        } catch (error) {
            console.error('[UPIGateway Status Check Error]:', error.message);
            return { status: false, msg: error.message };
        }
    }
}

module.exports = new UpigatewayService();
