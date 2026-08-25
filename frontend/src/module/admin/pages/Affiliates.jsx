import React, { useState } from 'react';
import { Users, IndianRupee, Share2, TrendingUp, Edit2, Search, ArrowRight, Award, Filter, Calendar, ExternalLink, ChevronRight, Zap, XCircle, ShieldCheck, CheckCircle2, MoreHorizontal, Link2, UserCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import AdminStatCard from '../components/AdminStatCard';
import StatusBadge from '../components/StatusBadge';
import api from '../../shared/services/api';
import { PLAY_STORE_URL, normalizeReferralLinkBaseUrl } from '../../shared/utils/referral';

const Affiliates = () => {
    // ── Data & States ──
    const [referralsData, setReferralsData] = useState([]);
    const [stats, setStats] = useState({
        totalReferrals: 0,
        totalPayouts: 0,
        topReferrer: '...',
        activeReferrersCount: 0,
        currentCommission: 200
    });
    const [loading, setLoading] = useState(true);
    const [rate, setRate] = useState(200);
    const [editing, setEditing] = useState(false);
    const [tempRate, setTempRate] = useState(200);
    
    // Base URL states
    const [baseUrl, setBaseUrl] = useState(PLAY_STORE_URL);
    const [editingBaseUrl, setEditingBaseUrl] = useState(false);
    const [tempBaseUrl, setTempBaseUrl] = useState(PLAY_STORE_URL);

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);

    // ── Fetch Data ──
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/affiliates');
            if (res.success) {
                setReferralsData(res.data.logs);
                setStats(res.data.stats);
                setRate(res.data.stats.currentCommission);
                setBaseUrl(normalizeReferralLinkBaseUrl(res.data.stats.referralLinkBaseUrl));
            }
        } catch (err) {
            console.error("Affiliate fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateRate = async () => {
        const safeRate = Math.max(0, parseFloat(tempRate) || 0);
        try {
            const res = await api.put('/admin/settings', { referralCommission: safeRate });
            if (res.success) {
                setRate(safeRate);
                setTempRate(safeRate);
                setEditing(false);
                alert('Commission rate updated successfully!');
            }
        } catch (err) {
            alert('Failed to update rate');
        }
    };

    const handleUpdateBaseUrl = async () => {
        const next = normalizeReferralLinkBaseUrl(tempBaseUrl);
        try {
            const res = await api.put('/admin/settings', { referralLinkBaseUrl: next });
            if (res.success) {
                const saved = normalizeReferralLinkBaseUrl(res.data?.referralLinkBaseUrl || next);
                setBaseUrl(saved);
                setTempBaseUrl(saved);
                setEditingBaseUrl(false);
                alert('Referral Base URL updated. Users will share this Play Store / join link with their own invite code.');
            } else {
                alert(res.message || 'Failed to update base url');
            }
        } catch (err) {
            alert(err.message || 'Failed to update base url');
        }
    };

    // ── Logic ──
    const handleSearch = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const filtered = referralsData.filter(r => {
        const matchesSearch = r.referrer.toLowerCase().includes(search.toLowerCase()) || r.referredTo.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filter === 'All' || r.status === filter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

    const openAudit = (data) => {
        setSelectedAudit(data);
        setIsAuditOpen(true);
    };

    return (
        <div className="p-4 space-y-5 animate-in fade-in duration-500 bg-[#f9f6f1] min-h-screen pb-20 overflow-x-hidden font-['Poppins']">
            <PageHeader title="Affiliate Management" subtitle="Monitor referral network and adjust commission rates" />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <AdminStatCard label="Total Referrals" value={stats.totalReferrals} change="All time joinings" icon={Users} color="bg-indigo-600" />
                <AdminStatCard label="Reward Payouts" value={`₹${stats.totalPayouts.toLocaleString()}`} change="Verified successful joinings" icon={IndianRupee} color="bg-emerald-500" />
                <AdminStatCard label="Active Referrers" value={stats.activeReferrersCount} change={`Top: ${stats.topReferrer}`} icon={Award} color="bg-amber-500" />
                <AdminStatCard label="Live Commission" value={`₹${rate}`} change="Configurable" icon={Zap} color="bg-sky-500" />
            </div>

            {/* Toolbar with Edit Rate */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-sky-50 rounded-lg text-sky-600 shadow-inner flex items-center justify-center"><Share2 size={18} /></div>
                    <div>
                        <h3 className="text-[9px] text-slate-400 uppercase tracking-normal leading-none mb-1.5">Registration Reward</h3>
                        {editing ? (
                            <div className="flex items-center gap-2">
                                <span className=" text-slate-600 text-sm">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={tempRate}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                        setTempRate(val);
                                    }}
                                    className="w-16 bg-slate-50 border border-sky-200 rounded-lg px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <button onClick={handleUpdateRate} className="bg-sky-500 text-white px-2 py-1 rounded-md text-[9px] uppercase">Save</button>
                                <button onClick={() => setEditing(false)} className="text-slate-400 text-[9px] uppercase px-1">X</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <p className="text-lg text-slate-900 leading-none">₹{rate}</p>
                                <button onClick={() => { setTempRate(rate); setEditing(true); }} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md transition-all" title="Click to change commission">
                                    <Edit2 size={10} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg text-indigo-600 shadow-inner flex items-center justify-center shrink-0"><Link2 size={18} /></div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[9px] text-slate-400 uppercase tracking-normal leading-none mb-1.5">Referral Base URL</h3>
                        {editingBaseUrl ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <input
                                    type="url"
                                    value={tempBaseUrl}
                                    onChange={(e) => setTempBaseUrl(e.target.value)}
                                    placeholder={PLAY_STORE_URL}
                                    className="flex-1 min-w-[220px] bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button type="button" onClick={handleUpdateBaseUrl} className="bg-indigo-500 text-white px-3 py-1.5 rounded-md text-[9px] uppercase shrink-0">Save</button>
                                <button type="button" onClick={() => { setEditingBaseUrl(false); setTempBaseUrl(baseUrl); }} className="text-slate-400 text-[9px] uppercase px-1 shrink-0">X</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <p className="text-xs text-slate-900 truncate" title={baseUrl}>
                                    {baseUrl || PLAY_STORE_URL}
                                </p>
                                <button type="button" onClick={() => { setTempBaseUrl(baseUrl || PLAY_STORE_URL); setEditingBaseUrl(true); }} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md transition-all shrink-0" title="Click to change Base URL">
                                    <Edit2 size={10} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl">
                    <div className="relative flex-1 w-full">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                        <input type="text" value={search} onChange={handleSearch} placeholder="Search referrers..." className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-[11px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner" />
                    </div>
                    <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                        {['All', 'Credited', 'Pending'].map(t => (
                            <button key={t} onClick={() => { setFilter(t); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-[9px] uppercase tracking-normal transition-all ${filter === t ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Simple Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="text-left px-8 py-3 text-[10px] text-slate-400 uppercase tracking-[0.25em]">Referrer</th>
                                <th className="text-left px-8 py-3 text-[10px] text-slate-400 uppercase tracking-[0.25em]">New Joiner</th>
                                <th className="text-left px-8 py-3 text-[10px] text-slate-400 uppercase tracking-[0.25em]">Reward</th>
                                <th className="text-left px-8 py-3 text-[10px] text-slate-400 uppercase tracking-[0.25em]">Status</th>
                                <th className="text-center px-8 py-3 text-[10px] text-slate-400 uppercase tracking-[0.25em]">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length > 0 ? currentItems.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-8 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-sky-400 text-[11px] shadow-sm">{r.referrer.charAt(0)}</div>
                                            <span className=" text-slate-800 text-[13px] tracking-tight">{r.referrer}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-3"><span className=" text-indigo-600 text-[13px] tracking-tight">{r.referredTo}</span></td>
                                    <td className="px-8 py-3 text-emerald-600 text-[14px]">{r.reward}</td>
                                    <td className="px-8 py-3"><StatusBadge status={r.status} /></td>
                                    <td className="px-8 py-3">
                                        <div className="flex justify-center">
                                            <button onClick={() => openAudit(r)} className="w-10 h-10 bg-slate-50 hover:bg-[#0F172A] hover:text-white text-slate-400 rounded-lg flex items-center justify-center transition-all shadow-sm border border-slate-100"><ShieldCheck size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="py-24 text-center"><p className="text-[11px] uppercase tracking-normal text-slate-400">No records found</p></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Standardized Pagination Footer */}
                <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-normal order-2 sm:order-1 outline-none">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
                        >
                            Prev
                        </button>
                        <div className="flex gap-2">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-9 h-9 rounded-xl text-[10px] flex items-center justify-center transition-all ${currentPage === i + 1 ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* ── SIMPLE AUDIT MODAL ── */}
            {isAuditOpen && selectedAudit && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div onClick={() => setIsAuditOpen(false)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"></div>
                    <div className="relative bg-white w-full max-w-[420px] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="bg-[#0F172A] p-7 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl tracking-tight">Referral Audit</h3>
                                <p className="text-[10px] text-sky-400 uppercase tracking-normal mt-1">Audit ID: #990{selectedAudit.id}</p>
                            </div>
                            <button onClick={() => setIsAuditOpen(false)} className="text-white/40 hover:text-white transition-colors"><XCircle size={28} /></button>
                        </div>

                        <div className="p-4 space-y-8">
                            {/* Simplified Timeline */}
                            <div className="space-y-6 relative border-l-2 border-slate-100 ml-4 pl-8">
                                <div className="relative">
                                    <div className="absolute -left-[50px] top-0 w-[42px] h-[42px] bg-slate-900 rounded-lg flex items-center justify-center text-sky-400 text-[14px] shadow-lg">1</div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-normal mb-1">Registration</p>
                                    <p className="text-[14px] text-slate-800">{selectedAudit.date} at {selectedAudit.joinTime}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">IP Address: {selectedAudit.ip}</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[50px] top-0 w-[42px] h-[42px] bg-sky-500 rounded-lg flex items-center justify-center text-white text-[14px] shadow-lg">2</div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-normal mb-1">Platform Fee Paid</p>
                                    <p className="text-[14px] text-slate-800 flex items-center gap-2">
                                        ₹499.00 <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md">VERIFIED</span>
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Txn: {selectedAudit.txnId}</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[50px] top-0 w-[42px] h-[42px] bg-emerald-500 rounded-lg flex items-center justify-center text-white text-[14px] shadow-lg">3</div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-normal mb-1">Commission Credit</p>
                                    <p className="text-[16px] text-emerald-600">₹200.00 <span className="text-[10px] text-slate-400 font-medium ml-1">Paid to {selectedAudit.referrer}</span></p>
                                </div>
                            </div>

                            <button onClick={() => setIsAuditOpen(false)} className="w-full bg-[#0F172A] text-white py-4 rounded-lg text-[12px] uppercase tracking-normal shadow-xl shadow-slate-200 active:scale-95 transition-all">Close Report</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Affiliates;
