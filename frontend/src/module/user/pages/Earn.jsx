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
    Monitor: { el: Monitor, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    Youtube: { el: Play, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    YouTube: { el: Play, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    Lightbulb: { el: Lightbulb, bg: 'bg-[#FFF5F0]', color: 'text-[#9A8478]' },
    Disc: { el: Disc, bg: 'bg-[#F8EDE4]', color: 'text-[#7A5648]' },
    MessageCircle: { el: MessageCircle, bg: 'bg-[#F3E8E0]', color: 'text-[#462211]' },
    Instagram: { el: Camera, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    ThumbsUp: { el: ThumbsUp, bg: 'bg-[#F8EDE4]', color: 'text-[#5D2E17]' },
    MessageSquare: { el: MessageSquare, bg: 'bg-[#F3E8E0]', color: 'text-[#462211]' },
    Link: { el: Link2, bg: 'bg-[#FFF5F0]', color: 'text-[#7A5648]' },
    Camera: { el: Camera, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    Zap: { el: Zap, bg: 'bg-[#F8EDE4]', color: 'text-[#462211]' },
    Rocket: { el: Rocket, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
    Telegram: { el: MessageCircle, bg: 'bg-[#F3E8E0]', color: 'text-[#462211]' },
    WhatsApp: { el: MessageSquare, bg: 'bg-[#F3E8E0]', color: 'text-[#462211]' },
    TrendingUp: { el: TrendingUp, bg: 'bg-[#FFF5F0]', color: 'text-[#B3591C]' },
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
        if (fetchNotifications) fetchNotifications();
    }, []);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [isWithinWindow, setIsWithinWindow] = useState(true);
    const [boosterData, setBoosterData] = useState({ title: '₹49 Daily Boost Pass', subtitle: 'Priority Enabled', price: 49, benefits: [] });
    const [taskMultiplier, setTaskMultiplier] = useState(12);

    const loadTasks = async () => {
        try {
            const res = await api.get('/public/tasks');
            if (res.success && res.data && res.data.length > 0) {
                setTasks(res.data);
                taskStorage.syncTasks(res.data);
            } else {
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

    const lastRenewalTick = useMemo(
        () => getLastRenewalTick(settings || {}),
        [settings?.taskWindowStart, settings?.taskRenewalHours]
    );

    useEffect(() => {
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

        return taskStorage.getCompletedTasks(lastRenewalTick).includes(id);
    };

    const totalCount = tasks.length;
    const completedCount = tasks.filter(task => isTaskCompleted(task._id || task.id)).length;
    const remainingCount = Math.max(0, totalCount - completedCount);

    const handleTaskClick = (task) => {
        const taskId = task._id || task.id;
        if (isTaskCompleted(taskId)) return;

        switch (task.type) {
            case 'Quiz': navigate(`/user/task-quiz/${taskId}`); break;
            case 'Spin': navigate(`/user/lucky-draw/${taskId}`); break;
            case 'Memory': navigate(`/user/memory-master/${taskId}`); break;
            case 'Treasure': navigate(`/user/treasure-chest/${taskId}`); break;
            case 'Scratch': navigate(`/user/scratch-card/${taskId}`); break;
            case 'Tapper': navigate(`/user/speed-tapper/${taskId}`); break;
            default: navigate(`/user/task/${taskId}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#FCF8F5] font-poppins">
            {/* Header */}
            <div className="bg-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-[#EDE4DC]">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                        <ChevronLeft size={22} strokeWidth={2.2} />
                    </button>
                    <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">Tasks</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-[#FFF5F0] text-[#9A8478] rounded-lg border border-[#EDE4DC] active:scale-95 transition-all">
                        <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-1.5 bg-[#FFF5F0] px-3 py-1.5 rounded-lg border border-[#EDE4DC]">
                        <div className="w-5 h-5 bg-[#B3591C] rounded-full flex items-center justify-center">
                            <Coins size={11} className="text-white" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#462211]">{userData.coins?.total || 0}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4">
                {/* Summary Card */}
                <div className="mx-3 mt-3 bg-white px-4 py-3.5 border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[13px] font-semibold text-[#462211] tracking-tight flex items-center gap-1.5">
                            Daily Tasks
                            <span className="text-[#B3591C] font-semibold">Available: {totalCount}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-medium text-[#9A8478]">
                                Done: <span className="text-emerald-600 font-semibold">{completedCount}</span>
                            </span>
                            <span className="text-[11px] font-medium text-[#9A8478]">
                                Left: <span className="text-[#B3591C] font-semibold">{remainingCount}</span>
                            </span>
                        </div>
                    </div>
                    <div className="w-11 h-11 bg-[#FFF5F0] rounded-xl flex items-center justify-center border border-[#EDE4DC] shrink-0">
                        <ClipboardList size={20} className="text-[#B3591C]" />
                    </div>
                </div>

                {/* Operating Hours */}
                {settings?.taskWindowStart && settings?.taskWindowEnd && (
                    <div className="mx-3 mt-3 bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F8EDE4] rounded-lg flex items-center justify-center shrink-0">
                            <Bell size={14} className="text-[#B3591C]" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-semibold text-[#462211] uppercase tracking-wider mb-0.5">Operating Hours</h4>
                            <p className="text-[10.5px] font-medium text-[#7A5648]">
                                Tasks open between <span className="text-[#B3591C] font-semibold">{formatTime(settings.taskWindowStart)}</span> and <span className="text-[#B3591C] font-semibold">{formatTime(settings.taskWindowEnd)}</span> daily.
                            </p>
                        </div>
                    </div>
                )}

                {/* Closed state */}
                {!isWithinWindow && (
                    <div className="mx-3 mt-3 bg-[#FFF5F0] border border-[#EDE4DC] rounded-2xl p-6 text-center">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 border border-[#EDE4DC]">
                            <AlertCircle size={24} className="text-[#B3591C]" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-[#462211] tracking-tight">Tasks are Closed</h3>
                        <p className="text-[11px] font-medium text-[#7A5648] mt-1.5 leading-relaxed">
                            Come back during operating hours to earn more.
                        </p>
                    </div>
                )}

                {/* Task List */}
                {isWithinWindow && (
                <div className="flex flex-col gap-0 mt-3">
                    {tasks.map((task) => {
                        const taskId = task._id || task.id;
                        const iconConfig = ICON_MAP[task.icon] || ICON_MAP[task.category] || ICON_MAP['Monitor'];
                        const IconEl = iconConfig.el;
                        const isCompleted = isTaskCompleted(taskId);

                        return (
                            <div
                                key={taskId}
                                onClick={() => handleTaskClick(task)}
                                className={`bg-white border-b border-[#F3E8E0] px-4 py-3 flex items-center gap-3.5 transition-all ${isCompleted ? 'opacity-55 cursor-default' : 'active:bg-[#FFF5F0] cursor-pointer'}`}
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted ? 'bg-[#F3E8E0]' : `${iconConfig.bg}`
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                    ) : (
                                        <IconEl size={20} className={iconConfig.color} />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className={`text-[13px] font-semibold tracking-tight leading-snug truncate ${isCompleted ? 'text-[#9A8478] line-through' : 'text-[#462211]'}`}>
                                        {task.title}
                                    </h4>
                                    <p className="text-[10.5px] font-medium text-[#9A8478] mt-0.5 leading-snug line-clamp-1">
                                        {isCompleted ? 'Completed' : task.description}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 min-w-[80px] shrink-0">
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
                                                <span className="text-[10px] font-bold text-[#462211] whitespace-nowrap">
                                                    {displayCoins} Coins
                                                </span>
                                                {apply3x && (
                                                    <span className="text-[8px] font-bold text-[#B3591C] whitespace-nowrap bg-[#FFF5F0] px-1 py-0.5 rounded border border-[#EDE4DC] mt-0.5">
                                                        {taskMultiplier}x Boost
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    
                                    {!isCompleted ? (
                                        <button className="px-3 py-1.5 bg-[#462211] hover:bg-[#5D2E17] text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95 leading-none min-w-[72px] text-center">
                                            {task.type === 'Spin' ? 'Spin Now' : (task.type === 'Proof' || task.type === 'Download' || task.type === 'Sponsored') ? 'Upload' : 'Complete'}
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                            Claimed
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-[#9A8478] font-medium text-sm">No tasks available right now.</p>
                            <p className="text-[#C4A99A] font-medium text-xs mt-1">Check back soon</p>
                        </div>
                    )}
                </div>
                )}

                {/* Footer Banner */}
                <div className="mx-3 mt-3 bg-[#462211] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2">
                    <ClipboardList size={16} className="text-white/80" />
                    <span className="text-[12px] font-semibold text-white tracking-wide uppercase">
                        Complete tasks and earn coins!
                    </span>
                </div>

                {/* Booster Card */}
                <div className="mx-3 mt-3 bg-[#FFF5F0] border border-[#EDE4DC] rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h4 className="text-[13px] font-semibold text-[#462211] tracking-tight leading-none mb-1">{boosterData.title}</h4>
                            <p className="text-[9px] font-semibold text-[#B3591C] uppercase tracking-widest">{boosterData.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsBoosterExpanded(!isBoosterExpanded)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 border ${isBoosterExpanded ? 'bg-[#F8EDE4] text-[#462211] border-[#EDE4DC] rotate-180' : 'bg-white text-[#9A8478] border-[#EDE4DC]'}`}
                            >
                                <ChevronDown size={16} />
                            </button>
                            <button
                                onClick={() => !userData.isTaskBoosterActive && setIsPaymentOpen(true)}
                                disabled={userData.isTaskBoosterActive}
                                className={`${userData.isTaskBoosterActive ? 'bg-[#F3E8E0] text-[#9A8478] cursor-not-allowed' : 'bg-[#B3591C] hover:bg-[#9E4E18] text-white shadow-md'} px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-tight active:scale-95 transition-all`}
                            >
                                {userData.isTaskBoosterActive ? 'Already Active' : 'Buy Now'}
                            </button>
                        </div>
                    </div>

                    {isBoosterExpanded && (
                        <div className="bg-white border-t border-[#EDE4DC] px-4 py-3 space-y-2.5">
                            {(boosterData.benefits && boosterData.benefits.length > 0 
                                ? boosterData.benefits.map((benefitStr) => ({
                                    icon: <Rocket size={14} className="text-[#B3591C]" />, 
                                    bg: 'bg-[#FFF5F0]', 
                                    title: benefitStr, 
                                    desc: 'Exclusive booster perk'
                                }))
                                : [
                                    { icon: <Coins size={14} className="text-[#B3591C]" />, bg: 'bg-[#FFF5F0]', title: `${taskMultiplier}X Coins on Tasks`, desc: `1 task = ${taskMultiplier} coins` },
                                    { icon: <Zap size={14} className="text-[#462211]" />, bg: 'bg-[#F8EDE4]', title: 'Fast Rewards Processing', desc: 'Priority handling' },
                                    { icon: <CheckCircle2 size={14} className="text-[#5D2E17]" />, bg: 'bg-[#F3E8E0]', title: 'Priority Task Verification', desc: 'Get verified first' },
                                ]
                            ).map((b, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 ${b.bg} rounded-lg flex items-center justify-center shrink-0 border border-[#EDE4DC]`}>
                                        {b.icon}
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-semibold text-[#462211] leading-tight">{b.title}</h5>
                                        <p className="text-[9px] font-medium text-[#9A8478] leading-none">{b.desc}</p>
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
