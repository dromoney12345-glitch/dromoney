import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

// Dynamically loads the Razorpay checkout script
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess, extraData = {} }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | processing | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const { userData, refreshUserProfile } = useUser();

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMsg('');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Determine if this purchase is blocked because platform is already unlocked
    const isPlatformAlreadyUnlocked = type === 'PLATFORM_UNLOCK' && userData?.isPaid;

    const handlePay = async () => {
        setStatus('loading');
        setErrorMsg('');

        try {
            // 1. Load Razorpay SDK
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error('Razorpay SDK could not be loaded. Check your internet connection.');

            // 2. Create server-side order
            const orderRes = await api.post('/user/data/razorpay/create-order', {
                type,
                ideaId: itemId,
                amount,
                ...extraData
            });
            if (!orderRes.success) throw new Error('Failed to create payment order.');

            const { orderId, keyId } = orderRes;

            // 3. Open Razorpay checkout
            setStatus('processing');

            const options = {
                key: keyId,
                amount: Math.round(amount * 100), // in paise
                currency: 'INR',
                name: 'Dromoney',
                description: plan,
                order_id: orderId,
                prefill: {
                    name: userData?.name || '',
                    email: userData?.email || '',
                    contact: userData?.phone || '',
                },
                theme: { color: '#0ea5e9' },
                handler: async (response) => {
                    // 4. Verify payment on server
                    try {
                        const verifyRes = await api.post('/user/data/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.success) {
                            await refreshUserProfile();
                            setStatus('success');
                            setTimeout(() => {
                                onSuccess();
                            }, 1500);
                        } else {
                            throw new Error('Server verification failed.');
                        }
                    } catch (err) {
                        setStatus('error');
                        setErrorMsg('Payment was received but verification failed. Contact support.');
                    }
                },
                modal: {
                    ondismiss: () => {
                        // User closed modal without paying
                        setStatus('idle');
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                setStatus('error');
                setErrorMsg(response.error?.description || 'Payment failed. Please try again.');
            });
            rzp.open();

        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 font-poppins">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-100"
                onClick={status === 'idle' ? onClose : undefined}
            />

            {/* Modal Box */}
            <div className="relative bg-white w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200 animate-in zoom-in-95 duration-200">

                {/* ── IDLE: Show Pay Button ── */}
                {(status === 'idle' || status === 'error') && (
                    <>
                        <div className="px-5 pt-4 pb-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-medium text-slate-800 text-lg uppercase tracking-tight">Checkout</h3>
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium max-w-[150px] truncate">{plan}</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-100 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 text-center border-b border-slate-100 border-dashed bg-gradient-to-b from-slate-50 to-white">
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Total Amount</p>
                            <h2 className="text-4xl font-medium text-slate-800 flex items-center justify-center">
                                <span className="text-xl text-slate-400 font-medium mr-1 translate-y-0.5">₹</span>{parseFloat(amount).toFixed(2)}
                            </h2>
                            <p className="text-[9px] text-emerald-600 font-medium uppercase tracking-widest mt-2 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                                {type.includes('BOOSTER') ? 'Premium Booster' : 'Lifetime Access'}
                            </p>
                        </div>

                        {/* Platform already unlocked warning */}
                        {isPlatformAlreadyUnlocked && (
                            <div className="mx-5 mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2">
                                <AlertCircle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] font-medium text-rose-600">Platform already unlocked.</p>
                            </div>
                        )}

                        {/* Payment error */}
                        {status === 'error' && !isPlatformAlreadyUnlocked && (
                            <div className="mx-5 mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] font-medium text-red-600">{errorMsg}</p>
                            </div>
                        )}

                        <div className="p-5">
                            <button
                                onClick={isPlatformAlreadyUnlocked ? undefined : handlePay}
                                disabled={isPlatformAlreadyUnlocked}
                                className={`w-full ${isPlatformAlreadyUnlocked ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white shadow-lg shadow-sky-200'} font-medium py-4 rounded-xl text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                            >
                                <ShieldCheck size={16} />
                                {isPlatformAlreadyUnlocked ? 'Already Unlocked' : `Pay ₹${parseFloat(amount).toFixed(2)} via Razorpay`}
                            </button>
                            <p className="text-center text-[9px] text-slate-400 font-medium mt-3 uppercase tracking-widest">UPI · Card · Netbanking · Wallets</p>
                        </div>

                        <div className="bg-emerald-50 py-2.5 flex items-center justify-center gap-1.5 border-t border-emerald-100">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-medium uppercase tracking-widest text-emerald-600">Secured by Razorpay</span>
                        </div>
                    </>
                )}

                {/* ── LOADING: Creating Order ── */}
                {status === 'loading' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
                        <Loader2 size={36} className="text-sky-500 animate-spin" />
                        <div>
                            <p className="font-medium text-slate-800 text-[15px]">Preparing Checkout...</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Please wait</p>
                        </div>
                    </div>
                )}

                {/* ── PROCESSING: Razorpay is open (waiting for user to pay) ── */}
                {status === 'processing' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-100 rounded-full" />
                            <div className="w-16 h-16 border-4 border-sky-500 rounded-full border-t-transparent animate-spin absolute inset-0" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-800 text-[15px]">Processing...</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Complete payment in popup</p>
                        </div>
                    </div>
                )}

                {/* ── SUCCESS ── */}
                {status === 'success' && (
                    <div className="p-10 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                            <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="font-medium text-emerald-600 text-[17px]">Payment Successful!</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Unlocked successfully 🎉</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
