import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Pencil, User, ShieldCheck, Users, Headset, MessageSquare,
    ChevronRight, LogOut, Mail, Phone, Flag, Loader2, X, Send
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import KycModal from '../components/KycModal';
import ReferralsModal from '../components/ReferralsModal';
import FeedbackModal from '../components/FeedbackModal';
import EditProfileModal from '../components/EditProfileModal';

const kycDisplay = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved' || s === 'verified') return { text: 'Verified', color: 'text-emerald-600' };
    if (s === 'pending') return { text: 'Pending', color: 'text-amber-600' };
    if (s === 'rejected') return { text: 'Rejected', color: 'text-rose-600' };
    return { text: 'Not Started', color: 'text-slate-400' };
};

const Profile = () => {
    const navigate = useNavigate();
    const { userData, addNotification, updateProfileImage, updateProfileData, logout, refreshUserProfile } = useUser();
    const { name, id, email, phone, referrals, profileImage, kycStatus } = userData;
    const [isUploading, setIsUploading] = useState(false);
    const [isKycOpen, setIsKycOpen] = useState(false);
    const [isReferralsOpen, setIsReferralsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportText, setReportText] = useState('');
    const [isSendingReport, setIsSendingReport] = useState(false);

    const inviteCount = Number(referrals?.count || 0);
    const kyc = kycDisplay(kycStatus);

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
                addNotification('Success!', 'Profile photo updated and saved.', 'success');
            }
        } catch (err) {
            console.error(err);
            addNotification('Sync Error', 'Photo failed to save on server.', 'warning');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/user/auth/login');
    };

    const handleSendReport = async () => {
        if (!reportText.trim()) return;
        setIsSendingReport(true);
        try {
            const res = await api.post('/user/data/reports', { message: reportText });
            if (res.success) {
                setReportText('');
                setIsReportOpen(false);
                addNotification('Problem Reported!', 'Our technical team will investigate soon.', 'success');
            }
        } catch (err) {
            addNotification('Error', 'Failed to send report. Try again.', 'error');
        } finally {
            setIsSendingReport(false);
        }
    };

    const menuItems = [
        { label: 'Help & Support', icon: Headset, iconBg: 'bg-sky-50', iconColor: 'text-sky-500', onClick: () => navigate('/user/help') },
        { label: 'App Feedback', icon: MessageSquare, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', onClick: () => setIsFeedbackOpen(true) },
        { label: 'Report', icon: Flag, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', onClick: () => setIsReportOpen(true) },
        { label: 'Logout Account', icon: LogOut, iconBg: 'bg-[#FFF5F0]', iconColor: 'text-[#462211]', textColor: 'text-[#462211]', onClick: handleLogout },
    ];

    return (
        <div className="flex flex-col min-h-full bg-[#FCF8F5] font-poppins px-3 pt-2 pb-6">
            <KycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />
            <ReferralsModal isOpen={isReferralsOpen} onClose={() => setIsReferralsOpen(false)} referralCount={inviteCount} />
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
            <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} userData={userData} updateProfileData={updateProfileData} addNotification={addNotification} />

            {isReportOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsReportOpen(false)} />
                    <div className="relative w-full max-w-md mx-3 mb-4 bg-white rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-medium text-slate-800 tracking-tight uppercase">Report a problem</h3>
                            <button type="button" onClick={() => setIsReportOpen(false)} className="text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <textarea
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Describe the issue..."
                            className="w-full h-28 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#462211] resize-none"
                        />
                        <button
                            type="button"
                            onClick={handleSendReport}
                            disabled={isSendingReport || !reportText.trim()}
                            className="mt-3 w-full bg-[#462211] disabled:opacity-50 text-white font-medium text-[11px] uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2"
                        >
                            {isSendingReport ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                            Submit Report
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl px-3.5 py-3.5 flex items-center gap-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] mb-2.5">
                <div className="relative shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-slate-100">
                        {profileImage ? (
                            <img src={profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#FFF5F0] text-[#462211] text-2xl font-medium">
                                {(name || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                                <Loader2 size={20} className="animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <label
                        htmlFor="profile-upload"
                        className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full shadow border border-slate-100 flex items-center justify-center cursor-pointer active:scale-90"
                    >
                        <Pencil size={11} className="text-slate-500" />
                    </label>
                    <input id="profile-upload" type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>
                <button type="button" onClick={() => setIsEditProfileOpen(true)} className="text-left min-w-0">
                    <h1 className="text-[18px] font-medium text-slate-800 tracking-tight leading-tight truncate">{name || 'User'}</h1>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">Welcome back!</p>
                </button>
            </div>

            <div className="bg-white rounded-2xl px-3.5 py-2 shadow-[0_4px_16px_rgba(15,23,42,0.05)] mb-2.5 divide-y divide-slate-100">
                <div className="flex items-center gap-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                        <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="text-[13px] font-medium text-slate-600 truncate">{email || '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#FFF5F0] text-[#462211] flex items-center justify-center shrink-0">
                        <Phone size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Mobile Number</p>
                        <p className="text-[13px] font-medium text-slate-600">{phone || '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">User ID</p>
                        <p className="text-[13px] font-medium text-slate-800">{id || '—'}</p>
                    </div>
                    <span className="text-[8px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest shrink-0">Permanent</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <button
                    type="button"
                    onClick={() => setIsKycOpen(true)}
                    className="bg-white rounded-2xl px-3 py-3 text-left shadow-[0_4px_16px_rgba(15,23,42,0.05)] active:scale-[0.99]"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                            <ShieldCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[13px] font-medium text-slate-800 leading-tight">KYC Status</p>
                                <p className={`text-[8px] font-medium uppercase tracking-wider mt-1 ${kyc.color}`}>{kyc.text}</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 mt-1" />
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (refreshUserProfile) refreshUserProfile(false);
                        setIsReferralsOpen(true);
                    }}
                    className="bg-white rounded-2xl px-3 py-3 text-left shadow-[0_4px_16px_rgba(15,23,42,0.05)] active:scale-[0.99]"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                            <Users size={18} className="text-sky-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[13px] font-medium text-slate-800 leading-tight">My Invites</p>
                                <p className="text-[8px] font-medium text-sky-600 uppercase tracking-wider mt-1">
                                    {inviteCount} {inviteCount === 1 ? 'Invite' : 'Invites'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 mt-1" />
                    </div>
                </button>
            </div>

            <div className="bg-white rounded-2xl px-2 py-1 shadow-[0_4px_16px_rgba(15,23,42,0.05)] divide-y divide-slate-100">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.onClick}
                            className="w-full flex items-center gap-3 px-2 py-3 text-left active:bg-slate-50"
                        >
                            <div className={`w-9 h-9 rounded-full ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                                <Icon size={16} />
                            </div>
                            <span className={`flex-1 text-[13px] font-medium ${item.textColor || 'text-slate-800'}`}>{item.label}</span>
                            <ChevronRight size={16} className="text-slate-300" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Profile;
