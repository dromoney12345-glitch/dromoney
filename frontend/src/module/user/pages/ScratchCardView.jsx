import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import { ChevronLeft, Sparkles, Coins, Trophy, Quote, CheckCircle2, Star } from 'lucide-react';

const QUOTES = [
    "Consistency is the key to big earnings!",
    "Success starts with a single coin.",
    "Your hard work today is your profit tomorrow.",
    "Small steps lead to massive results.",
    "Dream big, earn bigger!",
    "Financial freedom starts with small tasks.",
    "Stay focused and keep growing!",
    "Every coin counts towards your goal."
];

const ScratchCard = ({ rewardPerCard, quote, onComplete, isTaskBoosterActive }) => {
    const canvasRef = useRef(null);
    const [isScratched, setIsScratched] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        initCanvas();
    }, []);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Premium Solid Silver Surface
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH', canvas.width / 2, canvas.height / 2 + 5);
    };

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const scratch = (e) => {
        if (isScratched) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.fill();

        checkScratchPercent();
    };

    const checkScratchPercent = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparent = 0;
        
        for (let i = 0; i < pixels.length; i += 40) { 
            if (pixels[i + 3] < 150) transparent++;
        }
        
        const totalSampled = pixels.length / 40;
        const percent = (transparent / totalSampled) * 100;

        // NATURAL THRESHOLD: 35% rubbed off to complete
        if (percent > 35 && !isScratched) {
            setIsScratched(true);
            onComplete();
        }
    };

    return (
        <div 
            className={`relative w-full aspect-square rounded-[1.5rem] border transition-all duration-700 overflow-hidden flex flex-col items-center justify-center p-3 text-center
            ${isScratched ? 'border-transparent shadow-2xl scale-105 z-20 shadow-blue-500/30 ring-2 ring-white/50' : 'bg-white border-slate-100 shadow-sm'}`}
            style={isScratched ? { background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' } : {}}
        >
            <div className={`flex flex-col items-center justify-center transition-all duration-700 ${isScratched ? 'opacity-100 scale-100' : 'opacity-10 scale-95'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 shadow-2xl ${isScratched ? 'bg-white/20' : 'bg-amber-50'}`}>
                    <Coins size={18} className={isScratched ? 'text-white' : 'text-amber-500'} />
                </div>
                <p className={`text-[15px] font-medium tracking-tight ${isScratched ? 'text-white' : 'text-slate-800'}`}>+{rewardPerCard} Coins</p>
                {isTaskBoosterActive && isScratched && (
                    <span className="text-[7px] font-bold text-sky-200 uppercase bg-black/20 px-1 py-0.5 rounded">3X Boost</span>
                )}
                <div className={`h-[1px] w-8 my-1.5 ${isScratched ? 'bg-white/30' : 'bg-slate-100'}`}></div>
                <p className={`text-[9px] font-medium italic leading-tight px-1 ${isScratched ? 'text-white/80' : 'text-slate-400'}`}>"{quote}"</p>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseMove={(e) => { if (isDrawing) scratch(e); }}
                onTouchStart={() => setIsDrawing(true)}
                onTouchEnd={() => setIsDrawing(false)}
                onTouchMove={(e) => { e.preventDefault(); scratch(e); }}
                className={`absolute inset-0 z-10 cursor-crosshair transition-opacity duration-1000 ${isScratched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            />
            {isScratched && (
                <div className="absolute top-2 right-2 flex gap-1">
                    <Star size={10} className="text-amber-400 fill-amber-400 animate-ping" />
                    <CheckCircle2 size={14} className="text-emerald-400 fill-white" />
                </div>
            )}
        </div>
    );
};

const ScratchCardView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins, addNotification, userData, boostersConfig } = useUser();
    const isTaskBoosterActive = userData?.isTaskBoosterActive && (!boostersConfig?.task?.length || boostersConfig.task.includes('Scratch Card'));
    const [task, setTask] = useState(null);
    const [completedCount, setCompletedCount] = useState(0);
    const [randomQuotes, setRandomQuotes] = useState([]);

    useEffect(() => {
        const allTasks = taskStorage.getTasks();
        const found = allTasks.find(t => String(t.id) === String(id));
        setTask(found);
        const shuffled = [...QUOTES].sort(() => 0.5 - Math.random());
        setRandomQuotes(shuffled.slice(0, 3));
    }, [id]);

    const handleCardFinish = () => {
        setCompletedCount(prev => {
            const next = prev + 1;
            if (next === 3) {
                taskStorage.markComplete(task?._id || task?.id);
                addNotification("Awesome!", "3/3 Cards Scratched!", "success");
            }
            return next;
        });
        const baseReward = Math.floor((task?.coinsReward || task?.reward || 0) / 3) || 1;
        addCoins(baseReward, 'Scratch Card Reward', (completedCount + 1 === 3) ? (task?._id || task?.id) : undefined);
    };

    if (!task) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col p-5 select-none relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full translate-y-32 -translate-x-32 blur-3xl"></div>

            <header className="flex items-center justify-between mb-8 pt-4 relative z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-all">
                        <ChevronLeft size={22} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-[19px] font-medium text-slate-800 tracking-tighter leading-none">{task.title}</h1>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Daily Lucky Board</p>
                    </div>
                </div>
                <div className="bg-slate-900 px-5 py-2.5 rounded-[1.25rem] shadow-xl flex flex-col items-center">
                    <span className="text-[8px] font-medium text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">DONE</span>
                    <span className="text-[15px] font-medium text-white leading-none tracking-tight">{completedCount}/3</span>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 relative z-10">
                <div className="w-full bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                    <div className="w-14 h-14 bg-amber-50 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm transition-transform group-hover:scale-110">
                        <Sparkles size={28} className="text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-medium text-slate-800 mb-1 tracking-tight">Rub & Reveal!</h2>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-none">Scratch all 3 silver cards</p>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full">
                    {[0, 1, 2].map((i) => {
                        const baseRewardPerCard = Math.ceil((task.coinsReward || task.reward || 0) / 3);
                        return (
                            <ScratchCard 
                                key={i} 
                                rewardPerCard={isTaskBoosterActive ? baseRewardPerCard * 12 : baseRewardPerCard} 
                                quote={randomQuotes[i] || ""}
                                onComplete={handleCardFinish} 
                                isTaskBoosterActive={isTaskBoosterActive}
                            />
                        );
                    })}
                </div>

                <div className="w-full">
                    {completedCount < 3 ? (
                        <div className="bg-white/60 backdrop-blur-sm border border-slate-100 p-5 rounded-[2rem] text-center shadow-sm">
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                                Scratch every card to reveal your total prize
                            </p>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-5 duration-700 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 relative z-10">
                                <Trophy size={32} className="text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight relative z-10">All Cards Done!</h3>
                            <button
                                onClick={() => navigate('/user/earn')}
                                className="mt-6 w-full bg-blue-600 text-white font-medium text-[12px] uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all relative z-10"
                            >
                                Submit & Go Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="h-4" />
        </div>
    );
};

export default ScratchCardView;
