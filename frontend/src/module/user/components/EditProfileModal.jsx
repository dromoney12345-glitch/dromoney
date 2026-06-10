import React, { useState, useEffect } from 'react';
import { X, User, Mail, Loader2 } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, userData, updateProfileData, addNotification }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userData) {
            setFormData({
                name: userData.name || '',
                email: userData.email || '',
                phone: userData.phone || ''
            });
        }
    }, [isOpen, userData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateProfileData(formData);
        setLoading(false);
        if (res.success) {
            addNotification('Success', 'Profile updated successfully', 'success');
            onClose();
        } else {
            addNotification('Error', res.error, 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-poppins">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#0B1221] px-5 py-4 flex items-center justify-between">
                    <h3 className="text-white font-medium tracking-wide uppercase text-[13px]">Edit Profile</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-50 text-slate-800 font-medium px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:bg-white transition-all text-[12px]"
                                required
                            />
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-slate-50 text-slate-800 font-medium px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:bg-white transition-all text-[12px]"
                                required
                            />
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative">
                            <input
                                type="tel"
                                value={formData.phone}
                                readOnly
                                className="w-full bg-slate-100 text-slate-400 font-medium px-4 py-2.5 rounded-xl border border-slate-200 text-[12px] cursor-not-allowed select-none"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <p className="text-[9px] text-slate-400 ml-1">Phone number cannot be changed</p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl text-[12px] font-medium shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
