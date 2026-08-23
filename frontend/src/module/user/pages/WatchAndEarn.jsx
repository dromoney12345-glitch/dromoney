import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, MonitorPlay, Sparkles, TrendingUp, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';
import UnlockModal from '../components/UnlockModal';
import { showFlutterRewardedAd, isFlutterApp } from '../../shared/utils/flutterAds';

const WatchAndEarn = () => {
    const navigate = useNavigate();
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
        await fetchStatus();
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

    const claimFlutterReward = useCallback(async () => {
        try {
            const claimRes = await api.post('/reward/claim');
            if (claimRes.success) {
                showToast('Ad watched. No coins or cash are added for ads.');
            } else {
                showToast(claimRes.message || 'Could not claim reward.', 'error');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'Failed to verify reward.';
            showToast(errMsg, 'error');
        }
        await fetchStatus();
        if (refreshUserProfile) await refreshUserProfile();
    }, [refreshUserProfile]);

    // Expose refreshRewardStatus for Flutter native callbacks
    useEffect(() => {
        window.refreshRewardStatus = claimFlutterReward;
        return () => {
            delete window.refreshRewardStatus;
        };
    }, [claimFlutterReward]);

    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    useEffect(() => {
        if (!status || status.nextAdIn <= 0) {
            setCooldownRemaining(0);
            return;
        }
        setCooldownRemaining(status.nextAdIn);

        const t = setInterval(() => {
            setCooldownRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(t);
                    fetchStatus();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [status?.nextAdIn]);

    const handleWatchAd = async () => {
        if (!status?.available) {
            showToast('Ad is not available right now.', 'error');
            return;
        }
        if (calling) return;
        setCalling(true);

        try {
            if (!isFlutterApp()) {
                showToast('Open the DroMoney app to watch live ads.', 'error');
                return;
            }

            const { ok, reason } = await showFlutterRewardedAd('reward_ad_1');
            if (ok) {
                await claimFlutterReward();
                return;
            }

            console.warn('Flutter rewarded ad unavailable:', reason);
            showToast('No ad available right now. Please try again in a moment.', 'error');
        } catch (e) {
            console.error('Watch ad error', e);
            showToast('Failed to launch ad. Please try again.', 'error');
        } finally {
            setCalling(false);
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
        <div className="pb-24 bg-[#FCF8F5] font-['Poppins'] min-h-screen">
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 w-[88%] max-w-sm ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className="text-[11px]">{toast.message}</span>
                </div>
            )}

            {/* Header with back button */}
            <div className="bg-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-[#EDE4DC]">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                        <ChevronLeft size={22} strokeWidth={2.2} />
                    </button>
                    <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">Watch Ads</h1>
                </div>
            </div>

            <div className="bg-[#FCF8F5] px-4 pt-3 pb-4 relative">
                <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 bg-[#F3E8E0] px-2 py-0.5 rounded-full w-fit">
                            <Sparkles size={9} className="text-[#462211]" />
                            <span className="text-[8px] text-[#462211] uppercase tracking-widest">Daily Ads</span>
                        </div>
                        <p className="text-[#7A5648] text-[10px]">AdMob ads only — no coins or wallet credit</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-[#F3E8E0] text-[#462211] rounded-full active:scale-95 transition-all">
                            <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                        </button>
                        <div className="w-9 h-9 bg-[#462211] rounded-xl flex items-center justify-center">
                            <MonitorPlay size={18} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="mt-3 bg-white border border-[#EDE4DC] rounded-xl p-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#F3E8E0] rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp size={14} className="text-[#462211]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] text-[#7A5648] uppercase tracking-wider leading-none mb-1">Today's Progress</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#F3E8E0] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#462211] rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((dailyAdCount / maxDailyLimit) * 100, 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-[#462211] shrink-0">{dailyAdCount}/{maxDailyLimit}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-3 mt-4 space-y-3">
                {loading && !status ? (
                    <div className="py-12 text-center text-slate-400 text-[11px] uppercase tracking-widest">Loading...</div>
                ) : (
                    <>
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
                                        <h3 className="text-slate-800 text-[14px] font-medium">Daily Ad</h3>
                                    </div>
                                    <div className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5">
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span className="text-[11px] font-medium">Countdown</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                    <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                                    <p className="text-slate-600 text-[12px]">Available In:</p>
                                    <p className="text-[#462211] text-[16px] font-semibold">{formatTime(cooldownRemaining)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-0" />
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-slate-800 text-[15px] font-medium">Daily Ad</h3>
                                        </div>
                                        <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                            <CheckCircle size={12} />
                                            <span className="text-[11px] font-medium uppercase tracking-wider">Available</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleWatchAd}
                                        disabled={calling || !status?.available}
                                        className={`w-full py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-all ${
                                            calling || !status?.available
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : 'bg-[#462211] text-white active:scale-[0.98]'
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
