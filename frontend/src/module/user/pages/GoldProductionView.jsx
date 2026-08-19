import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Pickaxe, CheckCircle2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';

const GoldProductionView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins, addNotification } = useUser();
    
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mining, setMining] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/public/events/${id}`);
                if (res.success) {
                    setEvent(res.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleMine = () => {
        if (mining || completed) return;
        setMining(true);
        
        let current = 0;
        const interval = setInterval(() => {
            current += 10;
            setProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                finishMining();
            }
        }, 300);
    };

    const finishMining = async () => {
        setMining(false);
        setCompleted(true);
        
        // Reward user
        const reward = event?.config?.coinReward || 50;
        await addCoins(reward, `Gold Production: ${event?.title || 'Mining'}`, id);
        addNotification('Production Complete', `You produced ₹${reward} Gold Rewards!`, 'success');
        
        // Save submission
        try {
            await api.post(`/user/data/events/${id}/submit`, {
                score: reward,
                result: `Earned ₹${reward}`,
                prize: `₹${reward}`
            });
        } catch(e) {}
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-400">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-amber-900 text-white font-['Poppins']">
            <div className="p-4 flex items-center gap-3 border-b border-white/10">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-lg font-medium">{event?.title || 'Gold Production'}</h1>
            </div>

            <div className="flex flex-col items-center justify-center p-6 mt-10 space-y-8 text-center">
                <div className="w-40 h-40 bg-amber-500/20 rounded-full flex items-center justify-center border-4 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                    <Pickaxe size={64} className={`text-amber-400 ${mining ? 'animate-bounce' : ''}`} />
                </div>

                <div className="space-y-2 max-w-xs">
                    <h2 className="text-2xl font-bold text-amber-400">Mine Gold Rewards</h2>
                    <p className="text-sm text-slate-300">Tap to start production and extract your rewards from the event mine.</p>
                </div>

                {mining && (
                    <div className="w-full max-w-xs space-y-2">
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-amber-300 uppercase tracking-widest animate-pulse">Extracting...</p>
                    </div>
                )}

                {completed ? (
                    <div className="bg-emerald-500/20 border border-emerald-500/50 p-6 rounded-2xl w-full max-w-xs animate-in zoom-in">
                        <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                        <h3 className="text-lg font-bold text-emerald-400">Production Complete!</h3>
                        <p className="text-sm text-slate-300 mt-1">Check your wallet for the rewards.</p>
                        <button onClick={() => navigate(-1)} className="mt-4 w-full bg-white text-slate-900 py-3 rounded-xl font-bold uppercase tracking-wide">
                            Go Back
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleMine}
                        disabled={mining}
                        className={`w-full max-w-xs py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl transition-all ${
                            mining ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 active:scale-95'
                        }`}
                    >
                        {mining ? 'Producing...' : 'Start Production'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default GoldProductionView;
