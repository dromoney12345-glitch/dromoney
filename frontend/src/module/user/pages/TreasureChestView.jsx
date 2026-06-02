import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { ChevronLeft, Gift, Coins, Sparkles, Trophy, Star } from 'lucide-react';

const TreasureChestView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins } = useUser();
    const [task, setTask] = useState(null);
    
    const [step, setStep] = useState(0); // 0: Start, 1: Picked, 2: Reveal
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [winningIdx, setWinningIdx] = useState(null);

    useEffect(() => {
        const allTasks = taskStorage.getTasks();
        const found = allTasks.find(t => String(t.id) === String(id));
        setTask(found);
    }, [id]);

    const handlePick = (idx) => {
        if (step !== 0) return;
        
        setSelectedIdx(idx);
        setWinningIdx(Math.floor(Math.random() * 3));
        setStep(1);

        setTimeout(() => {
            setStep(2);
            if (idx === winningIdx || true) { // Logic: For now, always win to make client happy, or use random
                 addCoins(task.reward, 'Treasure Chest Found', task._id || task.id);
                 taskStorage.markComplete(task._id || task.id);
            }
        }, 1500);
    };

    if (!task) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-slate-900 to-black p-6 text-white overflow-hidden">
            <header className="flex items-center gap-4 mb-10">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-lg font-medium tracking-tight">{task.title}</h1>
                    <p className="text-[10px] font-medium text-amber-400 uppercase tracking-widest leading-none mt-1">Luck Challenge</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-12">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 mb-2">
                        <Sparkles size={16} className="text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Guaranteed Prize Inside!</span>
                    </div>
                    <h2 className="text-3xl font-medium">{step === 0 ? 'Pick a Lucky Chest' : step === 1 ? 'Opening Chest...' : 'You Found a Reward!'}</h2>
                    <p className="text-white/40 font-medium text-sm">Every chest has a unique reward inside. Choose wisely!</p>
                </div>

                {/* Chests Grid */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md pt-8">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            onClick={() => handlePick(i)}
                            disabled={step !== 0}
                            className={`relative aspect-[3/4] flex flex-col items-center justify-center rounded-[2rem] border-2 transition-all duration-500
                                ${selectedIdx === i ? 'bg-indigo-500/20 border-indigo-500 scale-110 z-10 shadow-2xl shadow-indigo-500/30' : 
                                  step === 0 ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer' :
                                  'bg-white/5 border-white/5 opacity-40 grayscale'}
                            `}
                        >
                            <div className={`transition-all duration-700 ${step === 2 && selectedIdx === i ? 'scale-125 -translate-y-4' : ''}`}>
                                {step === 2 && selectedIdx === i ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-40 animate-pulse"></div>
                                        <Coins size={60} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                                    </div>
                                ) : (
                                    <Gift size={48} className={`${selectedIdx === i ? 'text-indigo-400' : 'text-slate-500'}`} />
                                )}
                            </div>
                            
                            {step === 0 && (
                                <div className="absolute -bottom-3 bg-slate-800 px-3 py-1 rounded-full border border-white/10 shadow-xl">
                                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">Box {i + 1}</span>
                                </div>
                            )}

                            {step === 2 && selectedIdx === i && (
                                <div className="absolute -bottom-4 bg-emerald-500 px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2">
                                    <span className="text-[11px] font-medium text-white uppercase tracking-widest">+{task.reward} Coins</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 min-h-[100px]"></div>

                {step === 2 && (
                    <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center relative overflow-hidden group">
                           <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl"></div>
                           <Trophy size={40} className="mx-auto mb-3 text-amber-400 animate-bounce" />
                           <h3 className="text-xl font-medium text-white">Reward Claimed!</h3>
                           <p className="text-[11px] font-medium text-white/40 uppercase mt-1">Excellent choice, traveler!</p>
                        </div>
                        
                        <button
                            onClick={() => navigate('/user/earn')}
                            className="w-full bg-indigo-500 text-white py-5 rounded-[2rem] font-medium uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-xs"
                        >
                            Return to Tasks
                        </button>
                    </div>
                )}
            </div>
            
            {/* Visual Sparkles */}
            {step === 2 && (
                <div className="fixed inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <Star 
                            key={i} 
                            size={12} 
                            className="absolute text-amber-400/50 animate-ping"
                            style={{
                                top: `${Math.random()*100}%`,
                                left: `${Math.random()*100}%`,
                                animationDelay: `${Math.random()*2}s`
                            }}
                        />
                    ))}
                </div>
            )}
            
            <div className="h-10" />
        </div>
    );
};

export default TreasureChestView;
