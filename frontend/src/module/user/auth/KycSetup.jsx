import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, UploadCloud, Camera, ArrowLeft, Info, Fingerprint, Lock, BadgeCheck } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

const KycSetup = () => {
    const navigate = useNavigate();
    const { userData, addNotification, refreshUserProfile, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(false);
    const [aadhaar, setAadhaar] = useState('');
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [error, setError] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const fileInputRef = React.useRef(null);

    const kycStatus = (userData?.kycStatus || '').toLowerCase();

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
    );

    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // On mobile, file.type can be empty or application/octet-stream for HEIC/HEIF files
        const isImage = !file.type || file.type.startsWith('image/') || file.type === 'application/octet-stream';
        const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
        const allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'bmp', 'tiff', 'jfif', 'pjpeg', 'pjp', 'avif', ''];
        
        if (!isImage && !allowedExts.includes(ext)) {
            setError("Note: Incorrect image format! Please upload a valid image file (All image formats like JPEG, PNG, WEBP, HEIC, HEIF, etc. are accepted).");
            setShowErrorModal(true);
            e.target.value = '';
            setAadhaarFile(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Note: File is too large! Maximum limit is 5MB.");
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

        if (aadhaar.length < 12) {
            setError("Note: Aadhaar number must be exactly 12 digits.");
            setShowErrorModal(true);
            return;
        }

        if (!aadhaarFile) {
            setError("Note: Please upload your document photo first.");
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
                addNotification("Success", "KYC submitted successfully!", "success");
                navigate('/user/auth/pending');
            }
        } catch (err) {
            console.error('KYC Submission Error:', err);
            const rawMsg = err.response?.data?.message || err.message || "Failed to submit KYC.";
            const userFriendlyMsg = rawMsg.replace(/Error:/gi, 'Note:');
            setError(userFriendlyMsg);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-outfit">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;700;900&display=swap');
                    .font-outfit { font-family: 'Outfit', sans-serif; }
                    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                    .animate-modal { animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                `}
            </style>

            {/* Note Pop-up (Compact) */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-[300px] rounded-[32px] p-6 shadow-2xl animate-modal flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                            <Info size={28} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Attention</h2>
                        <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-6">
                            {error}
                        </p>
                        <button 
                            onClick={() => setShowErrorModal(false)}
                            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-[0.2em] py-3.5 rounded-xl transition-all active:scale-95"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}

            {/* BG Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
                <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-amber-100 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-100 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center">
                {/* Header (Compact) */}
                <div className="w-full flex items-center justify-between mb-4 px-2">
                    <button 
                        onClick={() => navigate('/user/home')} 
                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 shadow-sm active:scale-90 transition-all"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-50 shadow-sm">
                        <BadgeCheck size={14} className="text-amber-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secured</span>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-lg border border-slate-50 mb-3">
                        <Fingerprint size={24} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight font-outfit">Identity Setup</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mt-1">Unlock account withdrawals</p>
                </div>

                {/* Main Card (Compact) */}
                <form 
                    onSubmit={handleSubmit} 
                    className="bg-white w-full p-5 rounded-[32px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] border border-white flex flex-col gap-6"
                >
                    {/* Compact Operating Hours */}
                    <div className="bg-slate-50/80 px-4 py-2 rounded-2xl flex items-center justify-between border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service</span>
                        <span className="text-[10px] font-black text-amber-600">07:00 AM — 07:00 PM</span>
                    </div>

                    <div className="space-y-6">
                        {/* Aadhaar Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Aadhaar Card</label>
                                <Lock size={10} className="text-slate-300" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="0000 0000 0000"
                                value={aadhaar}
                                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                className="w-full bg-slate-50/50 text-slate-900 font-black tracking-[0.25em] px-5 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all text-base font-outfit"
                                required
                            />
                        </div>
                        
                        {/* Upload area (More compact) */}
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1">Photo Upload</label>
                            <div 
                                onClick={triggerFileSelect}
                                className="relative group cursor-pointer border-2 border-dashed border-slate-100 hover:border-amber-500/30 rounded-2xl p-1 bg-slate-50/30 transition-all overflow-hidden"
                            >
                                {!aadhaarFile ? (
                                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-300 transition-all">
                                            <UploadCloud size={20} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Select Image</p>
                                            <p className="text-[8px] text-slate-400 font-bold">All Image Formats (Max 5MB)</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-inner">
                                        {previewUrl && (
                                            <img 
                                                src={previewUrl} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[2px]">
                                            <Camera size={20} className="text-white" />
                                            <span className="text-[9px] text-white font-black uppercase tracking-widest mt-1">Change</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-30 text-white font-black uppercase text-[11px] tracking-[0.2em] py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-slate-200 font-outfit"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : (
                                <>
                                    <span>Submit KYC</span>
                                    <ShieldCheck size={14} />
                                </>
                            )}
                        </button>
                        <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-wider">
                            Encrypted & Secure Submission
                        </p>
                    </div>
                </form>

                <div className="mt-8">
                    <button 
                        onClick={() => navigate('/user/help')} 
                        className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] hover:text-amber-600 transition-colors"
                    >
                        Need Help? Contact Support
                    </button>
                </div>
            </div>

            {/* Hidden Input */}
            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default KycSetup;
