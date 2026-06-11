import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Coins, MonitorPlay, Sparkles, TrendingUp, RefreshCw, AlertTriangle, CheckCircle, XCircle, Play, Lock } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

const WatchAndEarn = () => {
    const { userData, refreshUserProfile } = useUser();
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchStatus = async () => {
        try {
            const res = await api.get('/reward/status');
            if (res.success) {
                setStatus(res);
            }
        } catch (err) {
            console.error('Error fetching reward status:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAds = async () => {
        try {
            const res = await api.get('/public/ads');
            if (res.success) {
                setAds(res.data || []);
            }
        } catch (err) {
            console.error('Error fetching ads:', err);
        }
    };

    // On mount: fetch status + ads, expose flutter callback
    useEffect(() => {
        fetchStatus();
        fetchAds();

        // Flutter calls this after a native ad completes — claim reward & refresh
        window.refreshRewardStatus = async () => {
            try {
                const claimRes = await api.post('/reward/claim');
                if (claimRes.success) {
                    showToast('Reward earned! Coins added successfully.');
                } else {
                    showToast(claimRes.message || 'Could not claim reward.', 'error');
                }
            } catch (err) {
                const errMsg = err.response?.data?.message || err.message || 'Failed to verify reward.';
                showToast(errMsg, 'error');
            }
            await fetchStatus();
            await fetchAds();
            if (refreshUserProfile) await refreshUserProfile();
        };

        return () => {
            delete window.refreshRewardStatus;
        };
    }, []);

    // Cooldown countdown — ticks every second, re-fetches status when it hits 0
    useEffect(() => {
        if (!status || status.nextAdIn <= 0) {
            setCooldownRemaining(0);
            return;
        }
        setCooldownRemaining(status.nextAdIn);

        const t = setInterval(() => {
            setCooldownRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(t);
                    fetchStatus();
                    fetchAds();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [status?.nextAdIn]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const handleWatchAd = (adId) => {
        if (!status?.available) {
            if (cooldownRemaining > 0) {
                showToast(`Please wait ${formatTime(cooldownRemaining)} before watching the next ad.`, 'error');
            } else {
                showToast('No ads available right now.', 'error');
            }
            return;
        }

        if (window.flutter_inappwebview) {
            // Mobile app: trigger native ad; coins credited via window.refreshRewardStatus() callback
            window.flutter_inappwebview.callHandler('showRewardAd', adId).catch(e => {
                console.error('Flutter handler error', e);
                showToast('Failed to launch Ad.', 'error');
            });
        } else {
            // Web / browser: go to AdPlayer page — user watches the real video, coins awarded on completion
            navigate(`/user/ad-player/${adId}`);
        }
    };

    const MAX_DAILY = ads.length || 10;
    const watchedCount = status ? Math.max(0, MAX_DAILY - (status.remainingAds ?? MAX_DAILY)) : 0;

    return (
        <div className="pb-24 bg-[#F8FAFC] font-['Poppins'] min-h-screen">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl w-[88%] max-w-sm ${
                    toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success'
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    }
                    <span className="text-[11px]">{toast.message}</span>
                </div>
            )}

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 px-4 pt-3 pb-4 shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 bg-white/15 px-2 py-0.5 rounded-full w-fit border border-white/10">
                            <Sparkles size={9} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-[8px] text-white uppercase tracking-widest">Bonus Daily Ads</span>
                        </div>
                        <h1 className="text-[18px] text-white leading-tight">Watch & Earn</h1>
                        <p className="text-indigo-200 text-[10px] opacity-70">Get extra coins daily!</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full border border-white/15">
                            <Coins size={11} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-[11px] text-white">
                                {userData?.coins?.balance ?? userData?.coins?.total ?? 0}
                            </span>
                        </div>
                        <div className="w-9 h-9 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center">
                            <MonitorPlay size={18} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Daily Progress Bar */}
                <div className="mt-3 bg-white/10 rounded-xl p-2.5 flex items-center gap-3 border border-white/5">
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp size={14} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] text-indigo-200 uppercase tracking-wider leading-none mb-1">Today's Progress</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((watchedCount / MAX_DAILY) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-white shrink-0">{watchedCount}/{MAX_DAILY}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-3 mt-4 space-y-3">

                {/* Loading state */}
                {loading && ads.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-[11px] uppercase tracking-widest">Loading...</div>

                ) : /* Daily limit reached */ status?.remainingAds <= 0 ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center shadow-sm">
                        <AlertTriangle className="text-rose-500 w-8 h-8 mx-auto mb-2" />
                        <h3 className="text-rose-800 text-[14px] font-medium">Daily Limit Reached</h3>
                        <p className="text-rose-500 text-[11px] mt-1">
                            You have watched all {MAX_DAILY} ads for today. Come back tomorrow!
                        </p>
                    </div>

                ) : /* No ads in system */ ads.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center shadow-sm">
                        <MonitorPlay className="text-slate-300 w-10 h-10 mx-auto mb-2" />
                        <h3 className="text-slate-600 text-[13px] font-medium">No Ads Available</h3>
                        <p className="text-slate-400 text-[11px] mt-1">Check back soon for new reward ads!</p>
                    </div>

                ) : (
                    <>
                        {/* Cooldown banner — shown when user must wait between ads */}
                        {cooldownRemaining > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                                <RefreshCw size={13} className="text-amber-500 animate-spin shrink-0" />
                                <div>
                                    <p className="text-amber-700 text-[11px] font-medium">Next ad available in</p>
                                    <p className="text-amber-600 text-[13px] font-semibold">{formatTime(cooldownRemaining)}</p>
                                </div>
                            </div>
                        )}

                        {/* Ad cards list */}
                        {ads.map((ad) => {
                            const isWatched = ad.isWatched;
                            const isLocked = cooldownRemaining > 0 && !isWatched;
                            const canWatch = status?.available && !isWatched;

                            return (
                                <div
                                    key={ad._id}
                                    className={`bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden transition-colors ${
                                        isWatched
                                            ? 'border-emerald-100 bg-emerald-50/30'
                                            : canWatch
                                            ? 'border-slate-200 hover:border-indigo-200'
                                            : 'border-slate-100 opacity-70'
                                    }`}
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
                                    <div className="relative z-10">

                                        {/* Ad info row */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isWatched ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
                                                    {isWatched
                                                        ? <CheckCircle size={16} className="text-emerald-500" />
                                                        : <MonitorPlay size={16} className="text-indigo-500" />
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-slate-800 text-[13px] font-medium truncate">{ad.title}</h3>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Coins size={10} className="text-amber-500 fill-amber-500 shrink-0" />
                                                        <p className="text-amber-600 text-[11px] font-medium">+{ad.coinsReward} Coins</p>
                                                        <span className="text-slate-300 text-[10px] mx-0.5">•</span>
                                                        <Clock size={10} className="text-slate-400 shrink-0" />
                                                        <p className="text-slate-400 text-[10px]">{ad.duration}s</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            {isWatched ? (
                                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">Earned ✓</span>
                                            ) : isLocked ? (
                                                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                                    <Lock size={8} /> Cooldown
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">Available</span>
                                            )}
                                        </div>

                                        {/* Watch button — only shown for unwatched ads */}
                                        {!isWatched && (
                                            <button
                                                onClick={() => handleWatchAd(ad._id)}
                                                disabled={!canWatch}
                                                className={`w-full py-2.5 rounded-xl text-[12px] font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                                    canWatch
                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <Play size={13} className={canWatch ? 'fill-white' : ''} />
                                                {isLocked ? `Wait ${formatTime(cooldownRemaining)}` : 'Watch Ad Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default WatchAndEarn;
