import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Sparkles, Coins, Star, Gift, ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';

const DEFAULT_PRIZES = [
    { label: '₹50', coins: 0, cash: 50, bg: 'bg-indigo-500/10 text-indigo-400', color: 'text-indigo-400' },
    { label: '₹200', coins: 0, cash: 200, bg: 'bg-emerald-500/10 text-emerald-400', color: 'text-emerald-400' },
    { label: '₹100', coins: 0, cash: 100, bg: 'bg-sky-500/10 text-sky-400', color: 'text-sky-400' },
    { label: '50 Coins', coins: 50, cash: 0, bg: 'bg-amber-500/10 text-amber-400', color: 'text-amber-400' },
    { label: '₹500', coins: 0, cash: 500, bg: 'bg-rose-500/10 text-rose-400', color: 'text-rose-400' },
    { label: '20 Coins', coins: 20, cash: 0, bg: 'bg-amber-500/10 text-amber-400', color: 'text-amber-400' },
    { label: '₹150', coins: 0, cash: 150, bg: 'bg-violet-500/10 text-violet-400', color: 'text-violet-400' },
    { label: '75 Coins', coins: 75, cash: 0, bg: 'bg-amber-500/10 text-amber-400', color: 'text-amber-400' }
];

const LuckyDrawView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData, addCoins, addNotification } = useUser();
    
    const [prizes, setPrizes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [prizeIndex, setPrizeIndex] = useState(null);
    const [rotationDeg, setRotationDeg] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [tickets, setTickets] = useState(['🎫', '🎟️', '🎁', '⭐', '🏆', '💫', '🌟', '🎉']);
    const [flippedTicket, setFlippedTicket] = useState(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const res = await api.get(`/public/events/${id}`);
                if (res.success && res.data) {
                    setPrizes(res.data.config?.prizes || []);
                }
            } catch (err) {
                console.error("Failed to load lucky draw details:", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchEventDetails();
        } else {
            setLoading(false);
        }
    }, [id]);

    const activePrizes = prizes.length > 0 ? prizes.map((p, idx) => ({
        ...p,
        bg: p.bg || DEFAULT_PRIZES[idx % DEFAULT_PRIZES.length].bg,
        color: p.color || DEFAULT_PRIZES[idx % DEFAULT_PRIZES.length].color
    })) : DEFAULT_PRIZES;

    const handleStartDraw = () => {
        setStep(1);
        const winner = Math.floor(Math.random() * activePrizes.length);
        setPrizeIndex(winner);
        
        // Spin the wheel
        setIsSpinning(true);
        const extraSpins = 5 * 360;
        const finalDeg = extraSpins + (360 - (winner * (360 / activePrizes.length)));
        setRotationDeg(finalDeg);
        
        setTimeout(() => {
            setIsSpinning(false);
        }, 4000);

        setTimeout(() => {
            setStep(2);
            const prize = activePrizes[winner];
            if (prize.coins > 0) {
                addCoins(prize.coins, `Lucky Draw Prize`);
            }
            addNotification('Lucky Draw Result!', `You won ${prize.label} in the Lucky Draw!`, 'success');
            
            const completed = JSON.parse(localStorage.getItem('dromoney_completed_events') || '[]');
            const eventIdForStorage = id || 'lucky-draw';
            if (!completed.includes(eventIdForStorage)) {
                completed.push(eventIdForStorage);
                localStorage.setItem('dromoney_completed_events', JSON.stringify(completed));
                
                // Save participant record to DB dynamically
                api.post(`/user/data/events/${id}/submit`, {
                    score: null,
                    result: `Won: ${prize.label}`,
                    prize: prize.label
                }).catch(err => console.error("Failed to save submission:", err));
            }
        }, 4500);
    };

    const handleTicketReveal = (i) => {
        if (flippedTicket !== null || revealed) return;
        setFlippedTicket(i);
        setTimeout(() => setRevealed(true), 800);
    };

    const prize = prizeIndex !== null ? activePrizes[prizeIndex] : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#060810] flex items-center justify-center text-white">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (step === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 flex flex-col p-6 text-white animate-in fade-in duration-500">
                <header className="flex items-center gap-4 mb-6 pt-2">
                    <button onClick={() => navigate('/user/events')} className="p-2 bg-white/10 rounded-full backdrop-blur active:scale-90 transition-transform">
                        <ChevronLeft size={24} className="text-white" />
                    </button>
                    <h1 className="text-xl font-medium tracking-tight uppercase">🎟️ Lucky Draw</h1>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
                    <div className="relative">
                        <div className="w-40 h-40 bg-white/10 rounded-[3rem] flex items-center justify-center border-4 border-white/20 backdrop-blur shadow-2xl animate-pulse">
                            <Gift size={80} className="text-amber-400" />
                        </div>
                        <div className="absolute -top-4 -right-4 bg-amber-400 p-3 rounded-full shadow-xl border-4 border-indigo-900 animate-spin-slow">
                            <Sparkles size={20} className="text-white fill-white" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-medium leading-tight">Try Your Luck!</h2>
                        <p className="text-white/60 font-medium text-sm leading-relaxed max-w-xs">
                            Pick a ticket and reveal your prize. Win cash up to ₹1000 or bonus coins!
                        </p>
                    </div>

                    {/* Ticket Grid */}
                    <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
                        {tickets.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => { if (step === 0) { handleTicketReveal(i); } }}
                                className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 border-2 ${
                                    flippedTicket === i
                                        ? 'bg-amber-400 border-amber-300 scale-110 shadow-2xl shadow-amber-500/50'
                                        : 'bg-white/10 border-white/20 backdrop-blur hover:bg-white/20 active:scale-95'
                                }`}
                            >
                                {flippedTicket === i && revealed ? '🎁' : emoji}
                            </button>
                        ))}
                    </div>

                    {revealed && (
                        <div className="bg-white/10 backdrop-blur p-5 rounded-3xl border border-white/20 text-center animate-in zoom-in duration-500">
                            <p className="text-[11px] font-medium uppercase tracking-widest text-white/60 mb-2">Your Ticket Selected!</p>
                            <p className="text-4xl font-medium text-amber-400">🎟️ Ready!</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleStartDraw}
                    disabled={!revealed}
                    className={`w-full py-5 rounded-3xl font-medium text-lg uppercase tracking-widest shadow-2xl transition-all mb-8 ${
                        revealed
                            ? 'bg-amber-400 text-indigo-900 active:scale-95 shadow-amber-500/50'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                >
                    {revealed ? '🎯 Start the Draw!' : 'Select a Ticket First'}
                </button>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <div className="text-center space-y-8">
                    <div className="relative">
                        <div
                            className="w-48 h-48 rounded-full border-8 border-amber-400 flex items-center justify-center text-8xl shadow-2xl shadow-amber-500/30"
                            style={{
                                transform: `rotate(${rotationDeg}deg)`,
                                transition: isSpinning ? 'transform 4s cubic-bezier(0.1,0.7,0.3,1)' : 'none',
                                background: 'conic-gradient(from 0deg, #7c3aed, #4f46e5, #0ea5e9, #10b981, #f59e0b, #ef4444, #8b5cf6, #06b6d4)'
                            }}
                        >
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-amber-400">
                                <Sparkles size={28} className="text-amber-500 fill-amber-500" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-medium animate-pulse">🎯 Drawing the Winner...</h2>
                        <p className="text-white/60 font-medium text-sm">The wheel is spinning. Good luck!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 flex flex-col p-6 text-white">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative">
                    <div className="w-44 h-44 bg-amber-400/20 rounded-[3rem] flex items-center justify-center border-4 border-amber-400/60 shadow-2xl animate-in zoom-in duration-700">
                        <Trophy size={88} className="text-amber-400" />
                    </div>
                    <div className="absolute -top-3 -right-3">
                        <div className="bg-emerald-400 p-3 rounded-full border-4 border-indigo-900 shadow-xl animate-bounce">
                            <Star size={18} className="text-white fill-white" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">Congratulations!</p>
                    <h2 className="text-4xl font-medium leading-tight">You Won!</h2>
                </div>

                <div className={`w-full max-w-xs p-8 rounded-[3rem] border-2 text-center bg-white/10 border-white/20 animate-in zoom-in duration-500`}>
                    <p className="text-[10px] font-medium uppercase tracking-widest mb-3 opacity-70">Your Prize</p>
                    <p className="text-6xl font-medium mb-4">{prize?.label}</p>
                    {prize?.coins > 0 && (
                        <div className="flex items-center justify-center gap-2 bg-white/85 rounded-2xl p-3 shadow-md">
                            <Coins size={20} className="text-amber-500 fill-amber-500" />
                            <span className="text-[13px] font-medium text-slate-700">+{prize.coins} Coins added to wallet</span>
                        </div>
                    )}
                    {prize?.cash > 0 && (
                        <div className="flex items-center justify-center gap-2 bg-white/85 rounded-2xl p-3 shadow-md">
                            <Trophy size={20} className="text-emerald-500" />
                            <span className="text-[13px] font-medium text-slate-700">₹{prize.cash} prize confirmed!</span>
                        </div>
                    )}
                </div>

                <div className="bg-white/10 backdrop-blur p-5 rounded-3xl border border-white/20 text-center w-full max-w-xs">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-white/60">
                        🎉 Your result has been saved. Cash prizes will be credited within 24 hours.
                    </p>
                </div>
            </div>

            <button
                onClick={() => navigate('/user/events')}
                className="w-full bg-white text-indigo-900 py-5 rounded-3xl font-medium text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all mb-8 flex items-center justify-center gap-3"
            >
                Back to Events <ArrowRight size={20} />
            </button>
        </div>
    );
};

export default LuckyDrawView;
