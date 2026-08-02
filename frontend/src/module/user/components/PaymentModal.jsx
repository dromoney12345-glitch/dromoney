import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Lock, UploadCloud, QrCode, Download, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';

const DEFAULT_UPI_ID = 'BHARATPE2R0P0Z7W3H84355@unitype';
const DEFAULT_MERCHANT_NAME = 'SUBHASH KUMAR';
const DEFAULT_QR_IMAGE = '/payment-qr.png';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, onSuccess }) => {
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const { userData } = useUser();

    const [isMobile, setIsMobile] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [qrScannerImage, setQrScannerImage] = useState(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [adminUpiId, setAdminUpiId] = useState(null);
    const [hasPendingManual, setHasPendingManual] = useState(false);

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    if (res.data.qrScannerImage) setQrScannerImage(res.data.qrScannerImage);
                    if (res.data.adminUpiId) setAdminUpiId(res.data.adminUpiId);
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
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
            setShowScanner(false);
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
                headers: { 'Content-Type': 'multipart/form-data' }
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

    const PLACEHOLDER_UPIS = new Set(['dromoney@upi', 'Q683884812@ybl', 'yourname@upi']);
    const trimmedAdminUpi = adminUpiId?.trim() || '';
    const upiIdToUse = trimmedAdminUpi && !PLACEHOLDER_UPIS.has(trimmedAdminUpi)
        ? trimmedAdminUpi
        : DEFAULT_UPI_ID;
    const isPlaceholderQr = !qrScannerImage
        || qrScannerImage.includes('wikipedia')
        || qrScannerImage.includes('wikimedia');
    const qrImageToShow = isPlaceholderQr ? DEFAULT_QR_IMAGE : qrScannerImage;
    const formattedAmount = Number(amount).toFixed(2);
    const nativeIntent = `upi://pay?pa=${upiIdToUse}&pn=${encodeURIComponent(DEFAULT_MERCHANT_NAME)}&am=${formattedAmount}&cu=INR`;

    const handlePayViaApp = (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (!isMobile) {
            setErrorMsg('UPI apps open only on mobile. Use Pay via Scanner or Download Scanner instead.');
            setShowScanner(true);
            return;
        }
        try {
            const opener = document.createElement('a');
            opener.href = nativeIntent;
            opener.style.display = 'none';
            document.body.appendChild(opener);
            opener.click();
            document.body.removeChild(opener);
        } catch (err) {
            setErrorMsg('Could not open UPI app. Try Pay via Scanner instead.');
            setShowScanner(true);
        }
    };

    const blobFromQrImage = async () => {
        // Prefer merchant scanner image
        try {
            const response = await fetch(qrImageToShow, { cache: 'force-cache' });
            if (response.ok) {
                const blob = await response.blob();
                if (blob && blob.size > 0) return blob;
            }
        } catch (_) { /* fall through */ }

        // Fallback: render generated UPI QR to PNG
        const svg = document.querySelector('#qr-container svg');
        if (!svg) throw new Error('QR not ready');

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = url;
            });
            const padding = 24;
            const canvas = document.createElement('canvas');
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);
            const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!pngBlob) throw new Error('Could not create image');
            return pngBlob;
        } finally {
            URL.revokeObjectURL(url);
        }
    };

    const handleDownloadScanner = async () => {
        setErrorMsg('');
        setIsDownloading(true);
        // Ensure QR SVG exists for fallback generation
        if (!showScanner) setShowScanner(true);

        try {
            // Small delay so QR mounts if scanner was closed
            await new Promise((r) => setTimeout(r, 80));
            const blob = await blobFromQrImage();
            const file = new File([blob], 'dromoney-payment-qr.png', { type: 'image/png' });

            // Mobile: prefer native share (saves to gallery / Files without download attribute issues)
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Payment QR',
                        text: `Pay ₹${formattedAmount} to ${DEFAULT_MERCHANT_NAME}`,
                    });
                    return;
                } catch (shareErr) {
                    // User cancelled share — not an error
                    if (shareErr?.name === 'AbortError') return;
                }
            }

            // Desktop / fallback download
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = 'dromoney-payment-qr.png';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
        } catch (err) {
            console.error('QR download failed', err);
            setErrorMsg('Could not download scanner. Tap Pay via Scanner and take a screenshot instead.');
            setShowScanner(true);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isOpen) return null;

    const isPlatformAlreadyUnlocked = type === 'PLATFORM_UNLOCK' && userData?.isPaid;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 font-poppins">
            <div
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                onClick={(status === 'idle' || status === 'error' || hasPendingManual) ? onClose : undefined}
            />

            <div className="relative bg-white w-full max-w-[380px] mx-auto rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-black/5 animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="relative bg-slate-900 px-4 py-3.5 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                            <Lock size={12} className="text-sky-300" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[13px] tracking-wide">Secure Checkout</h3>
                            <p className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">Direct UPI · 0% fee</p>
                        </div>
                    </div>
                    {(status === 'idle' || status === 'error' || hasPendingManual) && (
                        <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-300">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1 bg-slate-50">
                    {(status === 'idle' || status === 'error') && (
                        <div className="p-4 space-y-3.5">
                            {/* Order summary — compact */}
                            <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-100 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Paying for</p>
                                    <h4 className="text-[13px] font-semibold text-slate-800 truncate">{plan}</h4>
                                </div>
                                <p className="text-[22px] font-semibold text-slate-900 tracking-tight shrink-0">
                                    <span className="text-[13px] font-medium text-slate-500 mr-0.5">₹</span>
                                    {Math.round(amount)}
                                </p>
                            </div>

                            {(type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') && (
                                <div className="flex justify-between text-[10px] text-slate-500 px-1 -mt-1">
                                    <span>Base ₹{Math.round(amount / 1.04)} + 4% fee</span>
                                    <span className="text-rose-500">+₹{Math.round(amount - (amount / 1.04))}</span>
                                </div>
                            )}

                            {isPlatformAlreadyUnlocked && (
                                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-rose-700">You have already unlocked the platform.</p>
                                </div>
                            )}

                            {errorMsg && !isPlatformAlreadyUnlocked && (
                                <div className="p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-red-700 leading-snug">{errorMsg}</p>
                                </div>
                            )}

                            {!isPlatformAlreadyUnlocked && (
                                <div className="bg-white rounded-xl border border-slate-100 p-3.5 space-y-2.5">
                                    <div className="text-center">
                                        <p className="text-[12px] font-semibold text-slate-800">Pay via UPI</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {DEFAULT_MERCHANT_NAME}
                                            <span className="mx-1 text-slate-300">·</span>
                                            <span className="font-mono text-[9px] text-slate-600">{upiIdToUse}</span>
                                        </p>
                                    </div>

                                    {/* Compact app pay button */}
                                    <button
                                        type="button"
                                        onClick={handlePayViaApp}
                                        className="w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white transition-all"
                                    >
                                        <ShieldCheck size={15} />
                                        Pay with PhonePe / GPay / Paytm
                                    </button>

                                    {/* Compact scanner actions — scanner closed by default */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner((v) => !v)}
                                            className="py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98] transition-all"
                                        >
                                            <QrCode size={13} />
                                            {showScanner ? 'Hide Scanner' : 'Pay via Scanner'}
                                            {showScanner ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadScanner}
                                            disabled={isDownloading}
                                            className="py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white active:scale-[0.98] transition-all"
                                        >
                                            {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                            Download Scanner
                                        </button>
                                    </div>

                                    {showScanner && (
                                        <div className="pt-1 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="relative bg-white p-2.5 rounded-xl border border-slate-200 mx-auto w-fit overflow-hidden">
                                                <div id="qr-container" className="flex items-center justify-center">
                                                    <QRCode value={nativeIntent} size={140} className="rounded-lg" />
                                                </div>
                                                <img
                                                    src={qrImageToShow}
                                                    alt=""
                                                    className="hidden"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 text-center mt-2 leading-snug">
                                                Scan with any UPI app · amount ₹{formattedAmount} is prefilled
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isPlatformAlreadyUnlocked && status !== 'loading' && (
                                <div className="bg-white rounded-xl border border-slate-100 p-3.5 space-y-3">
                                    <div>
                                        <h4 className="font-semibold text-slate-800 text-[12px]">Confirm payment</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            After paying, enter UTR and upload screenshot.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">UTR / Reference</label>
                                        <input
                                            type="text"
                                            value={utrNumber}
                                            onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                            placeholder="12-digit UTR"
                                            maxLength={12}
                                            inputMode="numeric"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Screenshot</label>
                                        <label className="flex items-center justify-center gap-1.5 w-full bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer">
                                            <UploadCloud size={14} className="text-sky-500" />
                                            {screenshot ? screenshot.name : 'Upload receipt'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setScreenshot(e.target.files[0])}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleManualSubmit}
                                        disabled={isSubmitting || !utrNumber || !screenshot}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-[12px] font-semibold active:scale-[0.98] flex items-center justify-center gap-1.5"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                                        ) : (
                                            <><CheckCircle2 size={14} /> Submit Proof</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-4 py-24 bg-white">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
                                <div className="absolute inset-0 border-[3px] border-sky-600 rounded-full border-t-transparent animate-spin" />
                                <ShieldCheck size={20} className="text-sky-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 text-[14px]">Checking payment…</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">Please wait</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="p-8 flex flex-col items-center justify-center text-center gap-4 py-20 bg-white">
                            <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/30">
                                <ShieldCheck size={28} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-800 text-[16px]">Submission Successful!</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[220px] mx-auto">
                                    {(type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER')
                                        ? 'Wait ~5 min — booster activates after admin approval.'
                                        : 'Pending approval. Admin usually confirms in 10–15 min.'}
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
