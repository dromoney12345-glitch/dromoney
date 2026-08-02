import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, TrendingUp, CheckCircle2, Timer, Calendar,
    Sparkles, Loader2, Users, Info
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import UnlockModal from '../components/UnlockModal';

const FutureFund = () => {
    const navigate = useNavigate();
    const { userData, addNotification, refreshUserProfile } = useUser();
    const [viewState, setViewState] = useState('initial');
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [ffStatus, setFfStatus] = useState(null);
    const [settings, setSettings] = useState({
        futureFundDailyTasksTarget: 10,
        futureFundWatchAdTarget: 5,
        futureFundEventsTarget: 3,
        futureFundBoostersTarget: 1,
    });

    const loadStatus = useCallback(async () => {
        try {
            const [statusRes, settingsRes] = await Promise.all([
                api.get('/user/data/future-fund/status'),
                api.get('/public/settings'),
            ]);

            if (statusRes.success) {
                setFfStatus(statusRes.data);
                if (statusRes.data.status === 'active') {
                    setViewState('active');
                }
            }

            if (settingsRes.success && settingsRes.data) {
                setSettings({
                    futureFundDailyTasksTarget: Number(settingsRes.data.futureFundDailyTasksTarget) || 10,
                    futureFundWatchAdTarget: Number(settingsRes.data.futureFundWatchAdTarget) || 5,
                    futureFundEventsTarget: Number(settingsRes.data.futureFundEventsTarget) || 3,
                    futureFundBoostersTarget: Number(settingsRes.data.futureFundBoostersTarget) || 1,
                });
            }
        } catch (err) {
            console.error('FF status fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
        const t = setInterval(loadStatus, 60 * 1000);
        return () => clearInterval(t);
    }, [loadStatus]);

    // Today's activity metrics (post-activation dashboard)
    const completedTasksCount = useMemo(() => {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        return (userData.dailyTaskCompletions || []).filter(
            (c) => new Date(c.completedAt) >= since
        ).length;
    }, [userData.dailyTaskCompletions]);

    const watchedAdsCount = userData.watchedAdsCount || userData.todayRewardCount || 0;
    const isBoosterActiveCount =
        userData.isBoosterActive || userData.isTaskBoosterActive || userData.isSupportBoosterActive
            ? 1
            : 0;

    const [eventsJoinedCount, setEventsJoinedCount] = useState(0);
    useEffect(() => {
        try {
            const joined = JSON.parse(localStorage.getItem('dromoney_joined_events') || '[]');
            setEventsJoinedCount(Array.isArray(joined) ? joined.length : 0);
        } catch {
            setEventsJoinedCount(0);
        }
    }, []);

    const salesCriterion = ffStatus?.criteria?.find((c) => c.id === 1) || {
        current: 0,
        target: ffStatus?.targets?.salesTarget || 10,
        completed: false,
        description: '',
    };
    const activityCriterion = ffStatus?.criteria?.find((c) => c.id === 2) || {
        current: 0,
        target: ffStatus?.targets?.activityMinutesTarget || 15,
        completed: false,
        description: '',
    };
    const daysCriterion = ffStatus?.criteria?.find((c) => c.id === 3) || {
        current: 0,
        target: ffStatus?.targets?.daysTarget || 7,
        completed: false,
        description: '',
    };

    const isEligible = !!ffStatus?.eligible;
    const overallProgress = ffStatus?.progress || 0;
    const minsTarget = ffStatus?.targets?.activityMinutesTarget || 15;

    const realEarningsData = useMemo(() => {
        const transactions = userData.wallet?.transactions || [];
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const isFfTx = (tx) =>
            tx.type === 'credit' &&
            tx.status === 'Success' &&
            String(tx.source || tx.title || '').toLowerCase().includes('future fund');

        const todayFF = transactions
            .filter((tx) => isFfTx(tx) && new Date(tx.createdAt || tx.date) >= todayStart)
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const totalFF = transactions
            .filter((tx) => isFfTx(tx))
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const dayTotal = transactions
                .filter((tx) => {
                    const txDate = new Date(tx.createdAt || tx.date);
                    return isFfTx(tx) && txDate >= dayStart && txDate <= dayEnd;
                })
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `Day ${7 - i}`;
            last7Days.push({ day: label, amount: dayTotal.toFixed(2) });
        }

        return { todayFF: todayFF.toFixed(2), totalFF: totalFF.toFixed(2), last7Days };
    }, [userData.wallet?.transactions]);

    const handleMoveForward = async () => {
        if (!isEligible || unlocking) return;
        setUnlocking(true);
        try {
            const res = await api.post('/user/data/future-fund/unlock');
            if (res.success) {
                setViewState('active');
                addNotification('Success!', 'Future Fund activated!', 'success');
                await refreshUserProfile?.(false);
                await loadStatus();
            } else {
                addNotification('Not ready', res.message || 'Complete all criteria first', 'error');
            }
        } catch (err) {
            addNotification('Not ready', err.message || 'Complete all criteria first', 'error');
            await loadStatus();
        } finally {
            setUnlocking(false);
        }
    };

    if (!userData?.isPaid) {
        return (
            <div className="min-h-screen bg-[#f8fafc] font-poppins">
                <UnlockModal isOpen={true} onClose={() => navigate('/user/income')} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-800 min-h-screen bg-slate-50 flex flex-col items-center justify-center font-medium tracking-wider gap-3">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                <p className="text-xs uppercase font-medium text-slate-400">Loading Fund Dashboard...</p>
            </div>
        );
    }

    if (viewState === 'active') {
        return (
            <div className="flex flex-col min-h-screen bg-[#F8FAFC] animate-in slide-in-from-right duration-500 pb-12 font-poppins">
                <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40 shadow-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <button type="button" onClick={() => setViewState('initial')} className="text-slate-600 active:scale-90 transition-all shrink-0">
                            <ChevronLeft size={22} strokeWidth={2.5} />
                        </button>
                        <h1 className="text-[13px] sm:text-[14px] font-medium text-slate-800 tracking-tight uppercase truncate">Future Fund Active</h1>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[8.5px] font-medium uppercase tracking-wider border border-emerald-100 whitespace-nowrap shrink-0">Active Stage</span>
                </div>

                <div className="p-3 space-y-2.5 max-w-md mx-auto w-full">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
                        <span className="text-xl shrink-0">🎉</span>
                        <div>
                            <h4 className="text-[11px] font-medium text-emerald-800 leading-none">Congratulations!</h4>
                            <p className="text-[9.5px] font-medium text-emerald-600/90 mt-1 leading-snug">You are now eligible for the Future Fund.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                            <p className="text-[8.5px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Today FF Earning</p>
                            <h2 className="text-xl font-medium text-slate-800 leading-none">₹{realEarningsData.todayFF}</h2>
                            <p className="text-[8px] font-medium text-slate-400 mt-1">Auto-credit to wallet</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                            <p className="text-[8.5px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Total Future Fund</p>
                            <h2 className="text-xl font-medium text-blue-600 leading-none">₹{realEarningsData.totalFF}</h2>
                            <p className="text-[8px] font-medium text-slate-400 mt-1">Based on performance</p>
                        </div>
                    </div>

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

                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                            <h4 className="text-[10px] font-medium text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Timer size={12} className="text-blue-500" />
                                Today&apos;s Activity Progress
                            </h4>
                        </div>

                        {[
                            { label: 'Daily Tasks', current: completedTasksCount, target: settings.futureFundDailyTasksTarget, color: 'bg-blue-500', text: 'text-blue-600' },
                            { label: 'Watch Ads', current: watchedAdsCount, target: settings.futureFundWatchAdTarget, color: 'bg-emerald-500', text: 'text-emerald-600' },
                            { label: 'Events Joined', current: eventsJoinedCount, target: settings.futureFundEventsTarget, color: 'bg-amber-500', text: 'text-amber-600' },
                            { label: 'Boosters Active', current: isBoosterActiveCount, target: settings.futureFundBoostersTarget, color: 'bg-rose-500', text: 'text-rose-500' },
                        ].map((row) => (
                            <div key={row.label} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                                    <span className="text-slate-800">{row.label}</span>
                                    <span className={`font-medium ${row.text}`}>{row.current} / {row.target}</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${row.color} rounded-full transition-all duration-700`}
                                        style={{ width: `${Math.min((row.current / Math.max(row.target, 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const criteriaCards = [
        {
            key: 'sales',
            title: 'Successful Sales',
            subtitle: 'Paid referrals',
            icon: Users,
            iconBg: 'bg-emerald-50 border-emerald-100',
            iconColor: 'text-emerald-600',
            bar: 'bg-emerald-500',
            current: salesCriterion.current,
            target: salesCriterion.target,
            completed: salesCriterion.completed,
            display: `${salesCriterion.current}/${salesCriterion.target}`,
            how: `Get ${salesCriterion.target} people to unlock the platform using your referral code. Registration alone is not enough — their payment must succeed.`,
        },
        {
            key: 'activity',
            title: 'Daily Activity',
            subtitle: 'Minutes today',
            icon: Timer,
            iconBg: 'bg-amber-50 border-amber-100',
            iconColor: 'text-amber-600',
            bar: 'bg-amber-500',
            current: activityCriterion.current,
            target: activityCriterion.target,
            completed: activityCriterion.completed,
            display: `${activityCriterion.current}m/${activityCriterion.target}m`,
            how: `Keep the app open and use it — time is counted automatically. Complete ${minsTarget} minutes today to finish this criterion.`,
        },
        {
            key: 'days',
            title: 'Active Days',
            subtitle: 'Continuity goal',
            icon: Calendar,
            iconBg: 'bg-blue-50 border-blue-100',
            iconColor: 'text-blue-600',
            bar: 'bg-blue-500',
            current: daysCriterion.current,
            target: daysCriterion.target,
            completed: daysCriterion.completed,
            display: `${daysCriterion.current}/${daysCriterion.target}`,
            how: `Any day you complete ${minsTarget} minutes of activity counts as 1 Active Day. You need ${daysCriterion.target} different days.`,
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden animate-in slide-in-from-right duration-500 pb-10 font-poppins">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[50%] bg-purple-200/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-20%] w-[70%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]" />
            </div>

            <div className="flex-1 space-y-3 relative z-10 max-w-md mx-auto w-full">
                <div className="w-full bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-500 rounded-b-3xl p-3 pb-4 text-white relative overflow-hidden shadow-xl">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-2">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-8 h-8 flex items-center justify-center text-white active:scale-75 transition-all"
                            >
                                <ChevronLeft size={22} strokeWidth={2.5} />
                            </button>
                            <div className="flex items-center gap-2 flex-1 justify-center pr-8">
                                <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                    <TrendingUp size={14} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-[13px] font-medium tracking-tight leading-none uppercase">Future Fund</h2>
                                    <p className="text-[7px] font-medium text-white/70 uppercase tracking-widest mt-0.5">Eligibility Program</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full max-w-[260px] bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] font-medium uppercase tracking-widest text-white/80">Progress Status</span>
                                <span className="text-[11px] font-medium">{overallProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 space-y-3.5">
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-xl relative overflow-hidden border-b-4 border-purple-500">
                        <h3 className="text-[8px] font-medium text-purple-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                            <Sparkles size={11} />
                            PROGRAM INSIGHT
                        </h3>
                        <p className="text-[12px] font-medium text-slate-300 leading-normal italic border-l-2 border-purple-500/50 pl-3">
                            Future Fund unlock ke baad platform profit-sharing milti hai. Neeche 3 criteria complete karni hongi — ye real-time update hoti hain.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        {criteriaCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.key} className={`relative bg-white p-3.5 shadow-sm border transition-all rounded-2xl ${card.completed ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-100'}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 ${card.iconBg} rounded-xl flex items-center justify-center border shrink-0`}>
                                                <Icon size={16} className={card.iconColor} />
                                            </div>
                                            <div>
                                                <h4 className="text-[12px] font-medium text-slate-800 uppercase leading-none flex items-center gap-1.5">
                                                    {card.title}
                                                    {card.completed && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                </h4>
                                                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{card.subtitle}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${card.completed ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            {card.display}
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                                        <div
                                            className={`h-full ${card.bar} transition-all duration-700`}
                                            style={{ width: `${Math.min((card.current / Math.max(card.target, 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 leading-snug flex gap-1.5">
                                        <Info size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                        <span>{card.how}</span>
                                    </p>
                                </div>
                            );
                        })}

                        <div className="bg-slate-950 text-white p-3.5 rounded-2xl flex gap-2.5 items-start">
                            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/5 mt-0.5">
                                <Sparkles size={13} className="text-purple-400" />
                            </div>
                            <p className="text-[9.5px] font-medium text-slate-300 leading-snug">
                                <span className="text-white font-semibold">When does it activate?</span> When all three criteria are complete —
                                {' '}{salesCriterion.target} successful sales + {minsTarget} min activity today + {daysCriterion.target} active days.
                                Minutes are counted automatically while you use the app.
                            </p>
                        </div>

                        <div className="pt-1.5 space-y-2.5">
                            <button
                                type="button"
                                onClick={handleMoveForward}
                                disabled={!isEligible || unlocking}
                                className={`w-full ${isEligible ? 'bg-slate-900 hover:bg-black border-b-4 border-purple-600 text-white shadow-lg active:scale-[0.98]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} font-medium py-3.5 rounded-2xl transition-all text-[13px] tracking-wider uppercase flex items-center justify-center gap-2`}
                            >
                                {unlocking ? (
                                    <><Loader2 size={16} className="animate-spin" /> Activating…</>
                                ) : isEligible ? (
                                    'MOVE FORWARD ➔'
                                ) : (
                                    'NOT ELIGIBLE YET'
                                )}
                            </button>

                            <button
                                type="button"
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
