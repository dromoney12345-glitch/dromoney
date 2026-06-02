import React, { useState, useEffect } from 'react';
import { Megaphone, Trash2, CheckCircle2, MessageSquare, Clock, User, Phone, Globe, DollarSign, Users, X, Send, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';

const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [adminMsg, setAdminMsg] = useState('');

    // Toast state
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/promotions');
            if (response.success) {
                const mapped = response.data.map(p => ({
                    id: p._id,
                    name: p.brandName || p.user?.name || 'Unknown',
                    mobile: p.mobile || p.user?.phone || 'N/A',
                    whatsapp: p.whatsapp || p.whatsappNumber || 'N/A',
                    category: p.category || p.taskType || 'N/A',
                    budget: p.budget,
                    usersRequired: p.usersRequired || p.targetUsers || 0,
                    link: p.brandLink || p.taskLink || '#',
                    description: p.description,
                    status: p.status,
                    date: new Date(p.createdAt).toLocaleDateString(),
                    adminResponse: p.adminResponse
                }));
                setPromotions(mapped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deletePromo = async (id) => {
        if (window.confirm("Are you sure you want to delete this brand request?")) {
            try {
                const response = await api.delete(`/admin/content/promotion/${id}`);
                if (response.success) {
                    showToast("Promotion deleted successfully!", "success");
                    fetchPromotions();
                }
            } catch (err) {
                showToast(err.message || "Failed to delete promotion", "error");
            }
        }
    };

    const updateStatus = async (id, newStatus) => {
        // Optimistically update status in local state for instant UI response
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        try {
            const response = await api.put(`/admin/promotions/${id}`, { status: newStatus });
            if (response.success) {
                fetchPromotions();
                showToast(`Status updated to ${newStatus}`, "success");
            }
        } catch (err) {
            fetchPromotions(); // Revert back on error
            showToast(err.message || "Something went wrong", "error");
        }
    };

    const handleMessageSubmit = async () => {
        if (!adminMsg) return;
        const targetId = selectedPromo.id;
        // Optimistically update status and adminResponse in local state
        setPromotions(prev => prev.map(p => p.id === targetId ? { ...p, status: 'Contacted', adminResponse: adminMsg } : p));
        try {
            const response = await api.put(`/admin/promotions/${targetId}`, { 
                status: 'Contacted',
                adminResponse: adminMsg 
            });
            if (response.success) {
                fetchPromotions();
                setIsMsgModalOpen(false);
                setAdminMsg('');
                showToast("Message sent to user and status updated!", "success");
            }
        } catch (err) {
            fetchPromotions(); // Revert back on error
            showToast(err.message || "Something went wrong", "error");
        }
    };

    return (
        <div className="p-6 animate-in fade-in duration-500 relative">
            {toast && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{toast.message}</span>
                </div>
            )}

            <PageHeader title="Brand Promotions" subtitle="Review and manage brand promotion requests from users" />

            {promotions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-20 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Megaphone size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-slate-800 font-medium text-lg">No promotion requests yet</h3>
                    <p className="text-slate-400 font-medium text-sm">When users fill the Promote Your Brand form, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {promotions.map((promo) => (
                        <div key={promo.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-sky-100 transition-all border-l-[6px] border-l-sky-500">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                
                                {/* Info Section */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-sky-50 p-2.5 rounded-xl">
                                            <User size={20} className="text-sky-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-lg leading-none">{promo.name}</h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mt-1.5 flex items-center gap-1">
                                                <Clock size={12} /> Requested on {promo.date}
                                            </p>
                                        </div>
                                        <span className={`ml-auto md:ml-4 text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-tighter ${
                                            promo.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 
                                            promo.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                                            promo.status === 'Rejected' ? 'bg-rose-100 text-rose-600' :
                                            'bg-sky-100 text-sky-600'
                                        }`}>
                                            {promo.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Contact Info</p>
                                            <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {promo.mobile}</p>
                                            <p className="text-xs font-medium text-sky-600 flex items-center gap-1.5 leading-none break-all mt-1">{promo.whatsapp}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Task Type</p>
                                            <p className="text-xs font-medium text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-block">{promo.category}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Budget Details</p>
                                            <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5">₹{promo.budget}</p>
                                            <p className="text-[10px] font-medium text-slate-500">{promo.usersRequired} Users Required</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Task Link</p>
                                            <a href={promo.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-500 hover:underline flex items-center gap-1.5 truncate max-w-[150px]">
                                                <Globe size={12} /> Visit Link
                                            </a>
                                        </div>
                                    </div>

                                    {promo.description && (
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mb-2">Description</p>
                                             <p className="text-xs font-medium text-slate-600 leading-relaxed">"{promo.description}"</p>
                                        </div>
                                    )}

                                    {promo.adminResponse && (
                                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mt-2">
                                             <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-tight mb-1 flex items-center gap-1"><MessageSquare size={12}/> Your Response</p>
                                             <p className="text-xs font-medium text-emerald-800">{promo.adminResponse}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Section */}
                                <div className="flex md:flex-col gap-2.5 shrink-0 min-w-[200px]">
                                    {['pending', 'contacted'].includes(String(promo.status).toLowerCase()) ? (
                                        <>
                                            <button 
                                                onClick={() => { setSelectedPromo(promo); setIsMsgModalOpen(true); }}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 font-medium text-[10px] uppercase tracking-normal px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                <MessageSquare size={14} /> Message
                                            </button>
                                            
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => updateStatus(promo.id, 'Approved')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-[10px] uppercase tracking-normal px-4 py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 cursor-pointer"
                                                >
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => updateStatus(promo.id, 'Rejected')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-medium text-[10px] uppercase tracking-normal px-4 py-3 rounded-xl shadow-lg shadow-rose-100 transition-all active:scale-95 cursor-pointer"
                                                >
                                                    <X size={14} /> Reject
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={`flex items-center justify-center gap-2 font-medium text-[10px] uppercase tracking-[0.15em] px-4 py-3.5 rounded-xl text-center shadow-md select-none border ${
                                            ['approved', 'active'].includes(String(promo.status).toLowerCase()) 
                                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-100' 
                                                : 'bg-rose-500 border-rose-600 text-white shadow-rose-100'
                                        }`}>
                                            {['approved', 'active'].includes(String(promo.status).toLowerCase()) ? <CheckCircle2 size={14} className="animate-pulse" /> : <X size={14} />}
                                            {['approved', 'active'].includes(String(promo.status).toLowerCase()) ? 'APPROVED & LIVE' : 'REQUEST REJECTED'}
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => deletePromo(promo.id)}
                                        className="mt-2 md:mt-auto flex items-center justify-center gap-1.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 font-medium text-[10px] uppercase tracking-normal py-2 rounded-xl border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Delete Request
                                    </button>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Message Modal */}
            {isMsgModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sky-600">
                                <MessageSquare size={22} />
                                <h3 className="font-medium text-slate-800 uppercase tracking-tight">Send Message to {selectedPromo?.name}</h3>
                            </div>
                            <button onClick={() => setIsMsgModalOpen(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-6">
                            <p className="text-xs font-medium text-slate-400 mb-4 leading-relaxed">
                                This message will appear in the user's notification bell icon. You can confirm that you have added their task or ask for more details.
                            </p>
                            <textarea 
                                value={adminMsg}
                                onChange={(e) => setAdminMsg(e.target.value)}
                                placeholder="Write your message here..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none resize-none h-32 mb-6"
                            ></textarea>
                            
                            <button 
                                onClick={handleMessageSubmit}
                                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium uppercase tracking-normal py-4 rounded-2xl shadow-lg shadow-sky-200 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <Send size={18} /> Send Message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;
