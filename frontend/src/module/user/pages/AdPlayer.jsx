import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RefreshCw, Coins, CheckCircle2, AlertTriangle, ShieldCheck, MonitorPlay, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';

import api from '../../shared/services/api';
import UniversalVideoPlayer from '../../shared/components/UniversalVideoPlayer';

const AdPlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData, refreshUserProfile } = useUser();
    const [ad, setAd] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);

    // Limits & Cooldowns state
    const [dailyAdCount, setDailyAdCount] = useState(0);
    const [nextAdAvailableAt, setNextAdAvailableAt] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [claiming, setClaiming] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const fetchAd = async () => {
            try {
                const res = await api.get(`/public/ads/${id}`);
                if (res.success) {
                    setAd(res.data);
                    setTimeLeft(res.data.duration);
                    setDailyAdCount(res.dailyAdCount || 0);
                    setNextAdAvailableAt(res.nextAdAvailableAt || null);
                    if (res.data.isWatched) {
                        setIsCompleted(true);
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || "Ad not found");
            }
        };
        fetchAd();
    }, [id]);

    useEffect(() => {
        let timer;
        if (isPlaying && timeLeft > 0 && !isCompleted) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && !isCompleted && ad) {
            handleComplete();
        }
        return () => clearInterval(timer);
    }, [isPlaying, timeLeft, isCompleted, ad]);

    // Track ad cooldown
    useEffect(() => {
        if (!nextAdAvailableAt) {
            setCooldownRemaining(0);
            return;
        }

        const updateCooldown = () => {
            const ms = new Date(nextAdAvailableAt) - Date.now();
            if (ms <= 0) {
                setCooldownRemaining(0);
            } else {
                setCooldownRemaining(Math.ceil(ms / 1000));
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [nextAdAvailableAt]);

    const handlePlayPause = () => {
        if (dailyAdCount >= 10) {
            showToast("Daily limit reached! You can only watch 10 videos per day.", "error");
            return;
        }
        if (cooldownRemaining > 0) {
            showToast(`Please wait ${cooldownRemaining}s before watching the next video.`, "error");
            return;
        }
        setIsPlaying(!isPlaying);
    };

    const handleComplete = async () => {
        if (claiming || isCompleted) return;
        
        setIsPlaying(false);
        setClaiming(true);
        
        try {
            const res = await api.post('/user/data/ads/reward', { adId: id });
            if (res.success) {
                setIsCompleted(true);
                showToast("Reward claimed successfully!", "success");
                await refreshUserProfile();
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to claim reward", "error");
        } finally {
            setClaiming(false);
        }
    };

    if (error) return <div className="p-10 text-center font-medium text-rose-500">{error}</div>;
    if (!ad) return null;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col pt-0 relative">
            {/* Custom Toast Alert */}
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                    ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{toast.message}</span>
                </div>
            )}

            {/* Immersive Header (Exactly matching the Gold/Double coin pill style) */}
            <header className="px-4 py-4 flex items-center justify-between z-50 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    {/* User Coins Pill */}
                    <div className="bg-[#0F172A]/80 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                        <Coins size={13} className="text-amber-400 fill-amber-400" />
                        <span className="text-[12px] font-medium text-white leading-none">{userData?.coins?.total || userData?.coins?.balance || 0}</span>
                    </div>
                    {/* Ad Reward Pill */}
                    <div className="bg-amber-600/10 backdrop-blur-md border border-amber-600/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                        <Coins size={13} className="text-amber-500 fill-amber-500" />
                        <span className="text-[11px] font-medium text-amber-500 uppercase tracking-wider leading-none">Reward: {ad.coinsReward} Coins</span>
                    </div>
                </div>
            </header>

            {/* Video Player Section */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <UniversalVideoPlayer 
                    url={ad.videoUrl} 
                    className="w-full h-auto max-h-screen object-contain"
                    onEnded={handleComplete}
                    autoPlay={false}
                    playing={isPlaying}
                />

                {/* Overlays */}
                {!isPlaying && !isCompleted && (
                    <button 
                        onClick={handlePlayPause}
                        className="absolute w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl animate-pulse group active:scale-90 transition-all"
                    >
                        <Play size={40} className="fill-white ml-1" />
                    </button>
                )}

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        style={{ width: `${((ad.duration - timeLeft) / ad.duration) * 100}%` }}
                    ></div>
                </div>

                {/* Timer Countdown (Pill style exactly from image 2) */}
                {!isCompleted && (
                    <div className="absolute top-20 right-4 bg-[#0F172A]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-lg">
                        <div className="flex flex-col items-center">
                            <span className="text-[18px] font-medium text-white leading-none">{timeLeft}</span>
                            <span className="text-[7px] font-medium text-slate-400 uppercase tracking-[0.15em] mt-0.5">Seconds</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls / Reward Card - Matching image 2 premium layout */}
            <div className="bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] space-y-4">
                {!isCompleted ? (
                    <div className="space-y-4">
                        {/* Title & Live Spinner Indicator */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                                    <MonitorPlay size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[15px] font-medium text-slate-800 tracking-tight leading-none mb-1.5">{ad.title}</h2>
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Sponsored Advertisement</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/60 text-indigo-600 px-3 py-1.5 rounded-full shadow-sm">
                                <Loader2 size={11} className="animate-spin text-indigo-500" />
                                <span className="text-[9px] font-medium uppercase tracking-widest">Watching</span>
                            </div>
                        </div>

                        {/* Total Earnings Card - Slate background with solid Gold circle coin icon */}
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                            <div className="w-11 h-11 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full flex items-center justify-center shrink-0">
                                <Coins size={18} className="text-amber-500 fill-amber-500 animate-bounce" />
                            </div>
                            <div>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none mb-1.5">Total Earnings</p>
                                <p className="text-[13px] font-medium text-slate-600 leading-none">
                                    Earn <span className="text-indigo-600 font-medium">+{ad.coinsReward} coins</span> after {ad.duration}s
                                </p>
                            </div>
                        </div>

                        {/* Shield Security Alert Note - Sky blue */}
                        <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl flex items-start gap-3">
                            <ShieldCheck size={16} className="text-sky-500 shrink-0 mt-0.5" />
                            <p className="text-sky-800 font-medium text-[9px] leading-relaxed uppercase tracking-tight">
                                Do not close the app while watching. Reward will be added only after full timer completion for verification.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-2 text-center space-y-4 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 border-4 border-white">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-medium text-slate-800 tracking-tight">Reward Claimed!</h2>
                            <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Coins successfully added to wallet</p>
                        </div>
                        
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between max-w-xs mx-auto">
                            <div className="text-center w-full">
                                <p className="text-[10px] font-medium text-emerald-600 uppercase">Received</p>
                                <p className="text-2xl font-medium text-emerald-800 tracking-tighter">+{ad.coinsReward} <span className="text-sm">Coins</span></p>
                            </div>
                            <button onClick={() => navigate('/user/watch')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-medium uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95">
                                Next Ad
                            </button>
                        </div>

                        <button 
                            onClick={() => navigate('/user/watch')}
                            className="w-full text-slate-400 font-medium text-[10px] uppercase tracking-widest pt-4 hover:text-indigo-600 transition-colors"
                        >
                            Return to list
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdPlayer;
