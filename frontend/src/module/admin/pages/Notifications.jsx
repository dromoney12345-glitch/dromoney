import React, { useState, useEffect } from 'react';
import { Send, Bell, Users, Loader2, Trash2, Clock, History as HistoryIcon, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';

const Notifications = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [userStats, setUserStats] = useState({ totalActive: 0 });

    // Toast state
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/admin/notifications');
            if (res.success) {
                // Sorting is already descending from backend, but double checking here
                const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setHistory(sorted);
            }
        } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/dashboard/stats');
            if (res.success && res.data.stats) {
                // Find the Active Users card in the stats array
                const activeUserCard = res.data.stats.find(s => s.label === 'Active Users');
                const count = activeUserCard ? parseInt(activeUserCard.value.replace(/,/g, '')) : 0;
                setUserStats({ totalActive: count });
            }
        } catch (err) { console.error(err); }
    };

    const handleSend = async () => {
        if (!title || !message) return;
        setLoading(true);
        try {
            const res = await api.post('/admin/notifications', { title, message });
            if (res.success) {
                setSent(true);
                setTimeout(() => setSent(false), 3000);
                setTitle('');
                setMessage('');
                showToast("Broadcast message sent successfully!", "success");
                fetchHistory();
            }
        } catch (err) {
            showToast("Failed to send broadcast", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notification?")) return;
        try {
            const res = await api.delete(`/admin/notifications/${id}`);
            if (res.success) {
                setHistory(prev => prev.filter(n => n._id !== id));
                showToast("Notification deleted successfully!", "success");
            }
        } catch (err) {
            showToast("Delete failed", "error");
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to clear the entire broadcast history? This cannot be undone.")) return;
        try {
            const res = await api.delete('/admin/notifications/bulk/clear');
            if (res.success) {
                setHistory([]);
                showToast("Broadcast history cleared successfully!", "success");
            }
        } catch (err) {
            showToast("Clear failed", "error");
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
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                    ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{toast.message}</span>
                </div>
            )}
            <PageHeader title="Notifications" subtitle="Broadcast messages to all platform users" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Compose */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h2 className="text-sm font-medium text-slate-800 uppercase tracking-normal mb-5 flex items-center gap-2">
                        <Bell size={16} className="text-sky-500" /> Compose Message
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-normal">Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Special Weekend Offer!"
                                className="mt-2 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[14px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-normal">Message</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)}
                                placeholder="Write your broadcast message here..."
                                rows={4}
                                className="mt-2 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[14px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none" />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                            <Users size={16} className="text-sky-500 shrink-0" />
                            <p className="text-[12px] font-bold text-sky-700">Will be sent to <span className="font-medium">{userStats.totalActive.toLocaleString()} users</span></p>
                        </div>
                        <button 
                            disabled={loading}
                            onClick={handleSend}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-[12px] uppercase tracking-normal transition-all active:scale-95 shadow-md ${sent ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-900 hover:bg-black text-white shadow-sky-100'}`}>
                            {loading ? <Loader2 size={15} className="animate-spin" /> : sent ? '✓ Sent Successfully!' : <><Send size={15} /> Send Broadcast</>}
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                        <h2 className="text-sm font-medium text-slate-800 uppercase tracking-normal flex items-center gap-2">
                            <HistoryIcon size={16} className="text-slate-400" /> Broadcast History
                        </h2>
                        {history.length > 0 && (
                            <button 
                                onClick={handleClearAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                                title="Clear all history"
                            >
                                <Trash2 size={12} /> Clear All
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {history.length > 0 ? history.map((n) => (
                            <div key={n._id} className="p-8 hover:bg-slate-50/60 transition-all group/item border-l-4 border-l-sky-200 hover:border-l-sky-400">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-slate-800 text-[20px] leading-tight mb-3">{n.title}</h3>
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Clock size={16} />
                                            <span className="text-[13px] font-bold uppercase tracking-wide">
                                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(n._id)}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover/item:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <p className="text-[16px] text-slate-700 font-medium leading-relaxed pr-4 mb-5 line-height-loose">{n.message}</p>
                                <div className="mt-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-sky-50 rounded-lg border border-sky-100">
                                        <Users size={16} className="text-sky-500" />
                                        <span className="text-[13px] font-medium text-sky-600 uppercase tracking-wide">{n.recipients?.toLocaleString()} Recipients</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-20 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                    <Bell size={28} className="text-slate-200" />
                                </div>
                                <p className="text-sm font-medium text-slate-300 uppercase tracking-normal leading-none">No Broadcast History</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
