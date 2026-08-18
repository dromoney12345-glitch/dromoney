import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { getLastRenewalTick, isWithinTaskWindow } from '../../shared/utils/taskRenewal';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, ChevronDown,
    Monitor, Play, Lightbulb, Disc, MessageCircle,
    Camera, ThumbsUp, MessageSquare, Link2,
    Coins, Bell, ClipboardList, TrendingUp, AlertCircle, Rocket, Zap, CheckCircle2, RefreshCw
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import PaymentModal from '../components/PaymentModal';

const ICON_MAP = {
    Monitor: { el: Monitor, bg: 'bg-sky-100', color: 'text-sky-500' },
    Youtube: { el: Play, bg: 'bg-red-100', color: 'text-red-500' },
    YouTube: { el: Play, bg: 'bg-red-100', color: 'text-red-500' },
    Lightbulb: { el: Lightbulb, bg: 'bg-yellow-100', color: 'text-yellow-500' },
    Disc: { el: Disc, bg: 'bg-orange-100', color: 'text-orange-500' },
    MessageCircle: { el: MessageCircle, bg: 'bg-green-100', color: 'text-green-500' },
    Instagram: { el: Camera, bg: 'bg-pink-100', color: 'text-pink-500' },
    ThumbsUp: { el: ThumbsUp, bg: 'bg-rose-100', color: 'text-rose-500' },
    MessageSquare: { el: MessageSquare, bg: 'bg-cyan-100', color: 'text-cyan-500' },
    Link: { el: Link2, bg: 'bg-indigo-100', color: 'text-indigo-500' },
    Camera: { el: Camera, bg: 'bg-pink-100', color: 'text-pink-500' },
    Zap: { el: Zap, bg: 'bg-purple-100', color: 'text-purple-500' },
    Rocket: { el: Rocket, bg: 'bg-rose-100', color: 'text-rose-500' },
    Telegram: { el: MessageCircle, bg: 'bg-blue-100', color: 'text-blue-500' },
    WhatsApp: { el: MessageSquare, bg: 'bg-green-100', color: 'text-green-500' },
    TrendingUp: { el: TrendingUp, bg: 'bg-emerald-100', color: 'text-emerald-500' },
};

import api from '../../shared/services/api';

const Earn = () => {
    const { userData, refreshUserProfile, boostersConfig, fetchNotifications } = useUser();
    const { isPaid, isBoosterActive } = userData;
    const isTaskBoosterActive = userData?.isTaskBoosterActive;
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [isBoosterExpanded, setIsBoosterExpanded] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const navigate = useNavigate();
    const [isRefreshingCoins, setIsRefreshingCoins] = useState(false);

    const handleRefreshCoins = async () => {
        setIsRefreshingCoins(true);
        await refreshUserProfile(false);
        await loadTasks();
        await loadSettings();
        setIsRefreshingCoins(false);
    };

    const loadSettings = async () => {
        try {
            const res = await api.get('/public/settings');
            if (res.success && res.data) {
                setSettings(res.data);
                setIsWithinWindow(isWithinTaskWindow(res.data.taskWindowStart, res.data.taskWindowEnd));
            }
        } catch (err) {}
    };

    useEffect(() => {
        // Fetch latest booster config immediately when user visits earn page without hard refresh
        if (fetchNotifications) fetchNotifications();
    }, []);

    // DYNAMIC TASKS STATE
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [isWithinWindow, setIsWithinWindow] = useState(true);
    const [boosterData, setBoosterData] = useState({ title: '₹49 Daily Boost Pass', subtitle: 'Priority Enabled', price: 49, benefits: [] });
    const [taskMultiplier, setTaskMultiplier] = useState(12);

    const loadTasks = async () => {
        try {
            const res = await api.get('/public/tasks');
            console.log("Earn: Fetched tasks from server:", res.data);
            if (res.success && res.data && res.data.length > 0) {
                setTasks(res.data);
                taskStorage.syncTasks(res.data);
            } else {
                console.log("Earn: Using local tasks fallback");
                setTasks(taskStorage.getTasks());
            }
        } catch (err) {
            setTasks(taskStorage.getTasks());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
        
        const loadBoosters = async () => {
            try {
                const res = await api.get('/public/boosters');
                if (res.success && res.data) {
                    const taskBooster = res.data.find(b => b.type === 'task');
                    if (taskBooster) {
                        const pricePrefix = `₹${taskBooster.price} `;
                        if (!taskBooster.title.includes('₹')) {
                            taskBooster.title = pricePrefix + taskBooster.title;
                        }
                        let parsedMultiplier = 12;
                        if (taskBooster.benefits) {
                            for (const b of taskBooster.benefits) {
                                const match = b.match(/(\d+)x/i);
                                if (match) {
                                    parsedMultiplier = parseInt(match[1]);
                                    break;
                                }
                            }
                        }
                        setTaskMultiplier(parsedMultiplier);

                        setBoosterData({
                            title: taskBooster.title,
                            subtitle: taskBooster.subtitle || 'Priority Enabled',
                            price: taskBooster.price || 49,
                            benefits: taskBooster.benefits || []
                        });
                    }
                }
            } catch (err) {}
        };

        loadBoosters();
        loadSettings();

        // Re-check task window every minute (IST) so open/close matches admin schedule
        const timer = setInterval(() => {
            setSettings((prev) => {
                if (prev?.taskWindowStart && prev?.taskWindowEnd) {
                    setIsWithinWindow(isWithinTaskWindow(prev.taskWindowStart, prev.taskWindowEnd));
                }
                return prev;
            });
        }, 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hr12 = hours % 12 || 12;
        return `${hr12}:${m} ${ampm}`;
    };

    // Admin-aligned renewal tick (IST). Completions before this are available again.
    const lastRenewalTick = useMemo(
        () => getLastRenewalTick(settings || {}),
        [settings?.taskWindowStart, settings?.taskRenewalHours]
    );

    useEffect(() => {
        // Drop stale local completions so mobile doesn't keep tasks permanently claimed
        taskStorage.clearCompletedBefore(lastRenewalTick);
    }, [lastRenewalTick]);

    const isTaskCompleted = (taskId) => {
        const id = String(taskId);
        const sinceMs = lastRenewalTick.getTime();

        if (userData.dailyTaskCompletions?.some(c =>
            String(c.taskId) === id &&
            new Date(c.completedAt).getTime() >= sinceMs
        )) {
            return true;
        }

        // Local fallback only for the current renewal cycle
        return taskStorage.getCompletedTasks(lastRenewalTick).includes(id);
    };

    const totalCount = tasks.length;
    const completedCount = tasks.filter(task => isTaskCompleted(task._id || task.id)).length;
    const remainingCount = Math.max(0, totalCount - completedCount);

    const handleTaskClick = (task) => {
        const taskId = task._id || task.id;
        if (isTaskCompleted(taskId)) {
            return;
        }

        switch (task.type) {
            case 'Quiz':
                navigate(`/user/task-quiz/${taskId}`);
                break;
            case 'Spin':
                navigate(`/user/lucky-draw/${taskId}`);
                break;
            case 'Memory':
                navigate(`/user/memory-master/${taskId}`);
                break;
            case 'Treasure':
                navigate(`/user/treasure-chest/${taskId}`);
                break;
            case 'Scratch':
                navigate(`/user/scratch-card/${taskId}`);
                break;
            case 'Tapper':
                navigate(`/user/speed-tapper/${taskId}`);
                break;
            default:
                navigate(`/user/task/${taskId}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#FCF8F5] font-poppins">
            <div className="bg-[#FCF8F5] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-[17px] font-medium text-[#462211] tracking-tight">Tasks</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full border border-slate-200 active:scale-95 transition-all">
                        <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                        <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                            <Coins size={11} className="text-white" />
                        </div>
                        <span className="text-[13px] font-medium text-amber-700">{userData.coins?.total || 0}</span>
                    </div>
                </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto pb-4">

                {/* Daily Tasks Summary Card */}
                <div className="mx-4 mt-4 bg-white px-5 py-4 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[13px] font-medium text-slate-800 tracking-tight flex items-center gap-1">
                            Daily Tasks Avld{' '}
                            <span className="text-[#3B82F6] font-medium">Available: {totalCount}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-medium text-slate-400">
                                Completed: <span className="text-[#10B981] font-medium">{completedCount}</span>
                             </span>
                             <span className="text-[11px] font-medium text-slate-400">
                                Remaining: <span className="text-[#F97316] font-medium">{remainingCount}</span>
                             </span>
                        </div>
                    </div>
                    {/* Coin Bag Illustration */}
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl border border-amber-100 shadow-sm shrink-0">
                        💰
                    </div>
                </div>

                {settings?.taskWindowStart && settings?.taskWindowEnd && (
                    <div className="mx-4 mt-4 bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-sky-500 text-lg">⏰</span>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-0.5">Operating Hours</h4>
                            <p className="text-[11px] font-medium text-slate-600">
                                Tasks are open between <span className="text-sky-600 font-bold">{formatTime(settings.taskWindowStart)}</span> and <span className="text-sky-600 font-bold">{formatTime(settings.taskWindowEnd)}</span> daily.
                            </p>
                        </div>
                    </div>
                )}

                {!isWithinWindow && (
                    <div className="mx-4 mt-4 bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-rose-100">
                            <span className="text-3xl opacity-80">😴</span>
                        </div>
                        <h3 className="text-[15px] font-semibold text-rose-800 tracking-tight">Tasks are Sleeping!</h3>
                        <p className="text-[12px] font-medium text-rose-600/80 mt-2 leading-relaxed">
                            Come back during the operating hours to earn more coins.
                        </p>
                    </div>
                )}

                {/* ── Task List ── */}
                {isWithinWindow && (
                <div className="flex flex-col gap-0 mt-4">
                    {tasks.map((task, idx) => {
                        const taskId = task._id || task.id;
                        const iconConfig = ICON_MAP[task.icon] || ICON_MAP[task.category] || ICON_MAP['Monitor'];
                        const IconEl = iconConfig.el;
                        
                        const isCompleted = isTaskCompleted(taskId);

                        return (
                            <div
                                key={taskId}
                                onClick={() => handleTaskClick(task)}
                                className={`bg-white border-b border-slate-100 px-5 py-3.5 flex items-center gap-4 transition-all ${isCompleted ? 'opacity-60 cursor-default' : 'active:bg-slate-50 cursor-pointer'}`}
                            >
                                {/* Pastel Rounded Icon */}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                                    isCompleted ? 'bg-slate-100 text-slate-400' : `${iconConfig.bg} ${iconConfig.color}`
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={24} className="text-emerald-500" />
                                    ) : (
                                        <IconEl size={24} />
                                    )}
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0 pr-3">
                                    <h4 className={`text-[14px] font-medium tracking-tight leading-snug truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {task.title}
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1 leading-snug line-clamp-2 break-words">
                                        {isCompleted ? 'Completed' : task.description}
                                    </p>
                                </div>

                                {/* Right Side: Coins & Action */}
                                <div className="flex flex-col items-end gap-1.5 min-w-[85px] shrink-0">
                                    {(() => {
                                        const getTaskOptionName = (type) => {
                                            switch (type) {
                                                case 'Quiz': return 'Task Quiz';
                                                case 'Spin': return 'Lucky Draw';
                                                case 'Memory': return 'Memory Master';
                                                case 'Treasure': return 'Treasure Chest';
                                                case 'Scratch': return 'Scratch Card';
                                                case 'Tapper': return 'Speed Tapper';
                                                case 'Watch': 
                                                case 'Video': return 'Watch & Earn';
                                                default: return 'General Tasks';
                                            }
                                        };
                                        const taskOptionName = getTaskOptionName(task.type);
                                        const isWatchTask = task.type === 'Video' || task.type === 'Watch';
                                        const watchEnabledByAdmin = Array.isArray(boostersConfig?.task) &&
                                            boostersConfig.task.some((t) => String(t).toLowerCase().includes('watch'));
                                        const apply3x = isTaskBoosterActive &&
                                            (!isWatchTask || watchEnabledByAdmin) &&
                                            (!boostersConfig?.task?.length || boostersConfig.task.includes(taskOptionName));
                                        const baseCoins = task.coinsReward || task.reward || 0;
                                        const displayCoins = apply3x ? baseCoins * taskMultiplier : baseCoins;

                                        return (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                                    {displayCoins} Coins
                                                </span>
                                                {apply3x && (
                                                    <span className="text-[8px] font-bold text-[#F59E0B] whitespace-nowrap bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                                                        {taskMultiplier}x Booster Applied
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    
                                    {!isCompleted ? (
                                        <button className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-medium uppercase tracking-wider rounded-xl shadow-sm transition-all duration-200 active:scale-95 leading-none min-w-[76px] text-center">
                                            {task.type === 'Spin' ? 'Spin Now >' : (task.type === 'Proof' || task.type === 'Download' || task.type === 'Sponsored') ? 'Upload' : 'Complete'}
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                                            Claimed
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="p-8 text-center bg-white border-b border-slate-50">
                             <p className="text-slate-400 font-medium text-sm">No tasks available right now.</p>
                             <p className="text-slate-300 font-medium text-xs mt-1 uppercase tracking-widest">Check back soon</p>
                        </div>
                    )}
                </div>
                )}

                {/* ── Footer Banner ── */}
                <div className="mx-4 mt-4 bg-[#F59E0B] py-4 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-sm">
                    <span className="text-[13px] font-medium text-white tracking-wide uppercase flex items-center gap-1.5">
                        🪙 Complete tasks and earn coins!
                    </span>
                </div>

                {/* ── ₹49 Booster Card ── */}
                <div className="mx-0 mt-3 bg-emerald-50 border-y border-emerald-100 overflow-hidden">
                    {/* Card Header Row */}
                    <div className="px-5 py-3 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-medium text-slate-800 tracking-tight leading-none mb-1">{boosterData.title}</h4>
                            <p className="text-[9px] font-semibold text-emerald-600/80 uppercase tracking-[0.15em]">{boosterData.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsBoosterExpanded(!isBoosterExpanded)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isBoosterExpanded ? 'bg-amber-200 text-amber-900 rotate-180' : 'bg-white text-slate-400'
                                    }`}
                            >
                                <ChevronDown size={18} />
                            </button>
                            <button
                                onClick={() => !userData.isTaskBoosterActive && setIsPaymentOpen(true)}
                                disabled={userData.isTaskBoosterActive}
                                className={`${userData.isTaskBoosterActive ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'} px-4 py-2 rounded-xl text-[11px] font-medium tracking-tight active:scale-95 transition-all`}
                            >
                                {userData.isTaskBoosterActive ? 'Already Active' : 'Buy Now'}
                            </button>
                        </div>
                    </div>

                    {/* Expandable Benefits */}
                    {isBoosterExpanded && (
                        <div className="bg-white border-t border-amber-100 px-4 py-3 space-y-3">
                            {(boosterData.benefits && boosterData.benefits.length > 0 
                                ? boosterData.benefits.map((benefitStr, i) => ({
                                    icon: <Rocket size={16} className="text-emerald-500" fill="currentColor" />, 
                                    bg: 'bg-emerald-50', 
                                    title: benefitStr, 
                                    desc: 'Exclusive booster perk'
                                }))
                                : [
                                    { icon: <Coins size={16} className="text-amber-500" fill="currentColor" />, bg: 'bg-amber-50', title: `${taskMultiplier}X Coins on Tasks`, desc: `1 task = ${taskMultiplier} coins` },
                                    { icon: <Zap size={16} className="text-emerald-500" fill="currentColor" />, bg: 'bg-emerald-50', title: 'Fast Rewards Processing', desc: 'Priority handling' },
                                    { icon: <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />, bg: 'bg-blue-50', title: 'Priority Task Verification', desc: 'Get verified first' },
                                ]
                            ).map((b, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 ${b.bg} rounded-lg flex items-center justify-center shrink-0`}>
                                        {b.icon}
                                    </div>
                                    <div>
                                        <h5 className="text-[12px] font-medium text-slate-800 leading-tight">{b.title}</h5>
                                        <p className="text-[10px] font-medium text-slate-400 leading-none">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-6"></div>
            </div>

            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                amount={Math.round(boosterData.price * 1.04 * 100) / 100}
                type="TASK_BOOSTER"
                plan={boosterData.title}
                onSuccess={() => {
                    setIsPaymentOpen(false);
                    setIsBoosterExpanded(false);
                }}
            />
        </div>
    );
};

export default Earn;
