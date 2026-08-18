import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertCircle, UploadCloud, QrCode, Download, Copy, ChevronLeft } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import QRCode from 'react-qr-code';

const DEFAULT_UPI_ID = 'BHARATPE2R0P0Z7W3H84355@unitype';
const DEFAULT_MERCHANT_NAME = 'SUBHASH KUMAR';
const DEFAULT_QR_IMAGE = '/payment-qr.png';

const PaymentModal = ({ isOpen, onClose, plan, amount, type = 'PLATFORM_UNLOCK', itemId = null, extraData = {}, onSuccess }) => {
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const { userData, refreshUserProfile } = useUser();

    const [isMobile, setIsMobile] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [qrScannerImage, setQrScannerImage] = useState(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [adminUpiId, setAdminUpiId] = useState(null);
    const [hasPendingManual, setHasPendingManual] = useState(false);
    const [copied, setCopied] = useState(false);
    const submitLockRef = React.useRef(false);

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
            setHasPendingManual(false);
            setCopied(false);
            submitLockRef.current = false;
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
        if (submitLockRef.current || isSubmitting) return;

        if (!utrNumber || utrNumber.length !== 12) {
            setErrorMsg('Please enter a valid 12-digit UTR number');
            return;
        }
        if (!screenshot) {
            setErrorMsg('Please upload a payment screenshot');
            return;
        }
        if (type === 'PLATFORM_UNLOCK' && userData?.isPaid) {
            setErrorMsg('Platform already unlocked.');
            return;
        }
        if (hasPendingManual) {
            setErrorMsg('You already have a pending payment. Please wait for approval.');
            return;
        }

        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('type', type);
            formData.append('planName', extraData.planName || plan);
            formData.append('utrNumber', utrNumber);
            formData.append('screenshot', screenshot);
            if (itemId) formData.append('ideaId', itemId);
            if (extraData.planDuration) formData.append('planDuration', extraData.planDuration);
            if (extraData.durationInDays) formData.append('durationInDays', extraData.durationInDays);

            const res = await api.post('/user/data/manual-payment', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.success) {
                setHasPendingManual(true);
                setStatus('success');
                setTimeout(async () => {
                    if (refreshUserProfile) await refreshUserProfile();
                    if (onSuccess) onSuccess();
                }, 2500);
            } else {
                setErrorMsg(res.message || 'Failed to submit manual payment');
                submitLockRef.current = false;
            }
        } catch (err) {
            setErrorMsg(err.message || 'An error occurred during submission');
            submitLockRef.current = false;
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

    const handleCopyUpi = async () => {
        try {
            await navigator.clipboard.writeText(upiIdToUse);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            setErrorMsg('Could not copy UPI ID.');
        }
    };

    if (!isOpen) return null;

    const isPlatformAlreadyUnlocked = type === 'PLATFORM_UNLOCK' && userData?.isPaid;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center font-poppins">
            <div
                className="absolute inset-0 bg-slate-900/50"
                onClick={(status === 'idle' || status === 'error' || hasPendingManual) ? onClose : undefined}
            />

            <div className="relative bg-[#F8F9FA] w-full max-w-[430px] mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[94vh] overflow-hidden">
                <div className="relative px-4 py-3 flex items-center shrink-0 bg-[#F8F9FA]">
                    {(status === 'idle' || status === 'error' || hasPendingManual) && (
                        <button type="button" onClick={onClose} className="absolute left-3 w-8 h-8 flex items-center justify-center text-slate-800">
                            <ChevronLeft size={22} />
                        </button>
                    )}
                    <h3 className="w-full text-center text-[16px] font-medium text-slate-900">Payment</h3>
                </div>

                <div className="overflow-y-auto scrollbar-hide flex-1 px-4 pb-5 space-y-3">
                    {(status === 'idle' || status === 'error') && (
                        <>
                            <div className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                                <p className="text-[14px] font-medium text-slate-900">{plan || 'Withdrawal Card'}</p>
                                <p className="text-[16px] font-medium text-[#462211]">₹{Math.round(amount)}</p>
                            </div>

                            {(type === 'SUPPORT_BOOSTER' || type === 'TASK_BOOSTER') && (
                                <div className="flex justify-between text-[10px] text-slate-500 px-1">
                                    <span>Base ₹{Math.round(amount / 1.04)} + 4% fee</span>
                                    <span className="text-rose-500">+₹{Math.round(amount - (amount / 1.04))}</span>
                                </div>
                            )}

                            {isPlatformAlreadyUnlocked && (
                                <div className="p-2.5 bg-rose-50 rounded-xl flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-rose-700">You have already unlocked the platform.</p>
                                </div>
                            )}

                            {errorMsg && !isPlatformAlreadyUnlocked && (
                                <div className="p-2.5 bg-red-50 rounded-xl flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-red-700 leading-snug">{errorMsg}</p>
                                </div>
                            )}

                            {!isPlatformAlreadyUnlocked && (
                                <>
                                    <p className="text-[13px] font-medium text-slate-800 pt-1">
                                        1. Pay via UPI (<span className="text-[#462211]">Recommended</span>)
                                    </p>

                                    <button
                                        type="button"
                                        onClick={handlePayViaApp}
                                        className="w-full py-3.5 rounded-xl bg-[#462211] active:scale-[0.99] text-white"
                                    >
                                        <span className="block text-[16px] font-medium leading-tight">Pay Now</span>
                                        <span className="block text-[10px] font-normal text-white/85 mt-0.5">PhonePe / GPay / Paytm / any UPI App</span>
                                    </button>

                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner((v) => !v)}
                                            className="bg-white rounded-xl py-3 px-1.5 flex flex-col items-center gap-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-[#462211]"
                                        >
                                            <QrCode size={20} />
                                            <span className="text-[10px] font-medium text-center leading-tight">{showScanner ? 'Hide Scanner' : 'Scan & Pay'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadScanner}
                                            disabled={isDownloading}
                                            className="bg-white rounded-xl py-3 px-1.5 flex flex-col items-center gap-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-[#462211] disabled:opacity-50"
                                        >
                                            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                            <span className="text-[10px] font-medium text-center leading-tight">Download Scanner</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyUpi}
                                            className="bg-white rounded-xl py-3 px-1.5 flex flex-col items-center gap-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-[#462211]"
                                        >
                                            <Copy size={20} />
                                            <span className="text-[10px] font-medium text-center leading-tight">{copied ? 'Copied' : 'Copy UPI'}</span>
                                        </button>
                                    </div>

                                    {showScanner && (
                                        <div className="pt-1">
                                            <div className="relative bg-white p-2.5 rounded-xl border border-slate-200 mx-auto w-fit overflow-hidden">
                                                <div id="qr-container" className="flex items-center justify-center">
                                                    <QRCode value={nativeIntent} size={140} className="rounded-lg" />
                                                </div>
                                                <img src={qrImageToShow} alt="" className="hidden" aria-hidden="true" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 text-center mt-2 leading-snug">
                                                Scan with any UPI app · amount ₹{formattedAmount} is prefilled
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl p-3.5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Enter UTR (12 digit)</label>
                                            <input
                                                type="text"
                                                value={utrNumber}
                                                onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                                placeholder="Enter 12 digit UTR"
                                                maxLength={12}
                                                inputMode="numeric"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#462211]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Upload Screenshot</label>
                                            <label className="flex flex-col items-center justify-center gap-1 w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-6 cursor-pointer">
                                                <UploadCloud size={26} className="text-[#462211]" />
                                                <span className="text-[13px] font-medium text-slate-800">Upload Screenshot</span>
                                                <span className="text-[10px] text-slate-400">{screenshot ? screenshot.name : 'JPG, PNG or PDF (Max 5MB)'}</span>
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
                                            disabled={isSubmitting || hasPendingManual || utrNumber.length !== 12 || !screenshot}
                                            className="w-full py-3 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed bg-[#462211] active:scale-[0.99]"
                                        >
                                            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit'}
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                                        <div className="w-9 h-9 rounded-lg bg-[#FFF5F0] text-[#462211] flex items-center justify-center shrink-0">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-slate-800">100% Secure Payment</p>
                                            <p className="text-[11px] text-slate-400">Your payment details are safe with us.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {status === 'loading' && (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-4 py-24">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <div className="absolute inset-0 border-[3px] border-orange-100 rounded-full" />
                                <div className="absolute inset-0 border-[3px] border-[#462211] rounded-full border-t-transparent animate-spin" />
                                <ShieldCheck size={20} className="text-[#462211]" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-800 text-[14px]">Checking payment…</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">Please wait</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="p-8 flex flex-col items-center justify-center text-center gap-4 py-20">
                            <div className="w-16 h-16 bg-[#462211] rounded-full flex items-center justify-center">
                                <ShieldCheck size={28} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium text-slate-800 text-[16px]">Submission Successful!</h4>
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
