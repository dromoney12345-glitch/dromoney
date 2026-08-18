import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, CheckCircle2, Loader2, Info, Play, ClipboardList, User,
    IndianRupee, AlertCircle, ChevronRight, Package, Wallet, Calendar, CreditCard, Star,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';

const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FFHeader = ({ onBack }) => (
    <div className="p-3 bg-[#FCF8F5] flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={onBack} className="text-[#462211] active:scale-90 transition-all shrink-0">
                <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <h1 className="text-[15px] font-medium text-[#462211] tracking-tight truncate">Future Fund</h1>
        </div>
        <span className="bg-[#F3E8E0] text-[#462211] px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 shrink-0">
            <Package size={12} /> Future Fund
        </span>
    </div>
);

const ActionCards = ({ navigate }) => (
    <div className="grid grid-cols-2 gap-2">
        <button
            type="button"
            onClick={() => navigate('/user/watch')}
            className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-3 text-left relative active:scale-[0.99]"
        >
            <div className="w-8 h-8 rounded-lg bg-[#462211] text-white flex items-center justify-center mb-2">
                <Play size={14} fill="currentColor" />
            </div>
            <p className="text-[12px] font-medium text-[#462211] leading-tight">Watch Ad Video</p>
            <p className="text-[9px] text-[#7A5648] mt-0.5 leading-snug pr-4">Ad video देखो और fund बढ़ाओ</p>
            <ChevronRight size={14} className="absolute right-2.5 top-3 text-[#C4A99A]" />
        </button>
        <button
            type="button"
            onClick={() => navigate('/user/earn')}
            className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-3 text-left relative active:scale-[0.99]"
        >
            <div className="w-8 h-8 rounded-lg bg-[#462211] text-white flex items-center justify-center mb-2">
                <ClipboardList size={14} />
            </div>
            <p className="text-[12px] font-medium text-[#462211] leading-tight">Small Task</p>
            <p className="text-[9px] text-[#7A5648] mt-0.5 leading-snug pr-4">छोटे-छोटे task पूरे करो और fund बढ़ाओ</p>
            <ChevronRight size={14} className="absolute right-2.5 top-3 text-[#C4A99A]" />
        </button>
    </div>
);

const SectionDivider = ({ title }) => (
    <div className="flex items-center gap-2">
        <span className="flex-1 h-px bg-[#EDE4DC]" />
        <p className="text-[11px] font-medium text-[#462211] text-center shrink-0 px-1">{title}</p>
        <span className="flex-1 h-px bg-[#EDE4DC]" />
    </div>
);

const ProgressRow = ({ icon: Icon, title, subtitle, current, target, onClick }) => {
    const pct = Math.min(100, (Number(current) / Math.max(Number(target) || 1, 1)) * 100);
    const Wrapper = onClick ? 'button' : 'div';
    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`w-full text-left ${onClick ? 'active:opacity-80' : ''}`}
        >
            <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center shrink-0">
                    <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[12px] font-medium text-[#462211]">{title}</p>
                            <p className="text-[10px] text-[#7A5648] mt-0.5 leading-snug">{subtitle}</p>
                        </div>
                        <span className="text-[11px] font-medium text-[#462211] shrink-0">{current}/{target}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-[#F3E8E0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#462211] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>
        </Wrapper>
    );
};

const FutureFund = () => {
    const navigate = useNavigate();
    const { userData, addNotification, refreshUserProfile } = useUser();
    const [viewState, setViewState] = useState('initial');
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [ffStatus, setFfStatus] = useState(null);
    const [rewardStatus, setRewardStatus] = useState(null);
    const [settings, setSettings] = useState({
        futureFundDailyTasksTarget: 10,
        futureFundWatchAdTarget: 10,
    });

    const loadStatus = useCallback(async () => {
        try {
            const [statusRes, settingsRes, rewardRes] = await Promise.all([
                api.get('/user/data/future-fund/status'),
                api.get('/public/settings'),
                api.get('/reward/status').catch(() => null),
            ]);

            if (statusRes.success) {
                setFfStatus(statusRes.data);
                if (statusRes.data.status === 'active') {
                    setViewState('active');
                }
            }

            if (settingsRes.success && settingsRes.data) {
                setSettings({
                    futureFundDailyTasksTarget: Number(settingsRes.data.futureFundDailyTasksTarget) || 10,
                    futureFundWatchAdTarget: Number(settingsRes.data.futureFundWatchAdTarget) || 10,
                });
            }

            if (rewardRes?.success) {
                setRewardStatus(rewardRes);
            }
        } catch (err) {
            console.error('FF status fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
        const t = setInterval(loadStatus, 60 * 1000);
        return () => clearInterval(t);
    }, [loadStatus]);

    const completedTasksCount = useMemo(() => {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        return (userData.dailyTaskCompletions || []).filter(
            (c) => new Date(c.completedAt) >= since
        ).length;
    }, [userData.dailyTaskCompletions]);

    const dailyAdTarget = settings.futureFundWatchAdTarget;
    const dailyTaskTarget = settings.futureFundDailyTasksTarget;
    const dailyAdCurrent = useMemo(() => {
        if (rewardStatus?.maxDailyLimit != null && rewardStatus?.remainingAds != null) {
            return Math.min(
                dailyAdTarget,
                Math.max(0, Number(rewardStatus.maxDailyLimit) - Number(rewardStatus.remainingAds))
            );
        }
        return Math.min(dailyAdTarget, Number(userData.todayRewardCount) || 0);
    }, [rewardStatus, dailyAdTarget, userData.todayRewardCount]);

    const salesCriterion = ffStatus?.criteria?.find((c) => c.id === 1) || {
        current: 0,
        target: ffStatus?.targets?.salesTarget || 10,
        completed: false,
    };
    const activityCriterion = ffStatus?.criteria?.find((c) => c.id === 2) || {
        current: 0,
        target: ffStatus?.targets?.activityMinutesTarget || 50,
        completed: false,
    };
    const daysCriterion = ffStatus?.criteria?.find((c) => c.id === 3) || {
        current: 0,
        target: ffStatus?.targets?.daysTarget || 50,
        completed: false,
    };

    const isEligible = !!ffStatus?.eligible;
    const kycCurrent = Number(salesCriterion.current ?? 0);
    const kycTarget = Number(salesCriterion.target || 10);
    const adsCurrent = Number(activityCriterion.current ?? userData.lifetimeAdsWatched ?? 0);
    const adsTarget = Number(activityCriterion.target || 50);
    const tasksCurrent = Number(daysCriterion.current ?? userData.lifetimeTasksCompleted ?? 0);
    const tasksTarget = Number(daysCriterion.target || 50);
    const criterionPct = (current, target) =>
        Math.round(Math.min(100, (Number(current) / Math.max(Number(target) || 1, 1)) * 100));

    const realEarningsData = useMemo(() => {
        const transactions = userData.wallet?.transactions || [];
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const isFfTx = (tx) =>
            tx.type === 'credit' &&
            tx.status === 'Success' &&
            /future fund|daily future fund distribution/i.test(String(tx.source || tx.title || ''));

        const todayFF = transactions
            .filter((tx) => isFfTx(tx) && new Date(tx.createdAt || tx.date) >= todayStart)
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const totalFF = transactions
            .filter((tx) => isFfTx(tx))
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        return { todayFF, totalFF };
    }, [userData.wallet?.transactions]);

    const handleMoveForward = async () => {
        if (!isEligible || unlocking) return;
        setUnlocking(true);
        try {
            const res = await api.post('/user/data/future-fund/unlock');
            if (res.success) {
                setViewState('active');
                addNotification('Success!', 'Future Fund activated!', 'success');
                await refreshUserProfile?.(false);
                await loadStatus();
            } else {
                addNotification('Not ready', res.message || 'Complete all criteria first', 'error');
            }
        } catch (err) {
            addNotification('Not ready', err.message || 'Complete all criteria first', 'error');
            await loadStatus();
        } finally {
            setUnlocking(false);
        }
    };

    const fundInfoRows = [
        {
            icon: Calendar,
            text: 'Fund distribution din complete hone ke baad hoti hai — aaj ki activity ke hisaab se kal credit milega।',
        },
        {
            icon: CreditCard,
            text: 'Paisa aapke Withdrawal Card par bheja jayega, jahan se aap withdraw kar sakte ho।',
        },
        {
            icon: Star,
            text: 'Rozana mehnat karo — jitna zyada kaam karoge, utna behtar future fund banega।',
        },
    ];

    if (loading) {
        return (
            <div className="p-8 text-center min-h-screen bg-[#FCF8F5] flex flex-col items-center justify-center font-poppins gap-3">
                <Loader2 className="animate-spin text-[#462211] w-10 h-10" />
                <p className="text-xs font-medium text-slate-400">Loading Fund Dashboard...</p>
            </div>
        );
    }

    if (viewState === 'active') {
        return (
            <div className="flex flex-col min-h-screen bg-[#FCF8F5] font-poppins pb-10">
                <FFHeader onBack={() => navigate(-1)} />

                <div className="px-3 space-y-3 max-w-md mx-auto w-full">
                    {/* Active status banner */}
                    <div className="bg-[#E8F5EE] border border-[#C6E7D4] rounded-2xl p-3.5 flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                <CheckCircle2 size={24} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-[14px] font-medium text-[#462211] leading-tight">Your Fund is Active!</h2>
                            <p className="text-[11px] text-[#462211] mt-1 leading-snug">
                                Congratulations! 🎉 अब आप रोजाना कमाई कर सकते हैं।
                            </p>
                        </div>
                    </div>

                    <ActionCards navigate={navigate} />

                    <SectionDivider title="Fund में पैसा बनाएँ" />

                    <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5 space-y-4">
                        <ProgressRow
                            icon={Play}
                            title="Ad Video देखें"
                            subtitle={`रोजाना अधिकतम ${dailyAdTarget} Ad Video देखें`}
                            current={dailyAdCurrent}
                            target={dailyAdTarget}
                            onClick={() => navigate('/user/watch')}
                        />
                        <ProgressRow
                            icon={ClipboardList}
                            title="Task Complete करें"
                            subtitle={`रोजाना अधिकतम ${dailyTaskTarget} Task पूरा करें`}
                            current={completedTasksCount}
                            target={dailyTaskTarget}
                            onClick={() => navigate('/user/earn')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5">
                            <div className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center mb-2">
                                <Wallet size={16} />
                            </div>
                            <p className="text-[10px] text-[#7A5648]">Today Earning</p>
                            <p className="text-[22px] font-medium text-[#462211] leading-none mt-1">₹{formatMoney(realEarningsData.todayFF)}</p>
                        </div>
                        <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5">
                            <div className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center mb-2">
                                <IndianRupee size={16} />
                            </div>
                            <p className="text-[10px] text-[#7A5648]">Lifetime Earning</p>
                            <p className="text-[22px] font-medium text-[#462211] leading-none mt-1">₹{formatMoney(realEarningsData.totalFF)}</p>
                        </div>
                    </div>

                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 space-y-3">
                        {fundInfoRows.map((row) => {
                            const Icon = row.icon;
                            return (
                                <div key={row.text} className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                                        <Icon size={14} />
                                    </div>
                                    <p className="text-[11px] text-[#1E40AF] leading-snug pt-1">{row.text}</p>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-center text-[11px] text-slate-400 pt-2 pb-4">
                        From <span className="font-semibold text-[#462211]">Jangu Group</span>
                    </p>
                </div>
            </div>
        );
    }

    const activationRows = [
        {
            key: 'kyc',
            label: `${kycTarget} KYC`,
            icon: User,
            current: kycCurrent,
            target: kycTarget,
            completed: !!salesCriterion.completed || kycCurrent >= kycTarget,
        },
        {
            key: 'ads',
            label: `${adsTarget} Ad Video`,
            icon: Play,
            current: adsCurrent,
            target: adsTarget,
            completed: !!activityCriterion.completed || adsCurrent >= adsTarget,
        },
        {
            key: 'tasks',
            label: `${tasksTarget} Task Complete करो`,
            icon: ClipboardList,
            current: tasksCurrent,
            target: tasksTarget,
            completed: !!daysCriterion.completed || tasksCurrent >= tasksTarget,
        },
    ];

    const instructions = [
        { icon: Play, text: 'Ad Video रोजाना देखो और fund balance बढ़ाओ।' },
        { icon: ClipboardList, text: 'Small tasks पूरे करो और अपने fund को जल्दी active करो।' },
        { icon: IndianRupee, text: 'Fund active होने के बाद भी आप daily काम करके passive income कमा सकते हो।' },
        { icon: AlertCircle, text: 'अगर Ad Video और Task नहीं करोगे तो fund में पैसा बहुत कम बनेगा या नहीं बनेगा।' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#FCF8F5] font-poppins pb-12">
            <FFHeader onBack={() => navigate(-1)} />

            <div className="px-3 space-y-3 max-w-md mx-auto w-full">
                <ActionCards navigate={navigate} />

                <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5">
                    <SectionDivider title="Future Fund Activation Criteria" />
                    <div className="space-y-3.5 mt-3.5">
                        {activationRows.map((row) => {
                            const Icon = row.icon;
                            const pct = criterionPct(row.current, row.target);
                            return (
                                <div key={row.key} className="flex items-start gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center shrink-0">
                                        <Icon size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[12px] font-medium text-[#462211]">{row.label}</p>
                                            {row.completed && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="flex-1 h-1.5 bg-[#F3E8E0] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#462211] rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-[#7A5648] w-8 text-right shrink-0">{pct}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleMoveForward}
                    disabled={!isEligible || unlocking}
                    className={`w-full py-3.5 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 ${
                        isEligible ? 'bg-[#462211] active:scale-[0.99]' : 'bg-[#462211]/40 cursor-not-allowed'
                    }`}
                >
                    {unlocking ? <><Loader2 size={16} className="animate-spin" /> Activating…</> : 'Activate Fund'}
                </button>

                <div className="bg-[#F3E8E0] rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <Info size={14} className="text-[#462211] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#462211] leading-snug">इन तीनों activity को complete करो और अपना fund enable करो।</p>
                </div>

                <div className="space-y-3 pt-1">
                    {instructions.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div key={row.text} className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center shrink-0">
                                    <Icon size={14} />
                                </div>
                                <p className="text-[12px] text-[#462211] leading-snug pt-1.5">{row.text}</p>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-[11px] text-slate-400 pt-2 pb-4">
                    From <span className="font-semibold text-[#462211]">Jangu Group</span>
                </p>
            </div>
        </div>
    );
};

export default FutureFund;
