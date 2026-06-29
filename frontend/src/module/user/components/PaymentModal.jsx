import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Copy, UploadCloud, ImageIcon } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';
import { usePayment } from '../../../hooks/usePayment';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess, extraData = {} }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | processing | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const { userData, refreshUserProfile } = useUser();

    const [adminUpiId, setAdminUpiId] = useState('');
    const [qrScannerImage, setQrScannerImage] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [showManual, setShowManual] = useState(false);
    
    const { createPayment, loading: zuelpayLoading } = usePayment();
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMsg('');
            setUtrNumber('');
            setScreenshot(null);
            setPreviewUrl('');
            document.body.style.overflow = 'hidden';
            
            // Fetch admin UPI ID and QR Scanner
            const fetchSettings = async () => {
                try {
                    const res = await api.get('/public/settings');
                    if (res.success && res.data) {
                        setAdminUpiId(res.data.adminUpiId || 'dromoney@upi');
                        setQrScannerImage(res.data.qrScannerImage || '');
                        setBankDetails(res.data.bankDetails || '');
                    } else {
                        setAdminUpiId('dromoney@upi'); // fallback
                    }
                } catch (err) {
                    console.error("Failed to load settings:", err);
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
                setTimeout(() => {
                    onSuccess();
                }, 2500);
            } else {
                throw new Error(res.message || 'Submission failed');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
        }
    };

    // Construct UPI Link for QR Code
    const upiLink = adminUpiId ? `upi://pay?pa=${adminUpiId}&pn=Dromoney&am=${amount}&cu=INR` : '';

    const handleZuelpay = async () => {
        const orderType = ['PLATFORM_UNLOCK', 'BUSINESS_HUB_PLAN', 'SUPPORT_CHAT_RENEWAL'].includes(type) 
            ? 'SUBSCRIPTION' 
            : 'BOOSTER';
        
        await createPayment(amount, orderType, `Plan: ${plan}, Type: ${type}`);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 font-poppins">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={status === 'idle' || status === 'error' ? onClose : undefined}
            />

            {/* Modal Box */}
            <div className="relative bg-white w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#1a233b] p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-medium text-[15px] tracking-wide">Secure Payment</h3>
                    </div>
                    {(status === 'idle' || status === 'error') && (
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1">
                    {/* ── IDLE / ERROR: Show Manual Payment Form ── */}
                    {(status === 'idle' || status === 'error') && (
                        <>
                            {/* Course / Plan Info */}
                            <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                                        <IndianRupeeIcon />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-semibold text-slate-800 line-clamp-1 leading-tight">{plan}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Manual Payment Setup</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className="text-lg font-bold text-slate-800 tracking-tight">₹{parseFloat(amount).toFixed(0)}</p>
                                </div>
                            </div>

                            {/* Platform already unlocked warning */}
                            {isPlatformAlreadyUnlocked && (
                                <div className="mx-4 mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] font-medium text-rose-600">Platform already unlocked.</p>
                                </div>
                            )}

                            {/* Payment error */}
                            {status === 'error' && !isPlatformAlreadyUnlocked && (
                                <div className="mx-4 mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] font-medium text-red-600">{errorMsg}</p>
                                </div>
                            )}

                            {/* ZUELPAY INTEGRATION */}
                            <div className="p-4 border-b border-slate-100">
                                <button
                                    onClick={handleZuelpay}
                                    disabled={zuelpayLoading || isPlatformAlreadyUnlocked}
                                    className="w-full py-3.5 rounded-xl text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {zuelpayLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    {zuelpayLoading ? 'Processing...' : 'Pay with Zuelpay (Automatic)'}
                                </button>
                                
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">OR</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                
                                <button
                                    onClick={() => setShowManual(!showManual)}
                                    className="w-full mt-4 py-2.5 rounded-lg text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    {showManual ? 'Hide Manual Setup' : 'Use Manual Payment Setup'}
                                </button>
                            </div>

                            {showManual && (
                                <div className="p-5 animate-in fade-in slide-in-from-top-2">
                                    {/* QR Code Area */}
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <div className="bg-white p-3 rounded-xl border-2 border-slate-100 shadow-sm mb-3">
                                        {qrScannerImage ? (
                                            <img src={qrScannerImage} alt="Payment QR Code" className="w-[140px] h-[140px] object-cover rounded-lg" />
                                        ) : adminUpiId ? (
                                            <QRCode value={upiLink} size={140} />
                                        ) : (
                                            <div className="w-[140px] h-[140px] bg-slate-50 flex items-center justify-center animate-pulse rounded-lg">
                                                <Loader2 size={24} className="text-slate-300 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 text-center uppercase tracking-widest mb-2">Scan QR Code to Pay</p>
                                    
                                    <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                        <div className="overflow-hidden">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-medium mb-0.5">UPI ID</p>
                                            <p className="text-[12px] font-semibold text-slate-800 truncate">{adminUpiId || 'Loading...'}</p>
                                        </div>
                                        <button 
                                            onClick={handleCopy}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                                        >
                                            {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>

                                    {bankDetails && (
                                        <div className="w-full mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                                            <p className="text-[9px] font-medium text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <AlertCircle size={10} /> Alternative: Bank Transfer
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{bankDetails}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full h-px bg-slate-100 my-5 relative">
                                    <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Verification Area</span>
                                </div>

                                {/* Upload Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-1.5">Enter 12-digit UTR / Ref Number</label>
                                        <input
                                            type="text"
                                            value={utrNumber}
                                            onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                                            placeholder="1234 5678 9012"
                                            maxLength={12}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 tracking-wider placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-center font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-1.5">Upload Payment Proof</label>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`w-full aspect-[2.5/1] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group
                                                ${previewUrl ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}
                                        >
                                            {previewUrl ? (
                                                <>
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="bg-slate-900/80 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm">Change Image</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-slate-400">
                                                        <UploadCloud size={16} />
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Click to Upload</span>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isPlatformAlreadyUnlocked || !utrNumber || utrNumber.length !== 12 || !screenshot}
                                        className={`w-full py-4 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2
                                            ${isPlatformAlreadyUnlocked 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                : (!utrNumber || utrNumber.length !== 12 || !screenshot)
                                                ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                                                : 'bg-[#5e3818] hover:bg-[#4a2b10] active:scale-[0.98] text-white shadow-lg shadow-amber-900/20'}`}
                                    >
                                        <ShieldCheck size={14} />
                                        Submit Payment Proof
                                    </button>
                                </form>
                            </div>
                            )}
                        </>
                    )}

                    {/* ── LOADING: Uploading ── */}
                    {status === 'loading' && (
                        <div className="p-12 flex flex-col items-center justify-center text-center gap-4 py-24">
                            <Loader2 size={36} className="text-amber-600 animate-spin" />
                            <div>
                                <p className="font-semibold text-slate-800 text-[15px]">Submitting Proof...</p>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Please do not close</p>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {status === 'success' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-4 py-20">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <CheckCircle2 size={32} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 text-[17px]">Proof Submitted!</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
                                    Your payment proof has been sent to the admin.<br/>
                                    Verification will be completed within 24 hours.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Simple Icon component used above
const IndianRupeeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12" />
        <path d="M6 8h12" />
        <path d="M6 13h8.5l-1 1H6" />
        <path d="M13 3v5" />
        <path d="M13 8c0 2.8-2.2 5-5 5" />
        <path d="m14.5 13-9.5 8" />
    </svg>
);

export default PaymentModal;
