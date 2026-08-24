import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { getLastRenewalTick, isWithinTaskWindow } from '../../shared/utils/taskRenewal';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, ChevronDown,
    Monitor, Play, Lightbulb, Disc, MessageCircle,
    Camera, ThumbsUp, MessageSquare, Link2,
    Bell, ClipboardList, TrendingUp, AlertCircle, Rocket, Zap, CheckCircle2, RefreshCw
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import PaymentModal from '../components/PaymentModal';
import FundRewardNotice from '../components/FundRewardNotice';

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
    const { userData, refreshUserProfile, fetchNotifications } = useUser();
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
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
                <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-[#FFF5F0] text-[#9A8478] rounded-lg border border-[#EDE4DC] active:scale-95 transition-all">
                    <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-4">
                <div className="mx-3 mt-3 bg-[#FFF5F0] rounded-2xl p-3 border-2 border-[#C2520A] shadow-[0_2px_10px_rgba(194,82,10,0.08)]">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#462211] text-white flex items-center justify-center">
                                <ClipboardList size={18} />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold text-[#462211] leading-tight">Daily Tasks</h3>
                                <p className="text-[9.5px] text-[#7A5648] mt-0.5 leading-snug">{completedCount}/{totalCount} completed</p>
                            </div>
                        </div>
                        <span className="text-[9px] font-semibold text-[#C2520A] bg-white px-2 py-0.5 rounded-full border border-[#EDE4DC]">
                            {remainingCount} left
                        </span>
                    </div>
                    <p className="text-[10px] text-[#7A5648] mt-1">Complete tasks here. Ads on Watch Ads do not add coins or wallet balance.</p>
                </div>

                <div className="mx-3 mt-3">
                    <FundRewardNotice />
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

                                <div className="flex flex-col items-end gap-1.5 shrink-0">
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
                        Complete tasks every day!
                    </span>
                </div>

                <div className="h-6"></div>
            </div>
        </div>
    );
};

export default Earn;
