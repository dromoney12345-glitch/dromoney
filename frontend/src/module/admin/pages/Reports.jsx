import React, { useState } from 'react';
import { 
    MessageSquare, AlertCircle, BookOpen, Star, 
    Trash2, Plus, Save, User, Clock, 
    CheckCircle2, ChevronDown, List, 
    MessageCircle, ExternalLink, ShieldAlert
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('problems');
    const [loading, setLoading] = useState(false);

    // ── Real Data States ──
    const [feedbacks, setFeedbacks] = useState([]);
    const [reports, setReports] = useState([]);
    const [guides, setGuides] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fRes, rRes, gRes] = await Promise.all([
                api.get('/admin/feedbacks'),
                api.get('/admin/reports'),
                api.get('/public/content/menu_help_guides')
            ]);
            
            if (fRes.success) setFeedbacks(fRes.data);
            if (rRes.success) {
                setReports(rRes.data);
                console.log(`Loaded ${rRes.data?.length || 0} reports`);
            }
            
            if (gRes.success && gRes.data && gRes.data.data) {
                setGuides(gRes.data.data.sections || []);
            }
        } catch (err) {
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateReportStatus = async (id, status) => {
        try {
            const res = await api.patch(`/admin/reports/${id}/status`, { status });
            if (res.success) {
                setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
                alert(`Report marked as ${status}`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const handleSyncGuides = async () => {
        try {
            const res = await api.post('/admin/content', {
                key: 'menu_help_guides',
                title: 'Help Guide',
                description: 'Basic Platform Usage',
                data: {
                    title: 'Help Guide',
                    subtitle: 'Basic Platform Usage',
                    sections: guides
                }
            });
            if (res.success) alert("Help Guides synced successfully!");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteFeedback = async (id) => {
        if (!window.confirm("Mark as read? This will remove it from the active list.")) return;
        try {
            const res = await api.patch(`/admin/feedbacks/${id}/read`);
            if (res.success) {
                setFeedbacks(feedbacks.filter(f => f._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    // ── Handlers ──
    const addGuide = () => setGuides([...guides, { q: 'New Question?', a: 'New answer description here...' }]);
    const deleteGuide = (idx) => setGuides(guides.filter((_, i) => idx !== i));
    const updateGuide = (idx, field, val) => {
        const newGuides = [...guides];
        newGuides[idx][field] = val;
        setGuides(newGuides);
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-6 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <PageHeader title="Interaction & Feedback" subtitle="Manage user feedbacks, technical reports, and help guides" />

            {/* Premium Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-10 mt-6 bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm w-fit">
                {[
                    { id: 'feedback', label: 'User Feedbacks', icon: MessageSquare, color: 'text-sky-500' },
                    { id: 'problems', label: 'Problem Reports', icon: ShieldAlert, color: 'text-rose-500' },
                    { id: 'guides', label: 'Help Guide CMS', icon: BookOpen, color: 'text-indigo-500' },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-[22px] font-medium text-[11px] uppercase tracking-normal transition-all ${activeTab === tab.id ? 'bg-[#0F172A] text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? 'text-white' : tab.color} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
                
                {/* ── TAB 1: USER FEEDBACKS ── */}
                {activeTab === 'feedback' && (() => {
                    const totalFeedbacks = feedbacks.length;
                    const averageRating = totalFeedbacks > 0 
                        ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / totalFeedbacks).toFixed(1)
                        : '0.0';

                    return (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Dynamic App Rating Dashboard Card */}
                            <div className="bg-white rounded-[36px] border border-slate-100 p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl">
                                {/* Average Score Section */}
                                <div className="flex flex-col items-center justify-center text-center md:border-r border-slate-100 md:pr-8 py-2">
                                    <h3 className="text-6xl font-medium text-slate-800 leading-none mb-4">{averageRating}</h3>
                                    <div className="flex gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                                key={star} 
                                                size={20} 
                                                className={`${star <= Math.round(Number(averageRating)) ? 'text-amber-400 fill-amber-400 drop-shadow-sm scale-110' : 'text-slate-200'} transition-all`} 
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-normal mb-1 leading-none">Dynamic App Rate</p>
                                    <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100/30 px-3 py-1 rounded-full mt-3 uppercase tracking-tight">{totalFeedbacks} Total Reviews</p>
                                </div>

                                {/* Star Breakdown Progress Bars */}
                                <div className="md:col-span-2 space-y-2.5 flex flex-col justify-center">
                                    <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.15em] mb-2 leading-none">Rating Breakdown</h4>
                                    {[5, 4, 3, 2, 1].map((stars) => {
                                        const starCount = feedbacks.filter(f => f.rating === stars).length;
                                        const percentage = totalFeedbacks > 0 ? (starCount / totalFeedbacks) * 100 : 0;
                                        return (
                                            <div key={stars} className="flex items-center gap-4">
                                                <span className="text-[11px] font-medium text-slate-500 w-4 leading-none text-right">{stars} ★</span>
                                                <div className="flex-1 h-3.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden p-0.5 relative">
                                                    <div 
                                                        className="h-full bg-amber-400 rounded-full transition-all duration-1000 shadow-sm"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 w-8 text-right leading-none">{starCount}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Feedbacks Grid */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-700 uppercase tracking-tight pl-1 flex items-center gap-2">
                                    <MessageSquare size={16} className="text-sky-500" /> Active Unread Reviews
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {feedbacks.filter(f => f.status === 'Unread').map(f => (
                                        <div key={f._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all relative group overflow-hidden">
                                            {/* Subtle Background Element */}
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                                            
                                            {/* Card Header */}
                                            <div className="flex flex-col gap-4 relative z-10">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-900 border border-slate-800 text-white rounded-xl flex items-center justify-center font-medium shadow-lg overflow-hidden shrink-0">
                                                            {f.user?.profileImage ? (
                                                                <img 
                                                                    src={`http://localhost:5000/uploads/${f.user.profileImage}`} 
                                                                    className="w-full h-full object-cover" 
                                                                    alt="User"
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.classList.add('hidden'); }} 
                                                                />
                                                            ) : null}
                                                            <User size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-[13px] font-medium text-slate-800 tracking-tight leading-none uppercase truncate max-w-[120px]">{f.user?.name || 'Anonymous'}</h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-normal mt-1 opacity-70">{formatTime(f.createdAt)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Mark as Read - Now more visible and not overlapping */}
                                                    <button 
                                                        onClick={() => handleDeleteFeedback(f._id)} 
                                                        className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white shadow-sm border border-emerald-100 cursor-pointer"
                                                        title="Mark as Read"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Star Rating Section */}
                                                <div className="flex gap-0.5 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={11} className={i < f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Message Body */}
                                            <div className="mt-4 bg-slate-50/50 rounded-2xl p-4 border border-slate-50 relative z-10">
                                                <p className="text-[12px] font-bold text-slate-600 leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all">
                                                    "{f.message}"
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {feedbacks.filter(f => f.status === 'Unread').length === 0 && (
                                        <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-100 shadow-sm max-w-5xl">
                                            <MessageSquare size={40} className="text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-medium uppercase tracking-normal text-[10px]">No unread feedbacks remaining!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── TAB 2: PROBLEM REPORTS ── */}
                {activeTab === 'problems' && (
                    <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
                        {reports.map(pr => (
                            <div key={pr._id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row gap-8 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="flex flex-col gap-4 min-w-[200px] border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                                            {pr.user?.profileImage ? (
                                                <img src={`http://localhost:5000/uploads/${pr.user.profileImage}`} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <AlertCircle size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-medium text-slate-800 tracking-tight uppercase truncate max-w-[120px]">{pr.user?.name || 'User'}</h4>
                                            <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">Report</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Clock size={12} strokeWidth={3} />
                                            <span className="text-[10px] font-medium uppercase tracking-normal leading-none">{formatTime(pr.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${pr.status === 'Resolved' ? 'bg-emerald-500' : pr.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'}`}></div>
                                            <span className={`text-[10px] font-medium uppercase tracking-normal ${pr.status === 'Resolved' ? 'text-emerald-600' : pr.status === 'Rejected' ? 'text-rose-600' : 'text-amber-600'}`}>{pr.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4 pt-2">
                                    <h5 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal ml-1">Issue Description</h5>
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[14px] font-bold text-slate-600 leading-relaxed shadow-inner">
                                        {pr.message}
                                    </div>
                                    {pr.status === 'Pending' && (
                                        <div className="flex gap-3 justify-end pt-2">
                                            <button onClick={() => handleUpdateReportStatus(pr._id, 'Rejected')} className="flex items-center gap-2 text-slate-400 hover:text-rose-500 text-[11px] font-medium uppercase tracking-normal transition-all">Reject Claim</button>
                                            <button onClick={() => handleUpdateReportStatus(pr._id, 'Resolved')} className="flex items-center gap-2 bg-[#0F172A] text-white px-4 py-3 rounded-xl text-[10px] font-medium uppercase tracking-normal shadow-xl active:scale-95 transition-all">Mark as Resolved</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {reports.length === 0 && !loading && (
                             <div className="col-span-full py-20 text-center">
                                <ShieldAlert size={48} className="text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-normal text-xs">No active problem reports.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: HELP GUIDE CMS ── */}
                {activeTab === 'guides' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        {/* CMS List */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-medium text-slate-800 tracking-tight uppercase flex items-center gap-3 ml-2"><List className="text-indigo-500" /> Help Guides List</h3>
                            {guides.map((guide, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group relative overflow-hidden transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-100">
                                    <div className="flex items-start justify-between mb-8 pb-4 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center font-medium">0{i + 1}</div>
                                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-normal leading-none">Global Instruction Card</span>
                                        </div>
                                        <button onClick={() => deleteGuide(i)} className="w-10 h-10 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Question / Heading</label>
                                            <input value={guide.q} onChange={(e) => updateGuide(i, 'q', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[14px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Answer / Instruction Body</label>
                                            <textarea value={guide.a} onChange={(e) => updateGuide(i, 'a', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-500 h-28 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all shadow-sm resize-none" />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleSyncGuides}
                                        className="w-full mt-8 bg-[#0F172A] text-white py-4 rounded-xl font-medium text-[11px] uppercase tracking-normal shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> Sync {i + 1}
                                    </button>
                                </div>
                            ))}
                            <button onClick={addGuide} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-extrabold text-[12px] uppercase tracking-normal hover:border-indigo-400 hover:text-indigo-500 transition-all flex flex-col items-center gap-3">
                                <Plus size={24} /> Add New FAQ Guide Item
                            </button>
                        </div>

                        {/* User Panel Preview Replica */}
                        <div className="flex flex-col">
                            <div className="sticky top-6 bg-slate-900 rounded-[60px] p-6 overflow-hidden shadow-2xl relative">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-[22px] flex items-center justify-center border border-white/10 text-indigo-400 shadow-xl overflow-hidden relative">
                                            <BookOpen size={28} />
                                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded-full border-2 border-slate-900 translate-x-1 translate-y-1"></div>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-medium text-white tracking-tight uppercase">Help Guide</h3>
                                            <p className="text-[12px] font-bold text-white/30 uppercase tracking-normal mt-1">Basic Platform Usage</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {guides.map((g, i) => (
                                            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group/p cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-medium text-white/90 leading-tight group-hover/p:text-indigo-400 transition-colors">{g.q}</span>
                                                    <ChevronDown size={18} className="text-white/20 group-hover/p:text-white transition-all duration-300" />
                                                </div>
                                                <p className="text-[11px] font-bold text-white/40 mt-3 leading-relaxed border-t border-white/5 pt-3 group-hover/p:text-white/60">{g.a}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-4 opacity-40">
                                        <span className="text-[9px] font-medium text-white uppercase tracking-[0.3em]">Direct Guide Preview</span>
                                        <ExternalLink size={12} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
