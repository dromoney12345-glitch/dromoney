import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { ChevronLeft, Zap, Trophy, IndianRupee, Timer, MousePointer2 } from 'lucide-react';

const SpeedTapperView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins } = useUser();
    const [task, setTask] = useState(null);
    
    const [taps, setTaps] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, playing, won, lost
    const [timeLeft, setTimeLeft] = useState(0);
    
    const target = 25;
    const duration = 10;

    useEffect(() => {
        const allTasks = taskStorage.getTasks();
        const found = allTasks.find(t => String(t.id) === String(id));
        setTask(found);
    }, [id]);

    useEffect(() => {
        let timer;
        if (status === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => Number((prev - 0.1).toFixed(1))), 100);
        } else if (status === 'playing' && timeLeft <= 0) {
            if (taps >= target) {
                handleWin();
            } else {
                setStatus('lost');
            }
        }
        return () => clearInterval(timer);
    }, [status, timeLeft, taps]);

    const startGame = () => {
        setTaps(0);
        setTimeLeft(duration);
        setStatus('playing');
    };

    const handleTap = () => {
        if (status !== 'playing') return;
        setTaps(prev => prev + 1);
        
        if (taps + 1 >= target) {
             // Let the timer finish or win instantly? Let's win instantly for better UX
             handleWin();
        }
    };

    const handleWin = async () => {
        setStatus('won');
        const rewardAmount = task.coinsReward || task.reward || 0;
        await addCoins(rewardAmount, 'Speed Tapper Mastery', task._id || task.id);
        taskStorage.markComplete(task._id || task.id);
    };

    if (!task) return null;

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col p-6 text-slate-800 overflow-hidden">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-2xl border border-slate-200 active:scale-95 transition-all shadow-sm">
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-lg font-medium tracking-tight text-slate-900">{task.title}</h1>
                    <p className="text-[10px] font-medium text-rose-500 uppercase tracking-widest leading-none mt-1">Reflex Challenge</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-12">
                
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center">
                        <Timer size={20} className="text-slate-400 mb-2" />
                        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Time Left</p>
                        <p className={`text-3xl font-medium ${timeLeft < 3 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}`}>{timeLeft}s</p>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center">
                        <Zap size={20} className="text-amber-500 mb-2" />
                        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Target</p>
                        <p className="text-3xl font-medium text-slate-900">{taps}/{target}</p>
                    </div>
                </div>

                {/* Main Tap Orb */}
                <div className="relative group">
                    <div className={`absolute -inset-8 bg-sky-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity ${status === 'playing' ? 'animate-pulse' : ''}`}></div>
                    <button
                        onClick={handleTap}
                        disabled={status === 'won' || (status === 'idle' && false)} 
                        className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-75 active:scale-90 select-none touch-none
                            ${status === 'playing' ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_0_50px_rgba(14,165,233,0.4)]' : 
                              status === 'won' ? 'bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]' :
                              status === 'lost' ? 'bg-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]' :
                              'bg-white border-8 border-slate-100 shadow-xl'}
                        `}
                    >
                        {status === 'idle' && (
                            <div className="flex flex-col items-center gap-2" onClick={startGame}>
                                <MousePointer2 size={48} className="text-slate-400" />
                                <span className="font-medium text-slate-800 uppercase tracking-widest text-xs">Tap to Start</span>
                            </div>
                        )}

                        {status === 'playing' && (
                             <div className="text-white text-center">
                                <p className="text-6xl font-medium">{taps}</p>
                                <p className="text-[11px] font-medium uppercase tracking-[0.2em] mt-2 text-sky-100">GO! GO! GO!</p>
                             </div>
                        )}

                        {status === 'won' && (
                             <div className="text-white text-center animate-in zoom-in duration-300">
                                <Trophy size={60} className="mx-auto mb-3" />
                                <p className="text-xl font-medium uppercase tracking-widest leading-none">Perfect!</p>
                                <p className="text-[11px] font-medium text-emerald-100 uppercase mt-2">Task Completed</p>
                             </div>
                        )}

                        {status === 'lost' && (
                             <div className="text-white text-center">
                                <p className="text-xl font-medium text-rose-100 uppercase tracking-widest">Too Slow!</p>
                                <button onClick={startGame} className="mt-4 bg-white/20 px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest backdrop-blur">
                                    Try Again
                                </button>
                             </div>
                        )}
                    </button>
                    
                    {/* Ripple Effects during playing */}
                    {status === 'playing' && (
                        <div className="absolute inset-0 rounded-full border-4 border-sky-400 animate-ping opacity-20 pointer-events-none"></div>
                    )}
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2.5rem] w-full max-w-sm flex items-center gap-4 relative overflow-hidden">
                    {/* Decorative Coins */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                        <IndianRupee size={80} className="text-amber-500" />
                    </div>
                    <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500 shadow-lg shadow-amber-200/50">
                        <IndianRupee size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-amber-800 tracking-tight leading-tight uppercase">Reward on success</p>
                        <p className="text-xl font-medium text-amber-600 mt-0.5">
                            +₹{task ? (task.coinsReward || task.reward || 0) : 0}
                        </p>
                    </div>
                </div>

                {status === 'won' && (
                    <button
                        onClick={() => navigate('/user/earn')}
                        className="w-full max-w-sm bg-slate-900 text-white py-5 rounded-[2rem] font-medium uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all text-xs"
                    >
                        Collect & Rewards
                    </button>
                )}
            </div>
            <div className="h-10" />
        </div>
    );
};

export default SpeedTapperView;
