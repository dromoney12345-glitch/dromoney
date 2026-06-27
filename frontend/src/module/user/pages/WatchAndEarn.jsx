import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Coins, MonitorPlay, Sparkles, TrendingUp, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

const WatchAndEarn = () => {
    const { userData, refreshUserProfile } = useUser();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [calling, setCalling] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const [isRefreshingCoins, setIsRefreshingCoins] = useState(false);
    const handleRefreshCoins = async () => {
        setIsRefreshingCoins(true);
        await refreshUserProfile(false);
        setIsRefreshingCoins(false);
    };

    const fetchStatus = async () => {
        setLoading(true);
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

    useEffect(() => {
        fetchStatus();
    }, []);

    // Expose refreshRewardStatus to Flutter — re-registered when showToast updates
    useEffect(() => {
        window.refreshRewardStatus = async () => {
            try {
                const claimRes = await api.post('/reward/claim');
                if (claimRes.success) {
                    showToast("Reward earned! Coins added successfully.");
                } else {
                    showToast(claimRes.message || "Could not claim reward.", "error");
                }
            } catch (err) {
                console.error("Claim error:", err);
                const errMsg = err.response?.data?.message || err.message || "Failed to verify reward.";
                showToast(errMsg, "error");
            }
            await fetchStatus();
            if (refreshUserProfile) await refreshUserProfile();
        };

        return () => {
            delete window.refreshRewardStatus;
        };
    }, [showToast, refreshUserProfile]);

    // Cooldown countdown logic
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

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
                    fetchStatus(); // re-fetch when cooldown ends
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [status?.nextAdIn]);

    const handleWatchAd = async () => {
        if (!status?.available) {
            showToast("Ad is not available right now.", "error");
            return;
        }
        if (calling) return;

        // Mobile app only — call Flutter handler
        if (window.flutter_inappwebview) {
            try {
                setCalling(true);
                await window.flutter_inappwebview.callHandler('showRewardAd', 'reward_ad_1');
                
                // Automatically claim reward after Flutter handler finishes showing the ad
                if (window.refreshRewardStatus) {
                    await window.refreshRewardStatus();
                }
            } catch (e) {
                console.error("Flutter handler error", e);
                showToast("Failed to launch Ad. Please try again.", "error");
            } finally {
                setCalling(false);
            }
        } else {
            showToast("This feature is only available in the mobile app.", "error");
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const maxDailyLimit = status?.maxDailyLimit || 10;
    const dailyAdCount = status ? (maxDailyLimit - status.remainingAds) : 0;

    return (
        <div className="pb-24 bg-[#F8FAFC] font-['Poppins'] min-h-screen">
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 w-[88%] max-w-sm ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className="text-[11px]">{toast.message}</span>
                </div>
            )}

            {/* Hero */}
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
                        <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full border border-white/20 active:scale-95 transition-all">
                            <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full border border-white/15">
                            <Coins size={11} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-[11px] text-white">{userData?.coins?.total || 0}</span>
                        </div>
                        <div className="w-9 h-9 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center">
                            <MonitorPlay size={18} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
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
                                    style={{ width: `${(dailyAdCount / maxDailyLimit) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-white shrink-0">{dailyAdCount}/{maxDailyLimit}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-3 mt-4 space-y-3">
                {loading && !status ? (
                     <div className="py-12 text-center text-slate-400 text-[11px] uppercase tracking-widest">Loading...</div>
                ) : (
                    <>
                        {/* Ads Display */}
                        {status && status.remainingAds <= 0 ? (
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center shadow-sm">
                                <AlertTriangle className="text-rose-500 w-8 h-8 mx-auto mb-2" />
                                <h3 className="text-rose-800 text-[14px] font-medium">Daily Limit Reached</h3>
                                <p className="text-rose-500 text-[11px] mt-1">You have watched all {maxDailyLimit} ads for today. Come back tomorrow!</p>
                            </div>
                        ) : cooldownRemaining > 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-slate-800 text-[14px] font-medium">Reward Ad</h3>
                                        <p className="text-slate-500 text-[11px]">Reward: {status?.rewardAmount || 5} Coins</p>
                                    </div>
                                    <div className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5">
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span className="text-[11px] font-medium">Countdown</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                    <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                                    <p className="text-slate-600 text-[12px]">Available In:</p>
                                    <p className="text-indigo-600 text-[16px] font-semibold">{formatTime(cooldownRemaining)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-0"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-slate-800 text-[15px] font-medium">Reward Ad</h3>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Coins size={12} className="text-amber-500 fill-amber-500" />
                                                <p className="text-amber-600 text-[12px] font-medium">Reward: {status?.rewardAmount || 5} Coins</p>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                            <CheckCircle size={12} />
                                            <span className="text-[11px] font-medium uppercase tracking-wider">Available</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleWatchAd}
                                        disabled={calling || !status?.available}
                                        className={`w-full py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-all ${
                                            calling || !status?.available
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                                        }`}
                                    >
                                        <MonitorPlay size={16} />
                                        {calling ? 'Launching Ad...' : 'Watch Ad Now'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WatchAndEarn;
