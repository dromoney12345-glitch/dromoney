import React, { useState, useRef } from 'react';
import { X, ShieldCheck, CheckCircle2, FileText, Clock, AlertCircle, Camera, Upload, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
const KycModal = ({ isOpen, onClose }) => {
    const { userData, addNotification, refreshUserProfile } = useUser();
    const [submitting, setSubmitting] = useState(false);
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const [settings, setSettings] = useState(null);
    const [isWithinKycWindow, setIsWithinKycWindow] = useState(true);

    const status = (userData?.kycStatus || 'Not Started').toLowerCase();

    React.useEffect(() => {
        if (!isOpen) return;
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setSettings(res.data);
                    checkKycWindow(res.data.kycWindowStart, res.data.kycWindowEnd);
                }
            } catch (err) {}
        };
        fetchSettings();
    }, [isOpen]);

    const checkKycWindow = (startStr, endStr) => {
        if (!startStr || !endStr) return;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = startStr.split(':').map(Number);
        const startMins = (sh || 0) * 60 + (sm || 0);
        const [eh, em] = endStr.split(':').map(Number);
        const endMins = (eh || 0) * 60 + (em || 0);
        if (startMins < endMins) {
            setIsWithinKycWindow(currentMins >= startMins && currentMins <= endMins);
        }
    };

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // On mobile, file.type can be empty or application/octet-stream for HEIC/HEIF files
        const isImage = !file.type || file.type.startsWith('image/') || file.type === 'application/octet-stream';
        const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
        const allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'bmp', 'tiff', 'jfif', 'pjpeg', 'pjp', 'avif', ''];

        if (!isImage && !allowedExts.includes(ext)) {
            window.alert("Invalid Format!\n\nPlease select a valid image file (All image formats like JPEG, PNG, WEBP, HEIC, HEIF, etc. are accepted).");
            addNotification("Invalid Format", "Please select a valid image (All image formats are accepted)!", "error");
            e.target.value = '';
            return;
        }

        // Limit to 5MB
        if (file.size > 5 * 1024 * 1024) {
            window.alert("File Too Large!\n\nAadhaar photo must be under 5MB.");
            addNotification("File Too Large", "Aadhaar photo must be under 5MB!", "error");
            e.target.value = '';
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!aadhaarNumber || !selectedFile) {
            addNotification("Missing Info", "Please provide Aadhaar number and photo.", "warning");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('documentNumber', aadhaarNumber);
            formData.append('document', selectedFile);

            const res = await api.patch('/user/data/kyc', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.success) {
                addNotification("Submitted!", "KYC documents sent for verification.", "success");
                await refreshUserProfile();
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to submit KYC. Try again.", "warning");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Dynamic UI Config based on status ---
    const config = {
        approved: {
            title: 'KYC Verified',
            subtitle: 'Account is 100% secure',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            iconBg: 'bg-emerald-100 text-emerald-500',
            icon: ShieldCheck,
            buttonBg: 'bg-emerald-500 hover:bg-emerald-600',
            statusText: 'Verified'
        },
        pending: {
            title: 'Under Review',
            subtitle: 'Expect update within 24 hours',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            iconBg: 'bg-amber-100 text-amber-500',
            icon: Clock,
            buttonBg: 'bg-amber-500 hover:bg-amber-600',
            statusText: 'Pending'
        },
        rejected: {
            title: 'KYC Rejected',
            subtitle: userData?.kycRejectionReason || 'Documents were not clear',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            iconBg: 'bg-rose-100 text-rose-500',
            icon: AlertCircle,
            buttonBg: 'bg-rose-500 hover:bg-rose-600',
            statusText: 'Rejected'
        }
    }[status] || {
        title: 'KYC Required',
        subtitle: 'Complete KYC to withdraw funds',
        bg: 'bg-slate-50',
        border: 'border-slate-100',
        iconBg: 'bg-slate-100 text-slate-400',
        icon: ShieldCheck,
        buttonBg: 'bg-slate-900 hover:bg-black',
        statusText: 'Not Started'
    };

    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            
            <div className={`relative bg-white w-full max-w-xs rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border ${config.border}`}>
                <div className={`p-6 ${config.bg} border-b ${config.border} flex justify-between items-start`}>
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 ${config.iconBg} rounded-2xl flex items-center justify-center shadow-inner`}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-800 text-lg tracking-tight leading-tight">{config.title}</h3>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium mt-0.5">{config.subtitle}</p>
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    {!isWithinKycWindow && (status === 'not started' || status === 'rejected') ? (
                        <div className="p-6 text-center space-y-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Clock className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-[15px] font-medium text-slate-800 tracking-tight">KYC Submissions Closed</h3>
                            <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                                KYC submissions are only accepted between <span className="text-emerald-600 font-semibold">{settings?.kycWindowStart}</span> and <span className="text-emerald-600 font-semibold">{settings?.kycWindowEnd}</span>.
                            </p>
                        </div>
                    ) : status === 'not started' || status === 'rejected' ? (
                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Aadhaar Number</label>
                                <input 
                                    type="text" 
                                    value={aadhaarNumber}
                                    onChange={(e) => setAadhaarNumber(e.target.value)}
                                    placeholder="12-digit Aadhaar Number"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Front Photo</label>
                                <label 
                                    htmlFor="kyc-modal-upload"
                                    className="w-full aspect-[16/9] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative"
                                >
                                    {previewUrl ? (
                                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <>
                                            <Camera size={24} className="text-slate-300 mb-2" />
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">Click to Upload</span>
                                        </>
                                    )}
                                </label>
                                <input 
                                    id="kyc-modal-upload"
                                    type="file" 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 flex items-center justify-between bg-slate-50/50 rounded-3xl mx-1 my-1 border border-black/[0.03]">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-black/[0.03]">
                                    <FileText className="text-slate-400" size={18} />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-800 text-[13px]">Identity Verification</span>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Aadhaar Authentication</p>
                                </div>
                            </div>
                            {status === 'approved' || status === 'verified' ? (
                                <CheckCircle2 size={20} className="text-emerald-500" strokeWidth={3} />
                            ) : (
                                <Clock size={20} className="text-amber-500 animate-pulse" />
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-slate-50">
                    {!isWithinKycWindow && (status === 'not started' || status === 'rejected') ? (
                        <button 
                            onClick={onClose}
                            className={`w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[12px] uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all`}
                        >
                            Understood
                        </button>
                    ) : status === 'not started' || status === 'rejected' ? (
                        <button 
                            onClick={handleSubmit} 
                            disabled={submitting}
                            className={`w-full py-4 bg-slate-900 hover:bg-black text-white font-medium text-[12px] uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2`}
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit KYC'} <Upload size={16} />
                        </button>
                    ) : (
                        <button onClick={onClose} className={`w-full py-4 ${config.buttonBg} text-white font-medium text-[12px] uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2`}>
                            {status === 'approved' ? 'Great, Close' : 'Understood'} <Icon size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KycModal;
