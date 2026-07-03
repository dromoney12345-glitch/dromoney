import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Copy, UploadCloud, Lock, ChevronDown, Check } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';
import { usePayment } from '../../../hooks/usePayment';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess, extraData = {} }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const { userData } = useUser();

    const [adminUpiId, setAdminUpiId] = useState('');
    const [qrScannerImage, setQrScannerImage] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [showManual, setShowManual] = useState(false);
    
    const { createPayment, loading: automatedLoading } = usePayment();
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMsg('');
            setUtrNumber('');
            setScreenshot(null);
            setPreviewUrl('');
            setShowManual(false);
            document.body.style.overflow = 'hidden';
            
            const fetchSettings = async () => {
                try {
                    const res = await api.get('/public/settings');
                    if (res.success && res.data) {
                        setAdminUpiId(res.data.adminUpiId || 'dromoney@upi');
                        setQrScannerImage(res.data.qrScannerImage || '');
                        setBankDetails(res.data.bankDetails || '');
                    }
                } catch (err) {
                    setAdminUpiId('dromoney@upi');
                }
            };
            fetchSettings();
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const isPlatformAlreadyUnlocked = type === 'PLATFORM_UNLOCK' && userData?.isPaid;

    const handleCopy = () => {
        navigator.clipboard.writeText(adminUpiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrorMsg('File size must be less than 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setErrorMsg('Please upload an image file');
                return;
            }
            setScreenshot(file);
            setPreviewUrl(URL.createObjectURL(file));
            setErrorMsg('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!utrNumber || utrNumber.length !== 12) {
            setErrorMsg('Please enter a valid 12-digit UTR/Ref Number');
            return;
        }
        if (!screenshot) {
            setErrorMsg('Please upload the payment screenshot');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('type', type);
            if (itemId) formData.append('ideaId', itemId);
            formData.append('planName', plan);
            formData.append('utrNumber', utrNumber);
            formData.append('screenshot', screenshot);
            
            if (extraData.durationInDays) formData.append('durationInDays', extraData.durationInDays);
            if (extraData.planDuration) formData.append('planDuration', extraData.planDuration);

            const res = await api.post('/user/data/manual-payment', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.success) {
                setStatus('success');
                setTimeout(() => onSuccess(), 2500);
            } else {
                throw new Error(res.message || 'Submission failed');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
        }
    };

    const upiLink = adminUpiId ? `upi://pay?pa=${adminUpiId}&pn=Dromoney&am=${amount}&cu=INR` : '';

    const handleAutomatedPayment = async () => {
        const orderType = ['PLATFORM_UNLOCK', 'BUSINESS_HUB_PLAN', 'SUPPORT_CHAT_RENEWAL'].includes(type) 
            ? 'SUBSCRIPTION' 
            : 'BOOSTER';
        
        await createPayment(amount, orderType, `Plan: ${plan}, Type: ${type}`);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-5 font-poppins">
            {/* Dark blur backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity"
                onClick={status === 'idle' || status === 'error' ? onClose : undefined}
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
                    {(status === 'idle' || status === 'error') && (
                        <button onClick={onClose} className="relative p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-slate-300 hover:text-white">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1 bg-gradient-to-b from-slate-50 to-white">
                    {(status === 'idle' || status === 'error') && (
                        <div className="p-5 sm:p-6">
                            
                            {/* Order Summary */}
                            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mb-1">Order Summary</p>
                                        <h4 className="text-[14px] font-bold text-slate-800 line-clamp-1">{plan}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">₹{parseFloat(amount).toFixed(0)}</p>
                                    </div>
                                </div>
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

                            {/* Payment Options */}
                            <div className="space-y-4">
                                <button
                                    onClick={handleAutomatedPayment}
                                    disabled={automatedLoading || isPlatformAlreadyUnlocked}
                                    className="group relative w-full overflow-hidden rounded-2xl p-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity"></span>
                                    <div className="relative w-full px-4 py-4 rounded-[15px] bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center gap-2.5 text-white shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all">
                                        {automatedLoading ? (
                                            <Loader2 size={20} className="animate-spin text-blue-200" />
                                        ) : (
                                            <ShieldCheck size={20} className="text-blue-200 group-hover:scale-110 transition-transform" />
                                        )}
                                        <span className="font-bold text-[14px] tracking-wide">
                                            {automatedLoading ? 'Connecting securely...' : 'Pay Automatically (Instant)'}
                                        </span>
                                    </div>
                                </button>
                                
                                <div className="flex items-center justify-center gap-3 py-1">
                                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or</span>
                                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                                </div>
                                
                                <button
                                    onClick={() => setShowManual(!showManual)}
                                    className="w-full py-3.5 rounded-xl border-2 border-slate-100 text-[13px] font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {showManual ? 'Cancel Manual Upload' : 'Manual UTR Verification'}
                                    <ChevronDown size={16} className={`transition-transform duration-300 ${showManual ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Manual Section */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showManual ? 'max-h-[800px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5">
                                    <div className="flex flex-col items-center mb-6">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4">
                                            {qrScannerImage ? (
                                                <img src={qrScannerImage} alt="QR Code" className="w-[150px] h-[150px] object-cover rounded-xl" />
                                            ) : adminUpiId ? (
                                                <QRCode value={upiLink} size={150} className="rounded-lg" />
                                            ) : (
                                                <div className="w-[150px] h-[150px] bg-slate-100 flex flex-col items-center justify-center rounded-xl">
                                                    <Loader2 size={24} className="text-slate-400 animate-spin mb-2" />
                                                    <span className="text-[10px] text-slate-500 font-medium">Loading QR...</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="w-full bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">UPI ID</p>
                                                <p className="text-[13px] font-semibold text-slate-800">{adminUpiId || 'Loading...'}</p>
                                            </div>
                                            <button 
                                                onClick={handleCopy}
                                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                                            >
                                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">12-Digit UTR Number</label>
                                            <input
                                                type="text"
                                                value={utrNumber}
                                                onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                                                placeholder="e.g. 312345678901"
                                                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Payment Screenshot</label>
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group
                                                    ${previewUrl ? 'border-blue-400 bg-blue-50/30' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'}`}
                                            >
                                                {previewUrl ? (
                                                    <>
                                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-60 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="bg-slate-900/80 text-white text-[11px] font-medium px-4 py-2 rounded-full backdrop-blur-md">Change Image</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                                                            <UploadCloud size={18} />
                                                        </div>
                                                        <span className="text-[12px] font-semibold text-slate-600">Tap to upload proof</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isPlatformAlreadyUnlocked || !utrNumber || utrNumber.length !== 12 || !screenshot}
                                            className={`w-full py-4 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 mt-2
                                                ${(!utrNumber || utrNumber.length !== 12 || !screenshot)
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white shadow-lg shadow-slate-900/20'}`}
                                        >
                                            <CheckCircle2 size={16} />
                                            Submit for Verification
                                        </button>
                                    </form>
                                </div>
                            </div>
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
                                <h4 className="font-bold text-slate-800 text-[18px]">Uploading securely...</h4>
                                <p className="text-[13px] text-slate-500 font-medium mt-1">Please keep this window open</p>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-5 py-24 bg-white animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-in zoom-in duration-500 delay-150">
                                <CheckCircle2 size={40} className="text-white" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-black text-slate-800 text-[22px]">Proof Received!</h4>
                                <p className="text-[13px] text-slate-500 font-medium leading-relaxed max-w-[250px] mx-auto">
                                    Your manual payment proof has been sent to our team for verification.
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
