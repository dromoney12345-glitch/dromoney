import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, ShieldCheck, Wallet, TrendingUp, ArrowUpRight, 
    ArrowDownLeft, Clock, CheckCircle2, XCircle, Zap, 
    Sparkles, ShieldAlert, Monitor, Activity, MessageSquare,
    ExternalLink, ChevronRight, AlertCircle, Rocket, 
    Bell, Plus, Ban, Globe, Send, RefreshCw, BarChart3,
    DollarSign, Briefcase, PlayCircle, Settings, ShieldQuestion,
    Filter, Target, PieChart, Info, MapPin, Eye, MousePointer2
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import api from '../../shared/services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const { stats: liveStats, fetchDashboardStats } = useAdmin();
    
    // ── Interactive States ──
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [regOpen, setRegOpen] = useState(true);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastTitle, setBroadcastTitle] = useState('Dromoney Global Alert');
    const [isSending, setIsSending] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [queue, setQueue] = useState([]);
    const [recentNotifs, setRecentNotifs] = useState([]);

    // Engagement Matrix state
    const [engagementPeriod, setEngagementPeriod] = useState('daily');
    const [engagementData, setEngagementData] = useState(null);
    const [engagementLoading, setEngagementLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
        fetchSettings();
    }, []);

    useEffect(() => {
        fetchEngagement(engagementPeriod);
    }, [engagementPeriod]);

    // Load persisted maintenance & registration state from backend
    const fetchSettings = async () => {
        try {
            const res = await api.get('/public/settings');
            if (res.success && res.data) {
                setMaintenanceMode(res.data.maintenanceMode ?? false);
                setRegOpen(res.data.registrationOpen ?? true);
            }
        } catch (err) {
            console.error("Settings fetch error:", err);
        } finally {
            setSettingsLoaded(true);
        }
    };

    // Toggle maintenance mode and persist to backend
    const handleMaintenanceToggle = async () => {
        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        try {
            await api.put('/admin/settings', { maintenanceMode: newVal });
        } catch (err) {
            console.error("Failed to save maintenance mode:", err);
            setMaintenanceMode(!newVal); // revert on error
        }
    };

    // Toggle registration open and persist to backend
    const handleRegToggle = async () => {
        const newVal = !regOpen;
        setRegOpen(newVal);
        try {
            await api.put('/admin/settings', { registrationOpen: newVal });
        } catch (err) {
            console.error("Failed to save registration state:", err);
            setRegOpen(!newVal); // revert on error
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await api.get('/admin/dashboard/alerts');
            if (response.success) {
                setAlerts(response.data);
                if (response.recentNotifications) {
                    setRecentNotifs(response.recentNotifications);
                }
            }
            
            const userRes = await api.get('/admin/users');
            if (userRes.success) {
                const pending = userRes.data.filter(u => u.kyc?.status === 'Pending').slice(0, 3);
                setQueue(pending.map(u => ({
                    name: u.name,
                    time: 'Recent',
                    type: 'KYC',
                    status: 'Pending'
                })));
            }
        } catch (err) {
            console.error("Alerts fetching error:", err);
        }
    };

    const fetchEngagement = async (period) => {
        setEngagementLoading(true);
        try {
            const res = await api.get(`/admin/dashboard/engagement?period=${period}`);
            if (res.success) setEngagementData(res.data);
        } catch (err) {
            console.error("Engagement fetch error:", err);
        } finally {
            setEngagementLoading(false);
        }
    };

    // ── DATA SOURCES (Mapped to Live Stats if available) ──
    const displayStats = liveStats?.stats?.map(s => ({
        ...s,
        icon: s.label.includes('User') ? Users : s.label.includes('Revenue') ? TrendingUp : s.label.includes('Payout') ? Wallet : Zap,
        path: s.label.includes('User') ? '/admin/users' : s.label.includes('Revenue') ? '/admin/payments' : s.label.includes('Payout') ? '/admin/withdrawals' : '/admin/tasks'
    })) || [
        { label: 'Active Users', value: '...', trend: 'Sync...', color: 'from-sky-500 to-indigo-600', icon: Users, path: '/admin/users' },
        { label: 'Total Revenue', value: '...', trend: 'Sync...', color: 'from-emerald-500 to-teal-600', icon: TrendingUp, path: '/admin/payments' },
        { label: 'Coins in Market', value: '...', trend: 'Sync...', color: 'from-amber-400 to-orange-600', icon: Zap, path: '/admin/tasks' },
        { label: 'Pending Payouts', value: '...', trend: 'Sync...', color: 'from-rose-500 to-pink-600', icon: Wallet, path: '/admin/withdrawals' },
    ];

    const conversionFunnel = liveStats?.conversionFunnel || [
        { label: 'Total Visits', value: '...', percent: '0%', color: 'bg-slate-200' },
        { label: 'Registrations', value: '...', percent: '0%', color: 'bg-indigo-400' },
        { label: 'Paid Members', value: '...', percent: '0%', color: 'bg-sky-500' },
        { label: 'Active Earners', value: '...', percent: '0%', color: 'bg-emerald-500' },
    ];

    const fraudAlerts = alerts.length > 0 ? alerts : [
        { user: 'Security Bot', reason: 'Scanning for anomalies...', severity: 'low', time: 'Active' },
    ];

    const kycQueue = queue.length > 0 ? queue : [
        { name: 'System Queue', time: 'Live', type: 'Status', status: 'Empty' },
    ];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchDashboardStats(), fetchAlerts(), fetchEngagement(engagementPeriod)]);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg || !broadcastTitle) return;
        
        setIsSending(true);
        try {
            const response = await api.post('/admin/notifications', {
                title: broadcastTitle,
                message: broadcastMsg,
                type: 'broadcast'
            });

            if (response.success) {
                alert('Broadcast Sent Successfully!');
                setBroadcastMsg('');
                setBroadcastTitle('Dromoney Global Alert');
            }
        } catch (err) {
            console.error('Broadcast Error:', err);
            alert('Failed to send broadcast');
        } finally {
            setIsSending(false);
        }
    };

    const quickActions = [
        { label: 'Send Alert', icon: Bell, color: 'text-indigo-600', bg: 'bg-indigo-100/50', cardBg: 'bg-[#E2D4FD]', border: 'border-[#D4B8F9]', path: '/admin/notifications' },
        { label: 'Add Task', icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100/50', cardBg: 'bg-[#FDF2D0]', border: 'border-[#F9E9B8]', path: '/admin/tasks' },
        { label: 'New Event', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100/50', cardBg: 'bg-[#CFE2FD]', border: 'border-[#B8D5F9]', path: '/admin/events' },
        { label: 'Manage Ads', icon: PlayCircle, color: 'text-sky-600', bg: 'bg-sky-100/50', cardBg: 'bg-[#FDE2CF]', border: 'border-[#F9D4B8]', path: '/admin/watch-and-earn' },
        { label: 'Settings', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100/50', cardBg: 'bg-[#FDCFCF]', border: 'border-[#F9B8B8]', path: '/admin/settings' },
    ];

    return (
        <div className="p-4 space-y-5 animate-in fade-in duration-700 bg-[#f9f6f1] min-h-screen pb-20 overflow-x-hidden">
            
            {/* ── HEADER & LIVE STATUS ── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl shadow-xl text-white transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <BarChart3 size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-medium text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                            Elite Control Room <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        </h1>
                        <p className="text-slate-400 font-medium uppercase tracking-normal text-[9px] mt-1 flex items-center gap-2">
                            <Monitor size={10} /> System Node 01 • <span className="text-emerald-500 font-medium">Online & Secured</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-normal leading-none">Maintenance</span>
                            <button
                                onClick={handleMaintenanceToggle}
                                disabled={!settingsLoaded}
                                className={`w-8 h-4 rounded-full relative transition-all ${maintenanceMode ? 'bg-rose-500 shadow-lg shadow-rose-200' : 'bg-slate-200'} ${!settingsLoaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${maintenanceMode ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                        <div className="h-3 w-px bg-slate-100"></div>
                        <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-normal leading-none">Register</span>
                            <button
                                onClick={handleRegToggle}
                                disabled={!settingsLoaded}
                                className={`w-8 h-4 rounded-full relative transition-all ${regOpen ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'} ${!settingsLoaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${regOpen ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                    </div>
                    <button onClick={handleRefresh} className={`p-2 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-400 hover:text-slate-900 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* ── QUICK ACTIONS HUB ── */}
            {/* The logic for navigation is explicitly absolute to avoid sub-route confusion */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {quickActions.map((action, i) => (
                    <div 
                        key={i}
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(action.path);
                        }}
                        className={`${action.cardBg} rounded-xl p-4 border ${action.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col items-center gap-2 group cursor-pointer active:scale-95 relative overflow-hidden`}
                    >
                        <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
                            <ArrowUpRight size={10} className="text-slate-900" />
                        </div>
                        <div className={`w-10 h-10 bg-white/60 backdrop-blur-md ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-white/20`}>
                            <action.icon size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-medium text-slate-800 uppercase tracking-[0.1em] leading-none text-center">{action.label}</span>
                    </div>
                ))}
            </div>

            {/* ── KPI GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayStats.map((s, i) => {
                    const theme = { icon: i === 0 ? 'text-sky-500' : i === 1 ? 'text-emerald-500' : i === 2 ? 'text-amber-500' : 'text-rose-500' };
                    
                    return (
                        <div key={i} onClick={() => navigate(s.path)} className={`bg-white group cursor-pointer rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden active:scale-[0.98]`}>
                            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-30 transition-opacity">
                                <ArrowUpRight size={12} className="text-slate-900" />
                            </div>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-slate-100 transition-colors`}>
                                    <s.icon size={18} className={theme.icon} strokeWidth={2.5} />
                                </div>
                                <span className="text-[8px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100 uppercase tracking-normal">{s.trend}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.12em] mb-1">{s.label}</p>
                                <h3 className="text-lg font-medium text-slate-900 tracking-tight">{s.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── SECOND LAYER: FUNNEL & FRAUD ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Conversion Funnel */}
                <div className="bg-white rounded-xl p-5 shadow-sm relative overflow-hidden border border-slate-100 group">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-[14px] font-medium uppercase tracking-tight flex items-center gap-2 text-slate-900"><Filter size={14} className="text-indigo-500" /> Conversion Funnel</h2>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mt-0.5">User Journey Tracker</p>
                        </div>
                        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform"><Target size={16} className="text-indigo-500" /></div>
                    </div>

                    <div className="space-y-3">
                        {conversionFunnel.map((f, i) => (
                            <div key={i} className="flex items-center gap-4 group/bar">
                                <span className="w-10 text-[9px] font-medium text-slate-400">{f.percent}</span>
                                <div className="flex-1 relative h-7 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                     <div 
                                        style={{ width: f.percent }} 
                                        className={`absolute h-full ${f.color} rounded-lg shadow-sm transition-all duration-1000 delay-${i * 100}`}
                                    ></div>
                                    <div className="absolute inset-x-3 h-full flex items-center justify-between">
                                        <span className="text-[9px] font-medium uppercase tracking-normal text-slate-700">{f.label}</span>
                                        <span className="text-[9px] font-medium text-slate-900">{f.value}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notifications & Alerts */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col group h-[300px] overflow-hidden">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-[14px] font-medium text-slate-900 tracking-tight uppercase flex items-center gap-2"><Bell size={14} className="text-amber-500" /> Notifications & Alerts</h2>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mt-0.5">Recent User Broadcasts & Alerts</p>
                        </div>
                        <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center border border-amber-100"><ShieldAlert size={16} /></div>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {recentNotifs.length > 0 ? (
                            recentNotifs.map((n, i) => (
                                <div key={`notif-${i}`} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all cursor-pointer group/alert">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${n.type === 'broadcast' ? 'bg-sky-500' : 'bg-emerald-500'}`}></div>
                                            <p className="text-[11px] font-medium text-slate-800 tracking-tight leading-none uppercase">{n.title}</p>
                                        </div>
                                        <span className="text-[8px] font-medium text-slate-300 uppercase tracking-normal">{n.time}</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 leading-snug pl-4">{n.message}</p>
                                </div>
                            ))
                        ) : null}
                        
                        {fraudAlerts.map((a, i) => (
                            <div key={`alert-${i}`} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all cursor-pointer group/alert">
                                <div className="flex items-center gap-3">
                                     <div className={`w-2 h-2 rounded-full ${a.severity === 'high' ? 'bg-rose-500 animate-pulse' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-sky-500'}`}></div>
                                     <div>
                                         <p className="text-[11px] font-medium text-slate-800 tracking-tight leading-none">@{a.user}</p>
                                         <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">{a.reason}</p>
                                     </div>
                                </div>
                                <span className="text-[8px] font-medium text-slate-300 uppercase tracking-normal">{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── THIRD LAYER: ENGAGEMENT & HEALTH ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Engagement Graph */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5 group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 relative z-10">
                        <div>
                            <h2 className="text-[14px] font-medium text-slate-900 tracking-tight uppercase flex items-center gap-2"><BarChart3 size={16} className="text-indigo-500" /> Engagement Matrix</h2>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mt-0.5">Platform adoption velocity</p>
                        </div>
                        <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            {['daily', 'weekly'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setEngagementPeriod(t)}
                                    className={`px-3 py-1.5 rounded-md text-[9px] font-medium uppercase tracking-normal transition-all ${engagementPeriod === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {engagementLoading ? (
                        <div className="h-48 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : engagementData ? (() => {
                        const { labels, registrations, logins, taskCompletions } = engagementData;
                        const allVals = [...registrations, ...logins, ...taskCompletions];
                        const maxVal = Math.max(...allVals, 1);
                        const CHART_H = 160; // px — fixed chart height
                        const MIN_BAR = 6;   // px — always visible even for 0

                        const series = [
                            { key: 'registrations', data: registrations, color: '#6366f1', label: 'Registrations' },
                            { key: 'logins',         data: logins,         color: '#38bdf8', label: 'Logins'        },
                            { key: 'tasks',          data: taskCompletions,color: '#34d399', label: 'Tasks Done'    },
                        ];

                        return (
                            <div>
                                {/* Legend */}
                                <div className="flex items-center gap-5 mb-3 px-1">
                                    {series.map(s => (
                                        <div key={s.key} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }}></div>
                                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-normal">{s.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Y-axis grid lines */}
                                <div className="relative" style={{ height: CHART_H + 24 }}>
                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map(pct => (
                                        <div
                                            key={pct}
                                            className="absolute left-0 right-0 border-t border-slate-100"
                                            style={{ bottom: 24 + (pct / 100) * CHART_H }}
                                        >
                                            <span className="absolute -left-1 -top-2.5 text-[8px] text-slate-300 font-medium">
                                                {pct > 0 ? Math.round((pct / 100) * maxVal) : ''}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Bars */}
                                    <div className="absolute bottom-6 left-4 right-0 flex items-end gap-1" style={{ height: CHART_H }}>
                                        {labels.map((label, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center group/col" style={{ height: CHART_H }}>
                                                {/* Bar group */}
                                                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: CHART_H }}>
                                                    {series.map(s => {
                                                        const barH = Math.max(
                                                            Math.round((s.data[i] / maxVal) * CHART_H),
                                                            s.data[i] > 0 ? MIN_BAR : 2
                                                        );
                                                        return (
                                                            <div
                                                                key={s.key}
                                                                className="relative group/bar flex-1 max-w-[10px] rounded-t-sm cursor-pointer transition-opacity hover:opacity-75"
                                                                style={{ height: barH, background: s.color }}
                                                            >
                                                                {/* Tooltip */}
                                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                                    {s.data[i]}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {/* X label */}
                                                <span className="text-[7px] font-medium text-slate-400 uppercase tracking-wide mt-1 truncate w-full text-center absolute bottom-0">
                                                    {label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary row */}
                                <div className="mt-2 pt-3 border-t border-slate-50 grid grid-cols-3 gap-2">
                                    {series.map(s => (
                                        <div key={s.key} className="text-center">
                                            <p className="text-[13px] font-medium text-slate-800">{s.data.reduce((a, b) => a + b, 0)}</p>
                                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-normal">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="h-48 flex items-center justify-center text-slate-300 text-[11px] font-medium uppercase tracking-normal">No data available</div>
                    )}
                </div>

                {/* Broadcast Center */}
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col h-full relative overflow-hidden group border border-slate-100">
                     <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#FDF2D0] rounded-lg flex items-center justify-center text-[#856404] shadow-sm border border-[#F9E9B8] group-hover:scale-110 transition-transform"><Send size={16} /></div>
                        <div>
                            <h3 className="text-[13px] font-medium uppercase tracking-tight text-slate-900 leading-none">Broadcast</h3>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mt-1">Global Announcement</p>
                        </div>
                    </div>
                    <div className="space-y-3 mb-4">
                        <input 
                            type="text"
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            placeholder="Message Title..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-medium text-slate-800 placeholder-slate-300 focus:ring-1 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                        />
                        <textarea 
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Type message for all users..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium text-slate-600 placeholder-slate-300 h-24 focus:ring-1 focus:ring-amber-500 focus:bg-white outline-none resize-none transition-all"
                        />
                    </div>
                    <button 
                        disabled={!broadcastMsg || isSending}
                        onClick={handleBroadcast}
                        className={`w-full mt-auto py-3 bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-xl text-[10px] font-medium uppercase tracking-normal shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 group/btn
                            ${isSending ? 'opacity-80' : ''}`}
                    >
                        {isSending ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                TRANSMIT <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── FOURTH LAYER: VERIFICATION ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Verification Queue Redesign */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-[12px] font-medium text-slate-800 uppercase tracking-tight">Global Payout Requests</h2>
                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-normal mt-1">Pending verification batch</p>
                        </div>
                        <button onClick={() => navigate('/admin/withdrawals')} className="text-[9px] font-medium text-indigo-500 uppercase flex items-center gap-2 hover:gap-3 transition-all">Wallets <ChevronRight size={10} /></button>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {kycQueue.map((k, i) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all group/row">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 bg-slate-50 border border-slate-100 text-slate-900 rounded-xl flex items-center justify-center font-medium group-hover/row:bg-slate-900 group-hover/row:text-white transition-all">
                                        {k.type === 'KYC' ? <ShieldCheck size={16} /> : <DollarSign size={16} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-medium text-slate-800 tracking-tight leading-none">{k.name}</p>
                                            <span className={`text-[7px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-normal ${k.type === 'KYC' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>{k.type}</span>
                                        </div>
                                        <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">{k.time} • Live System</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate(k.type === 'KYC' ? '/admin/kyc' : '/admin/withdrawals')} className="bg-white border border-slate-100 text-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-normal shadow-sm hover:bg-slate-900 hover:text-white transition-all">Review</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance & Shortcuts */}
                <div className="grid grid-cols-2 gap-3 h-full font-poppins">
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between group">
                        <div className="flex justify-between items-start">
                             <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100"><PieChart size={16} /></div>
                             <span className="text-[8px] font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">82% Cap</span>
                        </div>
                        <div className="mt-3">
                             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-1">Monthly Target</p>
                             <h4 className="text-lg font-medium text-slate-900 tracking-tighter">₹4.82k <span className="text-[9px] font-medium text-slate-300">/ 6L</span></h4>
                             <div className="w-full h-1 bg-slate-50 rounded-full mt-2 overflow-hidden">
                                 <div className="h-full bg-emerald-500 w-[82%] rounded-full shadow-lg shadow-emerald-100 transition-all duration-1000"></div>
                             </div>
                        </div>
                    </div>

                    <div onClick={() => navigate('/admin/reports')} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between group cursor-pointer hover:shadow-xl transition-all active:scale-95">
                        <div className="flex justify-between items-start">
                             <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform"><MessageSquare size={16} /></div>
                             <div className="flex -space-x-2">
                                 {[...Array(3)].map((_, i) => <div key={i} className="w-5 h-5 rounded-full bg-slate-50 border border-white shadow-sm"></div>)}
                             </div>
                        </div>
                        <div className="mt-3">
                             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-normal mb-1">Open Tickets</p>
                             <h4 className="text-base font-medium text-slate-900 tracking-tight">14 Active</h4>
                             <p className="text-[8px] font-medium text-indigo-500 mt-1 flex items-center gap-1 uppercase tracking-normal">Respond Now <ChevronRight size={8} /></p>
                        </div>
                    </div>

                    {[
                        { label: 'Marketing', icon: Sparkles, path: '/admin/marketing-content', bg: 'bg-[#FDF2D0]', color: 'text-[#856404]', border: 'border-[#F9E9B8]' },
                        { label: 'Logs', icon: Info, path: '/admin/settings', bg: 'bg-slate-50', color: 'text-slate-500', border: 'border-slate-100' }
                    ].map((btn, i) => (
                        <div key={i} onClick={() => navigate(btn.path)} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 group cursor-pointer hover:bg-slate-50 transition-all active:scale-95">
                            <div className={`w-9 h-9 ${btn.bg} ${btn.color} ${btn.border} border rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                <btn.icon size={18} />
                            </div>
                            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-normal">{btn.label}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
