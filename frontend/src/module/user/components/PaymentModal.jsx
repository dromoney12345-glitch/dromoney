import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Lock, UploadCloud, FileImage, CreditCard } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';
import { usePayment } from '../../../hooks/usePayment';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess, extraData = {} }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const { userData } = useUser();

    const [dynamicIntent, setDynamicIntent] = useState(null);
    const [dynamicOrderId, setDynamicOrderId] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showQR, setShowQR] = useState(false);
    
    const [isManualMode, setIsManualMode] = useState(false);
    const [qrScannerImage, setQrScannerImage] = useState(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminUpiId, setAdminUpiId] = useState(null);
    const [hasPendingManual, setHasPendingManual] = useState(false);
    
    const { createPayment, loading: automatedLoading } = usePayment();

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setQrScannerImage(res.data.qrScannerImage);
                    setAdminUpiId(res.data.adminUpiId);
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMsg('');
            setDynamicIntent(null);
            setDynamicOrderId(null);
            setIsManualMode(false);
            setUtrNumber('');
            setScreenshot(null);
            document.body.style.overflow = 'hidden';
            
            checkPendingManualPayment();
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    // Poll for payment status once order is created
    useEffect(() => {
        let interval;
        if (isOpen && dynamicOrderId && status !== 'success' && status !== 'error') {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/payment/status/${dynamicOrderId}`);
                    if (res.success && res.data) {
                        if (res.data.status === 'Success') {
                            setStatus('success');
                            clearInterval(interval);
                            setTimeout(() => onSuccess(), 2500);
                        } else if (res.data.status === 'Failed' || res.data.status === 'CANCELLED') {
                            setStatus('error');
                            setErrorMsg('Payment failed or cancelled.');
                            clearInterval(interval);
                        }
                    }
                } catch (err) {
                    console.error('Error polling status', err);
                }
            }, 3000); // Check every 3 seconds
        }
        return () => clearInterval(interval);
    }, [isOpen, dynamicOrderId, status]);

    const checkPendingManualPayment = async () => {
        try {
            setStatus('loading');
            const res = await api.get(`/user/data/manual-payment/check?type=${type}`);
            if (res.success && res.hasPending) {
                setHasPendingManual(true);
                setIsManualMode(true);
                setStatus('success');
            } else {
                initiatePayment();
            }
        } catch (err) {
            console.error('Error checking pending manual payment', err);
            initiatePayment();
        }
    };

    const initiatePayment = async () => {
        const orderType = ['PLATFORM_UNLOCK', 'BUSINESS_HUB_PLAN', 'SUPPORT_CHAT_RENEWAL'].includes(type) 
            ? 'SUBSCRIPTION' 
            : 'BOOSTER';
        
        setStatus('loading');
        const res = await createPayment(amount, orderType, `Plan: ${plan}, Type: ${type}`);
        
        if (res && res.success) {
            setDynamicIntent(res.upiIntent || res.paymentUrl);
            setDynamicOrderId(res.orderId);
            setStatus('idle');
        } else {
            setStatus('error');
            setErrorMsg(res?.error || 'Failed to initialize payment.');
        }
    };

    const handleManualSubmit = async () => {
        if (!utrNumber || utrNumber.length !== 12) {
            setErrorMsg('Please enter a valid 12-digit UTR number');
            return;
        }
        if (!screenshot) {
            setErrorMsg('Please upload a payment screenshot');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');
        
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('type', type);
            formData.append('planName', plan);
            formData.append('utrNumber', utrNumber);
            formData.append('screenshot', screenshot);
            if (itemId) formData.append('ideaId', itemId);

            const res = await api.post('/user/data/manual-payment', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.success) {
                setStatus('success');
                setTimeout(() => onSuccess(), 2500);
            } else {
                setErrorMsg(res.message || 'Failed to submit manual payment');
            }
        } catch (err) {
            setErrorMsg(err.message || 'An error occurred during submission');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isPlatformAlreadyUnlocked = type === 'PLATFORM_UNLOCK' && userData?.isPaid;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-5 font-poppins">
            {/* Dark blur backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity"
                onClick={(status === 'idle' || status === 'error' || hasPendingManual) ? onClose : undefined}
            />

            {/* Modal Box */}
            <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-[400px] mx-auto rounded-[24px] shadow-2xl shadow-black/40 ring-1 ring-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Premium Header */}
                <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 flex justify-between items-center text-white shrink-0">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
                    </div>
                    
                    <div className="relative flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md">
                            <Lock size={14} className="text-blue-300" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[15px] tracking-wide text-white">Secure Checkout</h3>
                            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">256-bit Encrypted</p>
                        </div>
                    </div>
                    {(status === 'idle' || status === 'error' || hasPendingManual) && (
                        <button onClick={onClose} className="relative p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-slate-300 hover:text-white">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1 bg-gradient-to-b from-slate-50 to-white">
                    {(status === 'idle' || status === 'error') && (
                        <div className="p-5 sm:p-6">
                            
                            {/* Order Summary */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mb-5 relative overflow-hidden flex flex-col group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-600 to-indigo-600 rounded-l-2xl"></div>
                                
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <p className="text-[9px] text-blue-600 font-bold tracking-[0.25em] uppercase mb-1.5">Order Summary</p>
                                        <h4 className="text-[17px] font-extrabold text-slate-800 line-clamp-1 tracking-tight">{plan}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-medium text-slate-800 tracking-tight">
                                            <span className="text-xl font-medium mr-1 opacity-70">₹</span>
                                            {Math.round(amount)}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Breakdown for Boosters */}
                                {(type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') && (
                                    <div className="mt-2 pt-3 border-t border-slate-100 space-y-1.5">
                                        <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                                            <span>Base Price</span>
                                            <span>₹{Math.round(amount / 1.04)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] text-rose-500 font-medium">
                                            <span>Platform Fee (4%)</span>
                                            <span>+ ₹{Math.round(amount - (amount / 1.04))}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isPlatformAlreadyUnlocked && (
                                <div className="mb-5 p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 flex items-start gap-2.5 shadow-sm">
                                    <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-[12px] font-medium text-rose-700 leading-snug">You have already unlocked the platform.</p>
                                </div>
                            )}

                            {status === 'error' && !isPlatformAlreadyUnlocked && (
                                <div className="mb-5 p-3.5 bg-red-50/80 rounded-xl border border-red-200 flex items-start gap-2.5 shadow-sm animate-in shake">
                                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-[12px] font-medium text-red-700 leading-snug">{errorMsg}</p>
                                </div>
                            )}

                            {/* Dynamic Payment QR or Button */}
                            {!isPlatformAlreadyUnlocked && dynamicIntent && !isManualMode && (
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center relative">
                                    {!isMobile ? (
                                        <>
                                            <h4 className="font-semibold text-slate-800 text-[15px] mb-2">Scan QR to Pay</h4>
                                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mx-auto w-fit mb-4">
                                                <QRCode value={dynamicIntent} size={180} className="rounded-xl" />
                                            </div>
                                            <p className="text-[12px] text-slate-500 font-medium mb-4">Scan with PhonePe, GPay, or Paytm</p>
                                            
                                            <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto animate-pulse mb-4">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-[11px] font-bold tracking-wide">Waiting for payment...</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="font-semibold text-slate-800 text-[15px] mb-4">Pay securely using UPI</h4>
                                            
                                            <a
                                                href={dynamicIntent}
                                                className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white shadow-xl shadow-blue-600/30 mb-3"
                                            >
                                                <ShieldCheck size={20} className="text-blue-200" />
                                                Pay Now (Direct)
                                            </a>

                                            {!showQR ? (
                                                <button onClick={() => setShowQR(true)} className="text-[11px] text-blue-600 font-semibold my-2 uppercase tracking-wider hover:underline flex items-center justify-center w-full mb-3">
                                                    Show QR Code / Share Link
                                                </button>
                                            ) : (
                                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 mx-auto w-fit mb-3">
                                                        <QRCode value={dynamicIntent} size={130} className="rounded-xl" />
                                                    </div>
                                                    <button onClick={() => { navigator.clipboard.writeText(dynamicIntent); alert('Payment link copied!'); }} className="text-[11px] text-slate-600 font-medium mb-3 bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                                                        Copy Payment Link
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto animate-pulse mb-4">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-[11px] font-bold tracking-wide">Waiting for payment...</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Divider and Manual Payment Option (Always show if not already manual) */}
                            {!isPlatformAlreadyUnlocked && !isManualMode && status !== 'loading' && (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center mt-4">
                                    <button 
                                        onClick={() => setIsManualMode(true)}
                                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-all underline decoration-slate-300 underline-offset-4"
                                    >
                                        Payment failed or prefer manual? Try manual transfer
                                    </button>
                                </div>
                            )}

                            {/* Manual Payment UI */}
                            {!isPlatformAlreadyUnlocked && isManualMode && status !== 'loading' && (
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        {!hasPendingManual && (
                                            <button onClick={() => setIsManualMode(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-95 transition-all">
                                                <X size={14} />
                                            </button>
                                        )}
                                        <h4 className="font-semibold text-slate-800 text-[14px]">Manual Transfer</h4>
                                    </div>

                                    {qrScannerImage && (
                                        <div className="relative mx-auto w-fit mb-6 mt-2">
                                            {/* Decorative Scanner Background */}
                                            <div className="absolute -inset-4 border border-blue-500/20 bg-blue-50/30 rounded-[32px] animate-pulse"></div>
                                            
                                            <div className="relative bg-white p-3.5 rounded-2xl shadow-2xl shadow-blue-900/10 border border-slate-100 z-10 overflow-hidden group">
                                                {/* Corner markers */}
                                                <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-blue-600 rounded-tl-[14px] m-1.5 opacity-80"></div>
                                                <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-blue-600 rounded-tr-[14px] m-1.5 opacity-80"></div>
                                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-blue-600 rounded-bl-[14px] m-1.5 opacity-80"></div>
                                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-blue-600 rounded-br-[14px] m-1.5 opacity-80"></div>
                                                
                                                {/* Scanning laser animation */}
                                                <div className="absolute left-2 right-2 h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] z-20" style={{ animation: 'scan 2.5s ease-in-out infinite' }}></div>

                                                <img src={qrScannerImage} alt="Payment QR" className="w-36 h-36 sm:w-40 sm:h-40 object-cover rounded-xl relative z-0 transition-transform duration-500 group-hover:scale-105" />
                                                
                                                {/* Glass overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {adminUpiId && (
                                        <div className="text-center mb-5">
                                            <p className="text-[11px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Or Pay via UPI ID</p>
                                            <div className="bg-slate-100 py-2.5 px-5 rounded-xl text-[14px] font-bold text-slate-800 tracking-wide inline-flex items-center gap-2 border border-slate-200">
                                                {adminUpiId}
                                                <button onClick={() => { navigator.clipboard.writeText(adminUpiId); alert('UPI ID copied!'); }} className="text-blue-600 hover:text-blue-700 ml-2">
                                                    <Lock size={14} className="inline" /> Copy
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">UTR / Reference No.</label>
                                            <input 
                                                type="text" 
                                                value={utrNumber}
                                                onChange={(e) => setUtrNumber(e.target.value)}
                                                placeholder="Enter 12-digit UTR"
                                                maxLength={12}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Screenshot</label>
                                            <label className="flex items-center justify-center gap-2 w-full bg-white border border-dashed border-slate-300 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                                                <UploadCloud size={16} className="text-blue-500" />
                                                {screenshot ? screenshot.name : 'Upload Receipt Image'}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => setScreenshot(e.target.files[0])}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        <button 
                                            onClick={handleManualSubmit}
                                            disabled={isSubmitting || !utrNumber || !screenshot}
                                            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 shadow-lg shadow-slate-900/20"
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                                            ) : (
                                                <><CheckCircle2 size={16} /> Submit Proof</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {status === 'loading' && (
                        <div className="p-12 flex flex-col items-center justify-center text-center gap-5 py-32 bg-white">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                                <ShieldCheck size={28} className="text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-[18px]">Initializing secure payment...</h4>
                                <p className="text-[13px] text-slate-500 font-medium mt-1">Please wait a moment</p>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-5 py-24 bg-white animate-in slide-in-from-bottom-4 duration-500">
                            <div className={`w-24 h-24 bg-gradient-to-tr ${isManualMode ? 'from-amber-400 to-amber-500 shadow-amber-500/30' : 'from-emerald-400 to-emerald-500 shadow-emerald-500/30'} rounded-full flex items-center justify-center shadow-xl animate-in zoom-in duration-500 delay-150`}>
                                {isManualMode ? <ShieldCheck size={40} className="text-white" /> : <CheckCircle2 size={40} className="text-white" />}
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-black text-slate-800 text-[22px]">
                                    {isManualMode ? 'Submission Successful!' : 'Payment Successful!'}
                                </h4>
                                <p className="text-[13px] text-slate-500 font-medium leading-relaxed max-w-[250px] mx-auto">
                                    {isManualMode 
                                        ? 'Transaction pending. After 10-15 min admin will approve your transaction.' 
                                        : 'Your account has been upgraded successfully. Welcome aboard!'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}} />
        </div>
    );
};

export default PaymentModal;
