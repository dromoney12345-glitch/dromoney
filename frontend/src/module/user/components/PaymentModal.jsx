import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Lock, UploadCloud, CreditCard } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess, extraData = {} }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const { userData } = useUser();

    const [isMobile, setIsMobile] = useState(false);
    const [showQR, setShowQR] = useState(false);
    
    const [qrScannerImage, setQrScannerImage] = useState(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminUpiId, setAdminUpiId] = useState(null);
    const [hasPendingManual, setHasPendingManual] = useState(false);

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
            setUtrNumber('');
            setScreenshot(null);
            document.body.style.overflow = 'hidden';
            
            checkPendingManualPayment();
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const checkPendingManualPayment = async () => {
        try {
            setStatus('loading');
            const res = await api.get(`/user/data/manual-payment/check?type=${type}`);
            if (res.success && res.hasPending) {
                setHasPendingManual(true);
                setStatus('success');
            } else {
                setStatus('idle');
            }
        } catch (err) {
            console.error('Error checking pending manual payment', err);
            setStatus('idle');
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
    
    // Generate the Native UPI Intent URL
    const upiIdToUse = adminUpiId || 'Q683884812@ybl';
    const transactionRef = `TR${Date.now()}`;
    const nativeIntent = `upi://pay?pa=${upiIdToUse}&pn=DroMoney&tr=${transactionRef}&tn=Platform%20Payment&am=${amount}&cu=INR`;

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
                            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">0% Gateway Fee (Direct UPI)</p>
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

                            {/* Direct Native UPI Pay Option */}
                            {!isPlatformAlreadyUnlocked && (
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center relative mb-5">
                                    <h4 className="font-semibold text-slate-800 text-[15px] mb-4">Pay securely via UPI</h4>
                                    
                                    <a
                                        href={nativeIntent}
                                        className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white shadow-xl shadow-blue-600/30 mb-3"
                                    >
                                        <ShieldCheck size={20} className="text-blue-200" />
                                        Pay Now (Direct)
                                    </a>

                                    {!showQR ? (
                                        <button onClick={() => setShowQR(true)} className="text-[11px] text-blue-600 font-semibold my-2 uppercase tracking-wider hover:underline flex items-center justify-center w-full mb-1">
                                            Show QR Code / Share Link
                                        </button>
                                    ) : (
                                        <div className="animate-in fade-in zoom-in-95 duration-300">
                                            <style>
                                            {`
                                                @keyframes scanner-laser {
                                                    0%, 100% { transform: translateY(-10px); opacity: 0; }
                                                    10% { opacity: 1; }
                                                    50% { transform: translateY(120px); opacity: 1; }
                                                    90% { opacity: 1; }
                                                }
                                                .animate-scanner {
                                                    animation: scanner-laser 2.5s ease-in-out infinite;
                                                }
                                            `}
                                            </style>
                                            <div className="relative bg-white p-3 rounded-2xl shadow-md border-2 border-blue-100 mx-auto w-fit mb-4 overflow-hidden">
                                                <QRCode value={nativeIntent} size={130} className="rounded-xl relative z-0" />
                                                
                                                {/* Animated Scanner Laser */}
                                                <div className="absolute left-0 right-0 z-10 w-full h-[40px] bg-gradient-to-b from-transparent to-blue-500/20 border-b-2 border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.5)] animate-scanner pointer-events-none rounded-b-full"></div>

                                                {/* Scanner Corners */}
                                                <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-4 border-l-4 border-blue-600 rounded-tl-xl pointer-events-none"></div>
                                                <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-4 border-r-4 border-blue-600 rounded-tr-xl pointer-events-none"></div>
                                                <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-4 border-l-4 border-blue-600 rounded-bl-xl pointer-events-none"></div>
                                                <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-4 border-r-4 border-blue-600 rounded-br-xl pointer-events-none"></div>
                                            </div>
                                            <button onClick={() => { navigator.clipboard.writeText(nativeIntent); alert('Payment link copied!'); }} className="text-[11px] text-slate-600 font-medium mb-1 bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                                                Copy Payment Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Manual Payment UI (Always visible below the intent) */}
                            {!isPlatformAlreadyUnlocked && status !== 'loading' && (
                                <div className="bg-white rounded-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300 shadow-sm p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <h4 className="font-semibold text-slate-800 text-[14px]">Confirm Your Payment</h4>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mb-5">
                                        After paying using the button above, please provide the 12-digit UTR number and a screenshot to verify your payment.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">UTR / Reference No.</label>
                                            <input 
                                                type="text" 
                                                value={utrNumber}
                                                onChange={(e) => setUtrNumber(e.target.value)}
                                                placeholder="Enter 12-digit UTR"
                                                maxLength={12}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Screenshot</label>
                                            <label className="flex items-center justify-center gap-2 w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
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
                                <h4 className="font-bold text-slate-800 text-[18px]">Checking Payment Status...</h4>
                                <p className="text-[13px] text-slate-500 font-medium mt-1">Please wait a moment</p>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-5 py-24 bg-white animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-amber-500 shadow-amber-500/30 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in duration-500 delay-150">
                                <ShieldCheck size={40} className="text-white" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-black text-slate-800 text-[22px]">
                                    Submission Successful!
                                </h4>
                                <p className="text-[13px] text-slate-500 font-medium leading-relaxed max-w-[250px] mx-auto">
                                    {(type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') 
                                        ? 'Wait for 5 min, booster will active after admin approval.' 
                                        : 'Transaction pending. After 10-15 min admin will approve your transaction.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
