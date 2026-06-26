import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Award, Clock, Calendar, CheckCircle2,
    XCircle, Edit3, Save, Info, ChevronRight,
    History, Search, Filter, ArrowUpRight,
    LayoutDashboard, UserCheck, ShieldAlert,
    Users, IndianRupee, Loader2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import AdminStatCard from '../components/AdminStatCard';
import StatusBadge from '../components/StatusBadge';
import api from '../../shared/services/api';

const FutureFundAdmin = () => {
    // ── Profit Distribution States ──
    const [distributeAmount, setDistributeAmount] = useState('');
    const [distributing, setDistributing] = useState(false);

    // ── CMS States ──
    const [cms, setCms] = useState({
        description: "Future Fund is a long-term earning opportunity. Once activated, users become eligible for cash rewards derived from platform profits.",
        guideline: "App use karne par time automatically count hoga. 15 minut pura hone par 1 din complete mana jayega"
    });
    const [editingCms, setEditingCms] = useState(false);

    // ── Global Rules (Now fully dynamic linked to DB Settings) ──
    const [rules, setRules] = useState({
        targetSales: 10,
        targetDays: 7,
        dailyTargetMinutes: 15,
        futureFundDailyTasksTarget: 10,
        futureFundWatchAdTarget: 5,
        futureFundEventsTarget: 3,
        futureFundBoostersTarget: 1
    });
    const [editingRules, setEditingRules] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // ── User Data from DB ──
    const [usersData, setUsersData] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);

    // Fetch real users from backend
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setUsersLoading(true);
                const res = await api.get('/admin/users');
                if (res.success && res.data) {
                    const mapped = res.data.map(u => ({
                        id: u._id,
                        name: u.name,
                        email: u.email,
                        sales: u.referralCount || 0,
                        days: u.futureFund?.progress || 0,
                        minsToday: 0, // not tracked per-user on server yet
                        stage: u.futureFund?.status === 'active' ? 'Active' : 'Locked',
                        history7d: null // will be fetched on demand
                    }));
                    setUsersData(mapped);
                }
            } catch (err) {
                console.error('Failed to load FF users', err);
            } finally {
                setUsersLoading(false);
            }
        };

        const fetchReport = async () => {
            try {
                setReportLoading(true);
                const res = await api.get('/admin/users/future-fund/report');
                if (res.success && res.data) {
                    setReportData(res.data);
                }
            } catch (err) {
                console.error('Failed to load FF report', err);
            } finally {
                setReportLoading(false);
            }
        };

        fetchUsers();
        fetchReport();
    }, []);

    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserHistory, setSelectedUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    const handleViewHistory = async (user) => {
        setSelectedUser(user);
        setSelectedUserHistory([]);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/admin/users/${user.id}/transactions`);
            if (res.success && res.data?.last7Days) {
                setSelectedUserHistory(res.data.last7Days);
            }
        } catch (err) {
            console.error('Failed to load user transactions', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Fetch dynamic Settings from Database
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/admin/settings');
                if (res.success && res.data) {
                    setRules({
                        targetSales: Number(res.data.futureFundSalesTarget) || 10,
                        targetDays: Number(res.data.futureFundDaysTarget) || 7,
                        dailyTargetMinutes: 15,
                        futureFundDailyTasksTarget: Number(res.data.futureFundDailyTasksTarget) || 10,
                        futureFundWatchAdTarget: Number(res.data.futureFundWatchAdTarget) || 5,
                        futureFundEventsTarget: Number(res.data.futureFundEventsTarget) || 3,
                        futureFundBoostersTarget: Number(res.data.futureFundBoostersTarget) || 1
                    });
                }
            } catch (err) {
                console.error("Failed to load FF targets", err);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    // Save Rules API Update
    const handleSaveRules = async () => {
        try {
            const res = await api.put('/admin/settings', {
                futureFundSalesTarget: Number(rules.targetSales),
                futureFundDaysTarget: Number(rules.targetDays),
                futureFundDailyTasksTarget: Number(rules.futureFundDailyTasksTarget),
                futureFundWatchAdTarget: Number(rules.futureFundWatchAdTarget),
                futureFundEventsTarget: Number(rules.futureFundEventsTarget),
                futureFundBoostersTarget: Number(rules.futureFundBoostersTarget)
            });
            if (res.success) {
                setEditingRules(false);
                alert("Rules and Targets successfully updated in Database!");
            }
        } catch (err) {
            console.error("Failed to update rules", err);
            alert("Save failed: " + err.message);
        }
    };

    // ── Distribute Profit API ──
    const handleDistribute = async () => {
        if (!distributeAmount || distributeAmount <= 0) {
            return alert("Please enter a valid amount.");
        }
        
        const activeUsersCount = usersData.filter(u => u.stage === 'Active').length;
        if (activeUsersCount === 0) {
            return alert("There are no active Future Fund users to distribute profit to.");
        }

        if (!window.confirm(`Are you sure you want to distribute ₹${distributeAmount} to EACH of the ${activeUsersCount} Active Future Fund users? (Total: ₹${activeUsersCount * distributeAmount})`)) return;

        setDistributing(true);
        try {
            const res = await api.post('/admin/users/future-fund/distribute', { amount: Number(distributeAmount) });
            if (res.success) {
                alert(res.message);
                setDistributeAmount('');
            } else {
                alert(res.message || "Failed to distribute.");
            }
        } catch (err) {
            console.error("Distribution error", err);
            alert("Error: " + err.message);
        } finally {
            setDistributing(false);
        }
    };

    // ── Logic ──
    const calculateProgress = (user) => {
        const salesProgress = Math.min((user.sales / rules.targetSales) * 100, 100);
        const daysProgress = Math.min((user.days / rules.targetDays) * 100, 100);
        const activityProgress = Math.min((user.minsToday / rules.dailyTargetMinutes) * 100, 100);
        return Math.floor((salesProgress + daysProgress + activityProgress) / 3);
    };

    const filteredUsers = usersData.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

    if (loadingSettings || usersLoading) {
        return (
            <div className="p-4 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center font-medium gap-3">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
                <p className="text-xs uppercase font-medium text-slate-400">Loading Future Fund CMS...</p>
            </div>
        );
    }

    return (
        <div className="p-4 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <PageHeader title="Future Fund Evolution" subtitle="Manage milestones, platform content, and view user history" />

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <AdminStatCard label="Total Users" value={usersData.length} change="Platform wide" icon={UserCheck} color="bg-indigo-600" />
                <AdminStatCard label="Active Stages" value={usersData.filter(u => u.stage === 'Active').length} change="Monetized" icon={TrendingUp} color="bg-sky-500" />
                <AdminStatCard label="Eligible Today" value={usersData.filter(u => u.stage === 'Eligible').length} change="Move Forward ready" icon={Award} color="bg-emerald-500" />
                <AdminStatCard label="Criteria Goal" value={`${rules.targetSales}/${rules.targetDays}/${rules.dailyTargetMinutes}`} change="Referral/Days/Mins" icon={LayoutDashboard} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
                {/* CMS Control */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 flex flex-col relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 opacity-50 rounded-full -mr-8 -mt-4 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-4 relative">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600"><Edit3 size={15} /></div>
                            <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest leading-none">Content Manager</h2>
                        </div>
                        <button onClick={() => setEditingCms(!editingCms)} className={`px-3 py-1.5 rounded-md font-semibold text-[9px] uppercase tracking-wider transition-all ${editingCms ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{editingCms ? 'Save Changes' : 'Edit CMS'}</button>
                    </div>
                    <div className="space-y-4 relative">
                        <div>
                            <p className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info size={11} /> Description Text</p>
                            {editingCms ? <textarea value={cms.description} onChange={(e) => setCms({ ...cms, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-[12px] font-medium text-slate-700 h-20 outline-none focus:ring-1 focus:ring-sky-500" /> : <p className="text-[12px] font-medium text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-md border border-slate-100">"{cms.description}"</p>}
                        </div>
                        <div>
                            <p className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ShieldAlert size={11} /> Guidelines Box</p>
                            {editingCms ? <textarea value={cms.guideline} onChange={(e) => setCms({ ...cms, guideline: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-[12px] font-medium text-slate-700 h-16 outline-none focus:ring-1 focus:ring-sky-500" /> : <div className="flex items-start gap-2.5 bg-sky-50/50 p-3 rounded-md border border-sky-100"><Info size={14} className="text-sky-500 mt-0.5 shrink-0" /><p className="text-[11px] font-medium text-sky-800 leading-snug">{cms.guideline}</p></div>}
                        </div>
                    </div>
                </div>

                {/* Eligibility Thresholds & Today's Activity Goals */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 group relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-50 opacity-30 rounded-full -mb-10 -mr-6 group-hover:scale-110 transition-transform duration-700"></div>
                    
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-emerald-50 rounded-md flex items-center justify-center text-emerald-600"><CheckCircle2 size={15} /></div>
                                <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest leading-none">Milestones & Targets</h2>
                            </div>
                            <button 
                                onClick={() => {
                                    if (editingRules) {
                                        handleSaveRules();
                                    } else {
                                        setEditingRules(true);
                                    }
                                }} 
                                className={`px-3 py-1.5 rounded-md font-semibold text-[9px] uppercase tracking-wider transition-all ${editingRules ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {editingRules ? 'Save Rules' : 'Edit Rules'}
                            </button>
                        </div>

                        {/* Milestone Targets Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            {[
                                { label: 'Sales Target', key: 'targetSales', icon: Users, color: 'text-indigo-500' },
                                { label: 'Active Days', key: 'targetDays', icon: Calendar, color: 'text-sky-500' },
                                { label: 'Daily Mins', key: 'dailyTargetMinutes', icon: Clock, color: 'text-amber-500', suffix: ' M' }
                            ].map((rule) => {
                                const Icon = rule.icon || TrendingUp;
                                return (
                                    <div key={rule.key} className="bg-slate-50/70 border border-slate-100 p-3 rounded-md">
                                        <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className={rule.color} /><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest leading-none">{rule.label}</p></div>
                                        {editingRules ? (
                                            <input type="number" value={rules[rule.key]} onChange={(e) => setRules({ ...rules, [rule.key]: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[13px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-sky-500" />
                                        ) : (
                                            <p className="text-[15px] font-bold text-slate-800 leading-none">{rules[rule.key]}{rule.suffix || ''}</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Today's Activity Target Configuration */}
                        <div>
                            <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-3">Today's Activity Progress Targets</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Daily Tasks', key: 'futureFundDailyTasksTarget', color: 'text-blue-500' },
                                    { label: 'Watch Ads', key: 'futureFundWatchAdTarget', color: 'text-emerald-500' },
                                    { label: 'Events Target', key: 'futureFundEventsTarget', color: 'text-amber-500' },
                                    { label: 'Boosters Target', key: 'futureFundBoostersTarget', color: 'text-rose-500' }
                                ].map((act) => (
                                    <div key={act.key} className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-lg">
                                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-tight mb-1.5 leading-none">{act.label}</p>
                                        {editingRules ? (
                                            <input 
                                                type="number" 
                                                value={rules[act.key]} 
                                                onChange={(e) => setRules({ ...rules, [act.key]: Number(e.target.value) })} 
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500" 
                                            />
                                        ) : (
                                            <p className={`text-lg font-medium ${act.color} leading-none`}>{rules[act.key]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-400 font-medium leading-normal">
                        These dynamic settings configure the targets shown in the User's Active Future Fund screen and are saved directly into the database.
                    </div>
                </div>
            </div>

            {/* Tracker Table with Pagination */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden mb-5">
                <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100 font-medium">FF</div>
                        <div><h2 className="text-sm font-medium text-slate-800 uppercase tracking-normal">User Progress Tracker</h2><p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter leading-none mt-1">Milestone Stages</p></div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search user history..." className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-3 text-[12px] font-medium text-slate-700 outline-none transition-all shadow-inner" />
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[360px]">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">User</th>
                                <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Progress</th>
                                <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Stage</th>
                                <th className="text-center px-5 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">View History</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length > 0 ? currentItems.map((u) => {
                                const prog = calculateProgress(u);
                                return (
                                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors group">
                                        <td className="px-5 py-2"><span className="font-medium text-slate-800 text-[13px] tracking-tight">{u.name}</span></td>
                                        <td className="px-5 py-2">
                                            <div className="flex items-center gap-3 w-40">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${prog === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${prog}%` }}></div></div>
                                                <span className="text-[11px] font-medium text-slate-900 tabular-nums">{prog}%</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-2"><StatusBadge status={u.stage} /></td>
                                        <td className="px-5 py-2">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleViewHistory(u)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm border ${u.stage === 'Active' ? 'bg-sky-50 border-sky-100 text-sky-600 hover:bg-sky-500 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed'}`} disabled={u.stage !== 'Active'}><History size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan="4" className="py-24 text-center text-[10px] font-medium uppercase text-slate-300">No results matched</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length}</p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-5 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-medium uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm">Back</button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-5 py-2 bg-[#0F172A] text-white rounded-xl text-[10px] font-medium uppercase shadow-lg shadow-slate-200 transition-all disabled:opacity-30">Next</button>
                    </div>
                </div>
            </div>

            {/* ── COMPACT HISTORY LOG MODAL ── */}
            {selectedUser && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div onClick={() => { setSelectedUser(null); setSelectedUserHistory([]); }} className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-sm animate-in fade-in duration-300"></div>
                    <div className="relative bg-white w-full max-w-[380px] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-400">
                        <div className="bg-[#0F172A] p-4 text-white flex justify-between items-center">
                            <div><h3 className="text-md font-medium tracking-tight">{selectedUser.name}'s History</h3><p className="text-[9px] text-sky-400 font-medium uppercase tracking-normal leading-none mt-1">Last 7 Days Earnings</p></div>
                            <button onClick={() => { setSelectedUser(null); setSelectedUserHistory([]); }} className="text-white/40 hover:text-white"><XCircle size={20} /></button>
                        </div>
                        <div className="p-4">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-3">
                                    <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Fetching transactions...</p>
                                </div>
                            ) : (
                                <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto scrollbar-hide">
                                    {selectedUserHistory.length > 0 ? selectedUserHistory.map((day, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg">
                                            <div className="flex items-center gap-3"><Calendar size={12} className="text-slate-300" /><p className="text-[11px] font-medium text-slate-600 tracking-tight">{day.date}</p></div>
                                            <p className={`text-[13px] font-medium ${day.total > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{day.total > 0 ? `+ ₹${day.total}` : '₹0.00'}</p>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center">
                                            <p className="text-[11px] font-medium text-slate-300 uppercase tracking-normal">No earnings in last 7 days</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button onClick={() => { setSelectedUser(null); setSelectedUserHistory([]); }} className="w-full bg-[#0F172A] text-white py-4 rounded-lg font-medium text-[11px] uppercase tracking-normal shadow-xl active:scale-95 transition-all">Close History</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FutureFundAdmin;
