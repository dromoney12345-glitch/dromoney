import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Camera, User, Award, CheckCircle2, 
    ShieldCheck, Users, Headset, MessageSquare, 
    ChevronRight, LogOut, Image as ImageIcon, Loader2 
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api'; 
import UnlockModal from '../components/UnlockModal';
import KycModal from '../components/KycModal';
import ReferralsModal from '../components/ReferralsModal';
import FeedbackModal from '../components/FeedbackModal';
import { openGallery } from '../../../imageUploadUtils';

const Profile = () => {
    const navigate = useNavigate();
    const galleryInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);
    const { userData, addNotification, updateProfileImage, logout } = useUser();
    const { name, id, referrals, isPaid, profileImage, kycStatus } = userData;
    const [isUploading, setIsUploading] = useState(false);
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [isKycOpen, setIsKycOpen] = useState(false);
    const [isReferralsOpen, setIsReferralsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const defaultRealImage = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&q=80&fit=crop";

    const handleAction = (title) => {
        if (title === 'Help & Support') { navigate('/user/help'); return; }
        if (title === 'KYC Status') { setIsKycOpen(true); return; }
        
        if (!isPaid) {
            setIsUnlockOpen(true);
            return;
        }
        if (title === 'App Feedback') { setIsFeedbackOpen(true); return; }
        if (title === 'My Referrals') { setIsReferralsOpen(true); return; }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Instant Preview
            const reader = new FileReader();
            reader.onloadend = () => updateProfileImage(reader.result);
            reader.readAsDataURL(file);
            
            setIsUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('photo', file);
                const res = await api.patch('/user/data/photo', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.success) {
                    updateProfileImage(res.data);
                    addNotification("Success!", "Profile photo updated and saved.", "success");
                }
            } catch (err) {
                console.error(err);
                addNotification("Sync Error", "Photo failed to save on server.", "warning");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const triggerGalleryUpload = () => {
        openGallery({
            onSelectFile: (file) => {
                const e = { target: { files: [file] } };
                handleImageChange(e);
            }
        });
    };

    const triggerCameraUpload = () => {
        if (cameraInputRef.current) cameraInputRef.current.click();
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F1F9F3] pb-24 relative overflow-hidden">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
            <KycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />
            <ReferralsModal isOpen={isReferralsOpen} onClose={() => setIsReferralsOpen(false)} referralCount={referrals.count} />
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

            {/* Ultra-Compact Header Row - Navy Blue Theme */}
            <div className="relative h-16 bg-gradient-to-br from-[#0B1221] to-[#1E293B] rounded-b-3xl shadow-lg overflow-hidden mb-4 flex items-center px-5">
                {/* Decorative Elements */}
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none">
                    <User size={100} className="text-white" />
                </div>
                
                {/* Compact Row: Back + Title */}
                <div className="flex items-center gap-3 relative z-20 w-full">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-8 h-8 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-lg text-white active:scale-90 transition-all border border-white/10"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex flex-col">
                        <p className="text-blue-400 text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                            Account Settings
                        </p>
                        <h1 className="text-base font-black text-white tracking-tight leading-none uppercase">
                            Your Profile
                        </h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-4">
                {/* ── Profile Avatar Section ── */}
                <div className="flex flex-col items-center py-2">
                    <div className="relative mb-4">

                        <div className="w-24 h-24 bg-[#0B1221] rounded-[1.75rem] flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-slate-200 overflow-hidden border-[3px] border-white relative group">
                            <img src={profileImage || defaultRealImage} alt="Profile" className="w-full h-full object-cover" />
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <div 
                                onClick={triggerGalleryUpload}
                                className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            >
                                <ImageIcon size={20} className="text-white" />
                            </div>
                        </div>
                        
                        <button 
                            onClick={triggerGalleryUpload}
                            className="absolute -bottom-0.5 -right-0.5 w-8 h-8 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center cursor-pointer active:scale-90 transition-all z-20"
                        >
                            <ImageIcon size={14} className="text-slate-600" />
                        </button>
                    </div>

                    <div className="flex items-center justify-center mb-1.5">
                        <button 
                            onClick={triggerGalleryUpload}
                            className="bg-[#0B1221] px-4 py-2 rounded-lg text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                            <ImageIcon size={14} className="text-blue-400" /> Upload Photo
                        </button>
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Change Profile Photo</p>
                </div>

                {/* ── User Information Fields ── */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</p>
                        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-slate-300" />
                                <span className="text-[13px] font-bold text-slate-800">{name}</span>
                            </div>
                            <CheckCircle2 size={14} className="text-emerald-500" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">User Identification</p>
                        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <Award size={16} className="text-slate-300" />
                                <span className="text-[13px] font-bold text-slate-800">{id}</span>
                            </div>
                            <div className="bg-slate-50 px-2 py-0.5 rounded text-[8px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest">Permanent</div>
                        </div>
                    </div>
                </div>

                {/* ── Status & Verification Sections ── */}
                <div className="pt-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Verification Status</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleAction('KYC Status')}
                            className="bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm active:bg-slate-50 transition-all group relative overflow-hidden cursor-pointer"
                        >
                            <div className="absolute right-0 top-0 w-12 h-12 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-emerald-100">
                                <ShieldCheck size={20} className="text-emerald-500" />
                            </div>
                            <h4 className="text-[13px] font-bold text-slate-800 leading-tight">KYC Status</h4>
                            <p className="text-[8px] font-black text-emerald-600 uppercase mt-1 tracking-wider">{kycStatus || 'SUBMITTED'}</p>
                        </button>

                        <button 
                            onClick={() => handleAction('My Referrals')}
                            className="bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm active:bg-slate-50 transition-all group relative overflow-hidden cursor-pointer"
                        >
                            <div className="absolute right-0 top-0 w-12 h-12 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-blue-100">
                                <Users size={20} className="text-blue-500" />
                            </div>
                            <h4 className="text-[13px] font-bold text-slate-800 leading-tight">My Referrals</h4>
                            <p className="text-[8px] font-black text-blue-600 uppercase mt-1 tracking-wider">{referrals.count} ACTIVE</p>
                        </button>
                    </div>
                </div>

                {/* ── Support Actions ── */}
                <div className="space-y-2.5">
                    <button 
                        onClick={() => handleAction('Help & Support')}
                        className="w-full bg-white border border-slate-100 rounded-xl p-3.5 flex items-center justify-between shadow-sm active:bg-slate-50 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                <Headset size={18} />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[13px] font-bold text-slate-800 leading-none">Help & Support</h4>
                                <p className="text-[9px] font-medium text-slate-400 mt-1">24/7 technical assistance</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                    </button>

                    <button 
                        onClick={() => handleAction('App Feedback')}
                        className="w-full bg-white border border-slate-100 rounded-xl p-3.5 flex items-center justify-between shadow-sm active:bg-slate-50 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                <MessageSquare size={18} />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[13px] font-bold text-slate-800 leading-none">App Feedback</h4>
                                <p className="text-[9px] font-medium text-slate-400 mt-1">Tell us how to improve</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                    </button>
                </div>

                {/* ── Logout Button ── */}
                <div className="pt-2">
                    <button 
                        onClick={logout}
                        className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        <LogOut size={18} className="text-rose-500" /> Logout Account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
