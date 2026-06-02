import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, CheckCircle2, Timer, Calendar, ShieldCheck, Sparkles, Coins, Loader2, Play } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import api from '../../shared/services/api';

const FutureFund = () => {
    const navigate = useNavigate();
    const { userData, addNotification } = useUser();
    const { futureFund } = userData;
    const [viewState, setViewState] = useState(futureFund.status === 'active' ? 'active' : 'initial'); // initial, active
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [settings, setSettings] = useState({
        futureFundDailyTasksTarget: 10,
        futureFundWatchAdTarget: 5,
        futureFundEventsTarget: 3,
        futureFundBoostersTarget: 1
    });

    // Fetch dynamic settings from admin panel
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setSettings({
                        futureFundDailyTasksTarget: Number(res.data.futureFundDailyTasksTarget) || 10,
                        futureFundWatchAdTarget: Number(res.data.futureFundWatchAdTarget) || 5,
                        futureFundEventsTarget: Number(res.data.futureFundEventsTarget) || 3,
                        futureFundBoostersTarget: Number(res.data.futureFundBoostersTarget) || 1
                    });
                }
            } catch (err) {
                console.error("FF settings fetch error:", err);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    // Simulated auto-move forward to eligible state on timer
    useEffect(() => {
        const timer = setTimeout(() => {
            if (viewState === 'initial') {
                addNotification("Eligibility Updated!", "Congratulations! You are now eligible to move forward in Future Fund.", "success");
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [viewState]);

    // Calculate user activity counts dynamically
    const completedTasksCount = useMemo(() => {
        return taskStorage.getCompletedTasks().length;
    }, []);

    const watchedAdsCount = userData.watchedAdsCount || 0;

    const eventsJoinedCount = useMemo(() => {
        try {
            const joined = JSON.parse(localStorage.getItem('dromoney_joined_events') || '[]');
            return Array.isArray(joined) ? joined.length : 1;
        } catch (e) {
            return 1;
        }
    }, []);

    const isBoosterActiveCount = userData.isBoosterActive ? 1 : 0;

    // ── Real earnings data computed from DB transactions ──
    const realEarningsData = useMemo(() => {
        const transactions = userData.wallet?.transactions || [];

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const todayFF = transactions
            .filter(tx => {
                const txDate = new Date(tx.createdAt);
                return tx.type === 'credit' && tx.status === 'Success' && txDate >= todayStart;
            })
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const totalFF = transactions
            .filter(tx => tx.type === 'credit' && tx.status === 'Success')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const dayTotal = transactions
                .filter(tx => {
                    const txDate = new Date(tx.createdAt);
                    return tx.type === 'credit' && tx.status === 'Success' && txDate >= dayStart && txDate <= dayEnd;
                })
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `Day ${7 - i}`;
            last7Days.push({ day: label, amount: dayTotal.toFixed(2) });
        }

        return { todayFF: todayFF.toFixed(2), totalFF: totalFF.toFixed(2), last7Days };
    }, [userData.wallet?.transactions]);

    // Handle forward unlock / simulation
    const handleMoveForward = async () => {
        // Instant visual feedback and transition
        setViewState('active');
        addNotification("Success!", "Future Fund activated!", "success");
        
        try {
            // Asynchronously notify backend of activation
            await api.post('/user/data/future-fund/unlock');
        } catch (err) {
            console.log("Async FF unlock handled:", err);
        }
    };

    if (loadingSettings) {
        return (
            <div className="p-8 text-center text-slate-800 min-h-screen bg-slate-50 flex flex-col items-center justify-center font-medium tracking-wider gap-3">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                <p className="text-xs uppercase font-medium text-slate-400">Loading Fund Dashboard...</p>
            </div>
        );
    }

    if (viewState === 'active') {
        return (
            <div className="flex flex-col min-h-screen bg-[#F8FAFC] animate-in slide-in-from-right duration-500 pb-12 font-poppins selection:bg-blue-100">
                {/* ── Compact Header ── */}
                <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40 shadow-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <button onClick={() => setViewState('initial')} className="text-slate-600 active:scale-90 transition-all shrink-0">
                            <ChevronLeft size={22} strokeWidth={2.5} />
                        </button>
                        <h1 className="text-[13px] sm:text-[14px] font-medium text-slate-800 tracking-tight uppercase truncate">Future Fund Active</h1>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[8.5px] font-medium uppercase tracking-wider border border-emerald-100 whitespace-nowrap shrink-0">Active Stage</span>
                </div>

                <div className="p-3 space-y-2.5 max-w-md mx-auto w-full">
                    {/* Compact Congratulations Banner */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
                        <span className="text-xl shrink-0">🎉</span>
                        <div>
                            <h4 className="text-[11px] font-medium text-emerald-800 leading-none">Congratulations!</h4>
                            <p className="text-[9.5px] font-medium text-emerald-600/90 mt-1 leading-snug">आप Future Fund के लिए eligible हो गए हैं।</p>
                        </div>
                    </div>

                    {/* Compact Side-by-Side Earnings Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Today's Earning Box */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                            <p className="text-[8.5px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Today FF Earning</p>
                            <div>
                                <h2 className="text-xl font-medium text-slate-800 leading-none">₹{realEarningsData.todayFF}</h2>
                                <p className="text-[8px] font-medium text-slate-400 mt-1">Auto-credit to wallet</p>
                            </div>
                        </div>

                        {/* Total Future Fund */}
                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                            <p className="text-[8.5px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Total Future Fund</p>
                            <div>
                                <h2 className="text-xl font-medium text-blue-600 leading-none">₹{realEarningsData.totalFF}</h2>
                                <p className="text-[8px] font-medium text-slate-400 mt-1">Based on performance</p>
                            </div>
                        </div>
                    </div>

                    {/* Compact Last 7 Days Earnings */}
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-3 py-2 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h4 className="text-[8.5px] font-medium text-slate-600 uppercase tracking-widest">Last 7 Days Earnings</h4>
                            <span className="text-[8px] font-medium text-blue-500 uppercase tracking-wider">Passive Flow</span>
                        </div>
                        <div className="divide-y divide-slate-50 px-3 py-1.5">
                            {realEarningsData.last7Days.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1 text-[11px]">
                                    <span className="font-medium text-slate-500">{item.day}</span>
                                    <span className={`font-medium ${Number(item.amount) > 0 ? 'text-slate-800' : 'text-slate-400'}`}>₹{item.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Today's Activity Section (Extremely Compact, Clean, and Dynamic) */}
                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                            <h4 className="text-[10px] font-medium text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Timer size={12} className="text-blue-500" />
                                Today's Activity Progress
                            </h4>
                            <span className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">Dynamic</span>
                        </div>

                        {/* Progress Item 1: Daily Tasks */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                                <span className="text-slate-800">Daily Tasks Activity</span>
                                <span className="font-medium text-blue-600">
                                    {completedTasksCount} / {settings.futureFundDailyTasksTarget}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full shadow-sm transition-all duration-1000"
                                    style={{ width: `${Math.min((completedTasksCount / settings.futureFundDailyTasksTarget) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Progress Item 2: Watch Ad Activity */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                                <span className="text-slate-800">Watch Ad Activity</span>
                                <span className="font-medium text-emerald-600">
                                    {watchedAdsCount} / {settings.futureFundWatchAdTarget}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full shadow-sm transition-all duration-1000"
                                    style={{ width: `${Math.min((watchedAdsCount / settings.futureFundWatchAdTarget) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Progress Item 3: Events Joined */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                                <span className="text-slate-800">Events Joined</span>
                                <span className="font-medium text-amber-600">
                                    {eventsJoinedCount} / {settings.futureFundEventsTarget}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 rounded-full shadow-sm transition-all duration-1000"
                                    style={{ width: `${Math.min((eventsJoinedCount / settings.futureFundEventsTarget) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Progress Item 4: Active Boosters */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                                <span className="text-slate-800">Boosters Active</span>
                                <span className={`font-medium ${isBoosterActiveCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {isBoosterActiveCount} / {settings.futureFundBoostersTarget}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${isBoosterActiveCount > 0 ? 'bg-rose-500' : 'bg-slate-300'} rounded-full shadow-sm transition-all duration-1000`}
                                    style={{ width: `${Math.min((isBoosterActiveCount / settings.futureFundBoostersTarget) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden animate-in slide-in-from-right duration-500 pb-10 font-poppins">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[50%] bg-purple-200/40 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[-20%] w-[70%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]"></div>
            </div>

            <div className="flex-1 space-y-3 relative z-10 max-w-md mx-auto w-full">
                {/* Full Width Compact Hero Card */}
                <div className="w-full bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-500 rounded-b-3xl p-3 pb-4 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-2">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-8 h-8 flex items-center justify-center text-white active:scale-75 transition-all z-[100] cursor-pointer"
                            >
                                <ChevronLeft size={22} strokeWidth={2.5} />
                            </button>
                            
                            <div className="flex items-center gap-2 flex-1 justify-center pr-8">
                                <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-sm">
                                    <TrendingUp size={14} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-[13px] font-medium tracking-tight leading-none uppercase">Future Fund</h2>
                                    <p className="text-[7px] font-medium text-white/70 uppercase tracking-widest mt-0.5">Eligibility Program</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Area */}
                        <div className="w-full max-w-[260px] bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] font-medium uppercase tracking-widest text-white/80">Progress Status</span>
                                <span className="text-[11px] font-medium">90%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                                    style={{ width: `90%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 space-y-3.5">
                    {/* Compact Description Section */}
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-xl relative overflow-hidden border-b-4 border-purple-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl text-white"></div>
                        <h3 className="text-[8px] font-medium text-purple-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                            <Sparkles size={11} />
                            PROGRAM INSIGHT
                        </h3>
                        <p className="text-[12px] font-medium text-slate-300 leading-normal italic border-l-2 border-purple-500/50 pl-3">
                            "Future Fund is a long-term passive income opportunity. Once activated, users get direct profit-sharing of the platform on everyday activities."
                        </p>
                    </div>

                    {/* Eligibility Criteria Cards (Made Highly Compact & Beautiful) */}
                    <div className="grid grid-cols-1 gap-2.5">
                        {/* 1. Successful Sales */}
                        <div className="relative bg-white p-3.5 shadow-sm border border-slate-100 transition-all rounded-2xl">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-medium text-slate-800 uppercase leading-none">Successful Sales</h4>
                                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Target Milestone</p>
                                    </div>
                                </div>
                                <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-700">10/10</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* 2. Daily Activity */}
                        <div className="relative bg-white p-3.5 shadow-sm border border-slate-100 transition-all rounded-2xl">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                                        <Timer size={16} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-medium text-slate-800 uppercase leading-none">Daily Activity</h4>
                                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Time Tracker</p>
                                    </div>
                                </div>
                                <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-700">15m/15m</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                                <div className="h-full bg-amber-500" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* 3. Active Days */}
                        <div className="relative bg-white p-3.5 shadow-sm border border-slate-100 transition-all rounded-2xl">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                                        <Calendar size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-medium text-slate-800 uppercase leading-none">Active Days</h4>
                                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Continuity Goal</p>
                                    </div>
                                </div>
                                <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-700">6/7</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: '85%' }}></div>
                            </div>
                        </div>

                        {/* Info Box (Made Very Small & Elegant) */}
                        <div className="bg-slate-950 text-white p-3.5 rounded-2xl flex gap-2.5 items-center">
                            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/5">
                                <Sparkles size={13} className="text-purple-400" />
                            </div>
                            <p className="text-[9.5px] font-medium text-slate-300 leading-snug">
                                आपका समय <span className="text-white font-medium">स्वचालित रूप से</span> गिना जाएगा। 15 मिनट = 1 दिन।
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-1.5 space-y-2.5">
                            <button
                                onClick={handleMoveForward}
                                className="w-full bg-slate-900 hover:bg-black border-b-4 border-purple-600 text-white font-medium py-3.5 shadow-lg rounded-2xl active:scale-[0.98] transition-all text-[13px] tracking-wider uppercase flex items-center justify-center gap-2"
                            >
                                MOVE FORWARD ➔
                            </button>

                            <button
                                onClick={() => navigate(-1)}
                                className="w-full bg-white text-slate-500 font-medium py-3 rounded-2xl text-[10px] active:scale-[0.98] transition-all tracking-wider uppercase border border-slate-200 shadow-sm text-center"
                            >
                                Continue Earning
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FutureFund;
