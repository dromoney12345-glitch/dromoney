import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, CheckCircle2, ShieldCheck, MonitorPlay, Loader2, CheckCircle, XCircle } from 'lucide-react';
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
    const [dailyAdCount, setDailyAdCount] = useState(0);
    const [maxDailyLimit, setMaxDailyLimit] = useState(10);
    const [nextAdAvailableAt, setNextAdAvailableAt] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [claiming, setClaiming] = useState(false);
    const [toast, setToast] = useState(null);

    const claimingRef = useRef(false);
    const completedRef = useRef(false);

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
                    setMaxDailyLimit(res.maxDailyLimit || 10);
                    setNextAdAvailableAt(res.nextAdAvailableAt || null);
                    if (res.data.isWatched) {
                        setIsCompleted(true);
                        completedRef.current = true;
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Ad not found');
            }
        };
        fetchAd();
    }, [id]);

    useEffect(() => {
        let timer;
        if (isPlaying && timeLeft > 0 && !isCompleted) {
            timer = setInterval(() => {
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }, 1000);
        } else if (timeLeft === 0 && !isCompleted && ad && isPlaying) {
            handleComplete();
        }
        return () => clearInterval(timer);
    }, [isPlaying, timeLeft, isCompleted, ad]);

    useEffect(() => {
        if (!nextAdAvailableAt) {
            setCooldownRemaining(0);
            return;
        }

        const updateCooldown = () => {
            const ms = new Date(nextAdAvailableAt) - Date.now();
            setCooldownRemaining(ms <= 0 ? 0 : Math.ceil(ms / 1000));
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [nextAdAvailableAt]);

    const handlePlayPause = () => {
        if (dailyAdCount >= maxDailyLimit) {
            showToast(`Daily limit reached! You can only watch ${maxDailyLimit} videos per day.`, 'error');
            return;
        }
        if (cooldownRemaining > 0) {
            showToast(`Please wait ${cooldownRemaining}s before watching the next video.`, 'error');
            return;
        }
        setIsPlaying((prev) => !prev);
    };

    const handleComplete = async () => {
        if (claimingRef.current || completedRef.current) return;

        claimingRef.current = true;
        setIsPlaying(false);
        setClaiming(true);

        try {
            const res = await api.post('/user/data/ads/reward', { adId: id });
            if (res.success) {
                completedRef.current = true;
                setIsCompleted(true);
                showToast('Ad completed successfully!', 'success');
                await refreshUserProfile();
            } else {
                showToast(res.message || 'Failed to claim reward', 'error');
                claimingRef.current = false;
            }
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to claim reward', 'error');
            claimingRef.current = false;
        } finally {
            setClaiming(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-center font-medium text-rose-400 text-sm">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate('/user/watch')}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs"
                >
                    Back to Watch & Earn
                </button>
            </div>
        );
    }

    if (!ad) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-400" size={28} />
            </div>
        );
    }

    const progress = ad.duration > 0 ? ((ad.duration - timeLeft) / ad.duration) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col pt-0 relative">
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm ${
                    toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{toast.message}</span>
                </div>
            )}

            <header className="px-4 py-4 flex items-center justify-between z-50 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent">
                <button type="button" onClick={() => navigate('/user/watch')} className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all">
                    <ChevronLeft size={20} />
                </button>
            </header>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black min-h-[40vh]">
                <UniversalVideoPlayer
                    url={ad.videoUrl}
                    className="w-full h-auto max-h-[70vh] object-contain"
                    onEnded={handleComplete}
                    autoPlay={false}
                    playing={isPlaying}
                    controls={false}
                />

                {!isPlaying && !isCompleted && (
                    <button
                        type="button"
                        onClick={handlePlayPause}
                        className="absolute w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl animate-pulse active:scale-90 transition-all z-10"
                    >
                        <Play size={40} className="fill-white ml-1" />
                    </button>
                )}

                {claiming && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <Loader2 className="animate-spin text-white" size={32} />
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>

                {!isCompleted && (
                    <div className="absolute top-20 right-4 bg-[#0F172A]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-lg">
                        <div className="flex flex-col items-center">
                            <span className="text-[18px] font-medium text-white leading-none">{timeLeft}</span>
                            <span className="text-[7px] font-medium text-slate-400 uppercase tracking-[0.15em] mt-0.5">Seconds</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] space-y-4">
                {!isCompleted ? (
                    <div className="space-y-4">
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
                                <Loader2 size={11} className={`text-indigo-500 ${isPlaying ? 'animate-spin' : ''}`} />
                                <span className="text-[9px] font-medium uppercase tracking-widest">{isPlaying ? 'Watching' : 'Ready'}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                            <div className="w-11 h-11 bg-[#462211]/10 border border-[#462211]/20 rounded-full flex items-center justify-center shrink-0">
                                <MonitorPlay size={18} className="text-[#462211]" />
                            </div>
                            <div>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none mb-1.5">Watch Time</p>
                                <p className="text-[13px] font-medium text-slate-600 leading-none">
                                    Watch the full {ad.duration}s video to complete
                                </p>
                            </div>
                        </div>

                        <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl flex items-start gap-3">
                            <ShieldCheck size={16} className="text-sky-500 shrink-0 mt-0.5" />
                            <p className="text-sky-800 font-medium text-[9px] leading-relaxed uppercase tracking-tight">
                                Keep this screen open while watching. Completion is counted only after the full timer completes.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-2 text-center space-y-4 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 border-4 border-white">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-medium text-slate-800 tracking-tight">Ad Completed!</h2>
                            <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">You finished this video</p>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between max-w-xs mx-auto gap-3">
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-medium text-emerald-600 uppercase">Status</p>
                                <p className="text-lg font-medium text-emerald-800 tracking-tight">Done</p>
                            </div>
                            <button type="button" onClick={() => navigate('/user/watch')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-medium uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 shrink-0">
                                Next Ad
                            </button>
                        </div>

                        <button
                            type="button"
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
