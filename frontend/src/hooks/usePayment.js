import { useState } from 'react';
import api from '../module/shared/services/api'; // Assuming standard api axios instance setup

export const usePayment = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);

    /**
     * Initiate a payment
     * @param {number} amount - Amount to charge
     * @param {string} orderType - 'WALLET_RECHARGE', 'SUBSCRIPTION', 'BOOSTER'
     * @param {string} remarks - Optional notes
     */
    const createPayment = async (amount, orderType, remarks = '') => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.post('/payment/create', { amount, orderType, remarks });
            
            // api interceptor already returns response.data directly
            if (response.success) {
                const { paymentUrl, upiIntent, qrCode, orderId } = response.data;
                console.log('[Frontend Payment Response]:', response.data);
                
                // Store orderId in local storage so we can verify it upon return if needed
                localStorage.setItem('pending_payment_order_id', orderId);

                // Handle Gateway Redirects
                if (paymentUrl) {
                    console.log('Redirecting to paymentUrl:', paymentUrl);
                    window.location.href = paymentUrl;
                } else if (upiIntent) {
                    console.log('Redirecting to upiIntent:', upiIntent);
                    window.location.href = upiIntent;
                } else if (qrCode) {
                    console.log('Returning qrCode:', qrCode);
                    // Consumer component can render this QR code
                    return { success: true, qrCode, orderId };
                } else {
                    console.error("No valid URL found in response data:", response.data);
                    alert("Invalid response from payment gateway");
                }
                
                return { success: true, orderId };
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(errorMsg);
            alert(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Verify a payment via S2S
     * @param {string} orderId - The order ID to verify
     */
    const verifyPayment = async (orderId) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.post('/payment/verify', { orderId });
            
            if (response.data.success) {
                setStatus('SUCCESS');
                alert('Payment verified successfully!');
                return { success: true, data: response.data.data };
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(errorMsg);
            setStatus('FAILED');
            alert(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        status,
        createPayment,
        verifyPayment
    };
};
