import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, ChevronDown,
    Monitor, Play, Lightbulb, Disc, MessageCircle,
    Camera, ThumbsUp, MessageSquare, Link2,
    Coins, Bell, ClipboardList, TrendingUp, AlertCircle, Rocket, Zap, CheckCircle2
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
    const { userData, refreshUserProfile } = useUser();
    const { isPaid, isBoosterActive } = userData;
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [isBoosterExpanded, setIsBoosterExpanded] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const navigate = useNavigate();

    // DYNAMIC TASKS STATE
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        loadTasks();
    }, []);

    // Get actually completed tasks dynamically from backend userData (and fallback storage)
    const completedTasks = (() => {
        const dbCompleted = userData.completedTasks || [];
        const localCompleted = taskStorage.getCompletedTasks();
        const combined = new Set([
            ...dbCompleted.map(id => String(id)),
            ...localCompleted.map(id => String(id))
        ]);
        return Array.from(combined);
    })();

    const totalCount = tasks.length;
    const completedCount = tasks.filter(task => {
        const taskId = task._id || task.id;
        if (task.isDaily) {
            const today = new Date().setHours(0, 0, 0, 0);
            return userData.dailyTaskCompletions?.some(c => 
                String(c.taskId) === String(taskId) && 
                new Date(c.completedAt).setHours(0, 0, 0, 0) === today
            );
        }
        return completedTasks.includes(String(taskId));
    }).length;
    const remainingCount = Math.max(0, totalCount - completedCount);

    const handleTaskClick = (task) => {
        const taskId = task._id || task.id;
        if (!isPaid) {
            setIsUnlockOpen(true);
            return;
        }

        let isCompleted = false;
        if (task.isDaily) {
            const today = new Date().setHours(0, 0, 0, 0);
            isCompleted = userData.dailyTaskCompletions?.some(c => 
                String(c.taskId) === String(taskId) && 
                new Date(c.completedAt).setHours(0, 0, 0, 0) === today
            );
        } else {
            isCompleted = completedTasks.includes(String(taskId));
        }

        if (isCompleted) {
            // Do not open if already completed
            return;
        }

        // SWITCH ROUTE BASED ON TYPE
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
        <div className="flex flex-col min-h-screen bg-[#f0f9f4] font-poppins">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />

            {/* ── Header ── */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-slate-500 active:scale-95 transition-all">
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-[17px] font-medium text-slate-800 tracking-tight">Tasks</h1>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                        <Coins size={11} className="text-white" />
                    </div>
                    <span className="text-[13px] font-medium text-amber-700">{userData.coins?.total || 0}</span>
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
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl border border-amber-100 shadow-sm">
                        💰
                    </div>
                </div>

                {/* ── Task List ── */}
                <div className="flex flex-col gap-0 mt-4">
                    {tasks.map((task, idx) => {
                        const taskId = task._id || task.id;
                        const iconConfig = ICON_MAP[task.icon] || ICON_MAP[task.category] || ICON_MAP['Monitor'];
                        const IconEl = iconConfig.el;
                        
                        let isCompleted = false;
                        if (task.isDaily) {
                            const today = new Date().setHours(0, 0, 0, 0);
                            isCompleted = userData.dailyTaskCompletions?.some(c => 
                                String(c.taskId) === String(taskId) && 
                                new Date(c.completedAt).setHours(0, 0, 0, 0) === today
                            );
                        } else {
                            isCompleted = completedTasks.includes(String(taskId));
                        }

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
                                    <span className="text-[10px] font-medium text-slate-400 mb-0.5 whitespace-nowrap">
                                        {task.coinsReward || task.reward} Coins
                                    </span>
                                    
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
                            <h4 className="text-[14px] font-medium text-slate-800 tracking-tight leading-none mb-1">₹49 Task Booster</h4>
                            <p className="text-[9px] font-semibold text-emerald-600/80 uppercase tracking-[0.15em]">Priority Enabled</p>
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
                                onClick={() => !isBoosterActive && setIsPaymentOpen(true)}
                                disabled={isBoosterActive}
                                className={`${isBoosterActive ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'} px-4 py-2 rounded-xl text-[11px] font-medium tracking-tight active:scale-95 transition-all`}
                            >
                                {isBoosterActive ? 'Already Bought' : 'Buy Now'}
                            </button>
                        </div>
                    </div>

                    {/* Expandable Benefits */}
                    {isBoosterExpanded && (
                        <div className="bg-white border-t border-amber-100 px-4 py-3 space-y-3">
                            {[
                                { icon: <Bell size={16} className="text-yellow-500" fill="currentColor" />, bg: 'bg-yellow-50', title: 'Fast Notifications', desc: 'Tasks and updates instantly' },
                                { icon: <ClipboardList size={16} className="text-green-500" />, bg: 'bg-green-50', title: 'Early Task Access', desc: 'New tasks are available first' },
                                { icon: <Coins size={16} className="text-amber-500" fill="currentColor" />, bg: 'bg-amber-50', title: '3X Coin Earnings', desc: '1 task = 3 coins' },
                                { icon: <Lightbulb size={16} className="text-yellow-400" fill="currentColor" />, bg: 'bg-yellow-50', title: 'Business Ideas First', desc: 'Early access to new ideas' },
                                { icon: <AlertCircle size={16} className="text-orange-500" fill="currentColor" />, bg: 'bg-orange-50', title: 'Priority Alerts', desc: 'Important alerts sent first' },
                                { icon: <Rocket size={16} className="text-pink-500" fill="currentColor" />, bg: 'bg-pink-50', title: 'Faster Growth', desc: 'Earn coins 3X faster' },
                            ].map((b, i) => (
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
                amount={49}
                plan="Task Booster Pack"
                onSuccess={() => {
                    setIsPaymentOpen(false);
                    setIsBoosterExpanded(false);
                }}
            />
        </div>
    );
};

export default Earn;
