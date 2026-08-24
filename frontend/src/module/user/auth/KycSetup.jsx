import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, ShieldCheck, UploadCloud, Camera, ArrowLeft,
    Info, Clock, CreditCard
} from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import { isWithinTaskWindow } from '../../shared/utils/taskRenewal';

const ACCENT = '#462211';

const IMPORTANT_NOTES = [
    'Aadhaar number and photo must be your own.',
    'Ensure details are clear and valid.',
    'Incorrect information will lead to KYC rejection.',
    'Our team verifies KYC manually.',
    'Approval will be done within 20 – 30 minutes.',
];

const KycSetup = () => {
    const navigate = useNavigate();
    const { userData, addNotification, refreshUserProfile, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(false);
    const [aadhaar, setAadhaar] = useState('');
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [error, setError] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);

    const kycStatus = (userData?.kycStatus || '').toLowerCase();
    const [settings, setSettings] = useState(null);
    const [isWithinKycWindow, setIsWithinKycWindow] = useState(true);

    const refreshKycWindow = (data) => {
        const start = data?.kycWindowStart || '07:00';
        const end = data?.kycWindowEnd || '19:00';
        setIsWithinKycWindow(isWithinTaskWindow(start, end));
    };

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setSettings(res.data);
                    refreshKycWindow(res.data);
                }
            } catch (err) {}
        };
        fetchSettings();
        const timer = setInterval(() => {
            setSettings((prev) => {
                if (prev) refreshKycWindow(prev);
                return prev;
            });
        }, 30 * 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime12h = (time24) => {
        if (!time24) return '';
        let [h, m] = time24.split(':');
        h = parseInt(h, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    React.useEffect(() => {
        if (userLoading) return;
        if (kycStatus === 'pending') {
            navigate('/user/auth/pending');
        } else if (kycStatus === 'approved' || kycStatus === 'verified') {
            navigate('/user/income');
        }
    }, [kycStatus, navigate, userLoading]);

    React.useEffect(() => {
        if (!aadhaarFile) {
            setPreviewUrl('');
            return;
        }

        const objectUrl = URL.createObjectURL(aadhaarFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [aadhaarFile]);

    if (userLoading) return (
        <div className="min-h-screen bg-[#FCF8F5] flex items-center justify-center font-poppins">
            <Loader2 className="animate-spin w-8 h-8" style={{ color: ACCENT }} />
        </div>
    );

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isImage = !file.type || file.type.startsWith('image/') || file.type === 'application/octet-stream';
        const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
        const allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'bmp', 'tiff', 'jfif', 'pjpeg', 'pjp', 'avif', ''];

        if (!isImage && !allowedExts.includes(ext)) {
            setError('Note: Incorrect image format! Please upload a valid image file (All image formats like JPEG, PNG, WEBP, HEIC, HEIF, etc. are accepted).');
            setShowErrorModal(true);
            e.target.value = '';
            setAadhaarFile(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Note: File is too large! Maximum limit is 5MB.');
            setShowErrorModal(true);
            e.target.value = '';
            setAadhaarFile(null);
            return;
        }

        setAadhaarFile(file);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isWithinKycWindow) {
            setError(`Note: KYC submissions are only available between ${windowStart} and ${windowEnd} (IST, daily).`);
            setShowErrorModal(true);
            return;
        }

        if (aadhaar.length < 12) {
            setError('Note: Aadhaar number must be exactly 12 digits.');
            setShowErrorModal(true);
            return;
        }

        if (!aadhaarFile) {
            setError('Note: Please upload your document photo first.');
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('documentNumber', aadhaar);
        formData.append('document', aadhaarFile);

        try {
            const res = await api.patch('/user/data/kyc', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.success) {
                await refreshUserProfile();
                addNotification('Success', 'KYC submitted successfully!', 'success');
                navigate('/user/auth/pending');
            }
        } catch (err) {
            console.error('KYC Submission Error:', err);
            const rawMsg = err.response?.data?.message || err.message || 'Failed to submit KYC.';
            setError(rawMsg.replace(/Error:/gi, 'Note:'));
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const windowStart = formatTime12h(settings?.kycWindowStart) || '07:00 AM';
    const windowEnd = formatTime12h(settings?.kycWindowEnd) || '07:00 PM';
    const canSubmitKyc = isWithinKycWindow && !loading;

    return (
        <div className="min-h-screen bg-[#FCF8F5] text-slate-900 font-poppins flex flex-col">
            <style>
                {`
                    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                    .animate-modal { animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                `}
            </style>

            {showErrorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40">
                    <div className="bg-white w-full max-w-[300px] rounded-2xl p-6 shadow-2xl animate-modal flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-[#FFF5F0] rounded-2xl flex items-center justify-center mb-4" style={{ color: ACCENT }}>
                            <Info size={26} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Attention</h2>
                        <p className="text-slate-500 text-[12px] font-medium leading-relaxed mb-6">{error}</p>
                        <button
                            type="button"
                            onClick={() => setShowErrorModal(false)}
                            className="w-full text-white font-semibold uppercase text-[11px] tracking-wide py-3 rounded-xl active:scale-95"
                            style={{ backgroundColor: ACCENT }}
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[430px] mx-auto px-5 pt-4 pb-8 flex-1 flex flex-col">
                <div className="relative flex items-center justify-center min-h-[36px] mb-4">
                    <button
                        type="button"
                        onClick={() => navigate('/user/home')}
                        className="absolute left-0 w-9 h-9 flex items-center justify-center text-slate-900 active:scale-90"
                    >
                        <ArrowLeft size={22} strokeWidth={2.2} />
                    </button>
                    <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">KYC Verification</h1>
                </div>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative mb-2.5">
                        <div className="absolute inset-0 rounded-full bg-[#462211]/15 blur-xl scale-125" />
                        <div className="relative w-14 h-14 rounded-2xl bg-[#462211] flex items-center justify-center shadow-[0_8px_20px_rgba(70,34,17,0.28)]">
                            <ShieldCheck size={28} className="text-white" strokeWidth={2.2} />
                        </div>
                    </div>
                    <p className="text-[15px] font-bold text-slate-900">100% Secure & Trusted Platform</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Your security is our top priority</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">Aadhaar Card Number</label>
                        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3 focus-within:border-[#462211] transition-colors">
                            <CreditCard size={18} className="text-slate-400 shrink-0" />
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="Enter 12 digit Aadhaar number"
                                value={aadhaar}
                                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                className="flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">Aadhaar Card Photo</label>
                        <label
                            htmlFor="kyc-upload"
                            className="relative block cursor-pointer rounded-2xl border border-dashed border-slate-300 hover:border-[#462211] transition-colors overflow-hidden"
                        >
                            {!aadhaarFile ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-1.5">
                                    <UploadCloud size={32} style={{ color: ACCENT }} strokeWidth={1.8} />
                                    <p className="text-[13px] font-bold text-slate-800">Upload Aadhaar Card Photo</p>
                                    <p className="text-[11px] text-slate-400">JPG, PNG (Max. 5MB)</p>
                                </div>
                            ) : (
                                <div className="relative h-36 group">
                                    {previewUrl && (
                                        <img src={previewUrl} alt="Aadhaar preview" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={22} className="text-white" />
                                        <span className="text-[11px] text-white font-semibold mt-1">Change Photo</span>
                                    </div>
                                </div>
                            )}
                        </label>
                        <input
                            id="kyc-upload"
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmitKyc}
                        className="w-full disabled:opacity-50 text-white font-bold uppercase text-[13px] tracking-wide py-3.5 rounded-xl active:scale-[0.99] flex items-center justify-center gap-2 mt-1 shadow-[0_8px_18px_rgba(70,34,17,0.28)]"
                        style={{ backgroundColor: ACCENT }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (isWithinKycWindow ? 'SUBMIT KYC' : 'KYC CLOSED NOW')}
                    </button>

                    <p className="flex items-center justify-center gap-1.5 text-[12px] text-slate-500 -mt-1">
                        <Clock size={13} className="text-slate-400" />
                        KYC Timing:{' '}
                        <span className="font-bold" style={{ color: ACCENT }}>{windowStart} – {windowEnd}</span>
                        <span>(Daily, IST)</span>
                    </p>
                    {!isWithinKycWindow && (
                        <p className="text-center text-[11px] font-medium text-[#B3591C] -mt-1">
                            Submissions are closed right now. Come back during KYC hours.
                        </p>
                    )}
                </form>

                <div className="mt-5 rounded-2xl bg-[#FDF4EC] px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-5 h-5 rounded-full border border-[#462211] text-[#462211] flex items-center justify-center shrink-0">
                            <Info size={11} strokeWidth={2.5} />
                        </span>
                        <h2 className="text-[13px] font-bold text-slate-900">Important Notes</h2>
                    </div>
                    <ul className="space-y-1.5">
                        {IMPORTANT_NOTES.map((note) => (
                            <li key={note} className="flex items-start gap-2 text-[12px] text-slate-600 leading-snug">
                                <span className="mt-[5px] w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ backgroundColor: ACCENT }} />
                                {note}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default KycSetup;
