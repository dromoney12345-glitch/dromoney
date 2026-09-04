import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, CheckCircle2, Loader2, Info, Play, ClipboardList, User,
    IndianRupee, AlertCircle, ChevronRight, Package, Wallet, Star,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import FundRewardNotice from '../components/FundRewardNotice';

const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ActiveHeader = ({ onBack }) => (
    <div className="px-4 py-2.5 bg-[#FCF8F5] flex items-center justify-between shrink-0 gap-2 border-b border-[#EDE4DC]/40">
        <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={onBack} className="text-[#462211] active:scale-90 transition-all shrink-0">
                <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight truncate">Active Fund</h1>
        </div>
        <span className="bg-[#F3E8E0] text-[#462211] px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shrink-0">
            <Package size={12} /> Future Fund
        </span>
    </div>
);

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
            <p className="text-[9px] text-[#7A5648] mt-0.5 leading-snug pr-4">Watch ad videos and grow your fund</p>
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
            <p className="text-[9px] text-[#7A5648] mt-0.5 leading-snug pr-4">Complete small tasks and grow your fund</p>
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

const DailyProgressRow = ({ icon: Icon, title, current, target, onClick }) => {
    const safeTarget = Math.max(Number(target) || 1, 1);
    const safeCurrent = Math.min(Number(current) || 0, safeTarget);
    const pct = Math.round(Math.min(100, (safeCurrent / safeTarget) * 100));
    const Wrapper = onClick ? 'button' : 'div';
    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`w-full text-left ${onClick ? 'active:opacity-80' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center shrink-0">
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[13px] font-semibold text-[#462211]">{title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[12px] font-medium text-[#462211]">{safeCurrent}/{safeTarget}</span>
                            <span className="text-[11px] font-medium text-[#7A5648] w-8 text-right">{pct}%</span>
                        </div>
                    </div>
                    <div className="h-2 bg-[#F3E8E0] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#462211] rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, minWidth: safeCurrent > 0 ? '6px' : 0 }}
                        />
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
        futureFundKycTarget: 10,
        futureFundDailyTasksTarget: 50,
        futureFundWatchAdTarget: 50,
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
                } else {
                    setViewState('initial');
                }
            }

            if (settingsRes.success && settingsRes.data) {
                setSettings({
                    futureFundKycTarget: Number(settingsRes.data.futureFundKycTarget) || 10,
                    futureFundDailyTasksTarget: Number(settingsRes.data.futureFundDailyTasksTarget) || 50,
                    futureFundWatchAdTarget: Number(settingsRes.data.futureFundWatchAdTarget) || 50,
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

    const refreshActiveProgress = useCallback(async () => {
        await Promise.all([
            loadStatus(),
            refreshUserProfile?.(false),
        ]);
    }, [loadStatus, refreshUserProfile]);

    useEffect(() => {
        if (viewState !== 'active') return undefined;

        const scrollTargets = [];
        document.querySelectorAll('.user-app-shell .overflow-y-auto').forEach((el) => {
            scrollTargets.push({ el, overflow: el.style.overflow, overflowY: el.style.overflowY });
            el.style.overflow = 'hidden';
            el.style.overflowY = 'hidden';
        });

        const htmlPrev = document.documentElement.style.overflow;
        const bodyPrev = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        return () => {
            scrollTargets.forEach(({ el, overflow, overflowY }) => {
                el.style.overflow = overflow;
                el.style.overflowY = overflowY;
            });
            document.documentElement.style.overflow = htmlPrev;
            document.body.style.overflow = bodyPrev;
        };
    }, [viewState]);

    // Active screen only when server confirms status (criteria must already be fulfilled).
    useEffect(() => {
        if (!ffStatus) return;
        setViewState(ffStatus.status === 'active' ? 'active' : 'initial');
    }, [ffStatus?.status]);

    useEffect(() => {
        refreshActiveProgress();
        const pollMs = viewState === 'active' ? 15 * 1000 : 60 * 1000;
        const t = setInterval(loadStatus, pollMs);
        return () => clearInterval(t);
    }, [
        loadStatus,
        refreshActiveProgress,
        viewState,
        userData.lifetimeTasksCompleted,
        userData.lifetimeAdsWatched,
        userData.todayRewardCount,
        userData.dailyTaskCompletions,
    ]);

    useEffect(() => {
        if (viewState !== 'active') return undefined;

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshActiveProgress();
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [viewState, refreshActiveProgress]);

    const completedTasksCount = useMemo(() => {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        return (userData.dailyTaskCompletions || []).filter(
            (c) => new Date(c.completedAt) >= since
        ).length;
    }, [userData.dailyTaskCompletions]);

    const dailyAdTarget = Number(ffStatus?.dailyProgress?.ads?.target ?? rewardStatus?.maxDailyLimit) || 10;
    const dailyTaskTarget = Number(ffStatus?.dailyProgress?.tasks?.target) || 10;
    const dailyAdCurrent = useMemo(() => {
        if (ffStatus?.dailyProgress?.ads?.current != null) {
            return Number(ffStatus.dailyProgress.ads.current) || 0;
        }
        if (rewardStatus?.maxDailyLimit != null && rewardStatus?.remainingAds != null) {
            return Math.min(
                dailyAdTarget,
                Math.max(0, Number(rewardStatus.maxDailyLimit) - Number(rewardStatus.remainingAds))
            );
        }
        return Math.min(dailyAdTarget, Number(userData.todayRewardCount) || 0);
    }, [ffStatus?.dailyProgress?.ads?.current, rewardStatus, dailyAdTarget, userData.todayRewardCount]);

    const dailyTaskCurrent = useMemo(() => {
        if (ffStatus?.dailyProgress?.tasks?.current != null) {
            return Number(ffStatus.dailyProgress.tasks.current) || 0;
        }
        return Math.min(dailyTaskTarget, completedTasksCount);
    }, [ffStatus?.dailyProgress?.tasks?.current, dailyTaskTarget, completedTasksCount]);

    const byUnit = (unit, id) =>
        ffStatus?.criteria?.find((c) => c.unit === unit || c.id === id) || null;

    const kycCriterion = byUnit('kyc', 1);
    const adsCriterion = byUnit('ads', 2);
    const tasksCriterion = byUnit('tasks', 3);

    const kycTarget = Number(kycCriterion?.target || ffStatus?.targets?.kycTarget || settings.futureFundKycTarget || 10);
    const adsTarget = Number(adsCriterion?.target || ffStatus?.targets?.adsTarget || settings.futureFundWatchAdTarget || 50);
    const tasksTarget = Number(tasksCriterion?.target || ffStatus?.targets?.tasksTarget || settings.futureFundDailyTasksTarget || 50);
    const kycCurrent = Number(kycCriterion?.current ?? 0);
    // Prefer live Future Fund status criteria (synced after each ad/task).
    const adsCurrent = Number(adsCriterion?.current ?? userData.lifetimeAdsWatched ?? 0);
    const tasksCurrent = Number(tasksCriterion?.current ?? userData.lifetimeTasksCompleted ?? 0);
    const isEligible = !!ffStatus?.eligible;
    const criterionPct = (current, target) =>
        Math.round(Math.min(100, (Number(current) / Math.max(Number(target) || 1, 1)) * 100));

    const todayFF = Number(ffStatus?.todayEarnings || 0);
    const totalFF = Number(ffStatus?.lifetimeEarnings || 0);

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
            <div className="h-full max-h-full flex flex-col overflow-hidden overscroll-none bg-[#FCF8F5] font-poppins">
                <ActiveHeader onBack={() => navigate(-1)} />

                {/* Hero — compact, no extra scroll height */}
                <div className="relative w-full shrink-0 px-4 pt-3 pb-3 bg-gradient-to-b from-[#FFF0E6] via-[#FFF8F3] to-[#FCF8F5] overflow-hidden">
                    <Star size={12} className="absolute top-3 left-5 text-[#E8C4A8]/50" fill="currentColor" />
                    <Star size={9} className="absolute top-6 right-8 text-[#E8C4A8]/40" fill="currentColor" />

                    <div className="relative flex flex-col items-center text-center">
                        <div className="relative mb-2">
                            <div className="w-14 h-14 rounded-full bg-[#462211] flex items-center justify-center shadow-md ring-4 ring-[#F3E8E0]">
                                <CheckCircle2 size={28} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <h2 className="text-[18px] font-bold text-[#462211] leading-tight">Congratulations!</h2>
                        <p className="text-[12px] text-[#462211] mt-0.5">
                            Your Fund is now <span className="font-bold">Active</span>
                        </p>

                        <div className="grid grid-cols-2 gap-2 w-full mt-3">
                            <div className="bg-white/80 rounded-xl px-2.5 py-2.5 text-left border border-[#EDE4DC]/60">
                                <div className="w-7 h-7 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center mb-1">
                                    <IndianRupee size={13} />
                                </div>
                                <p className="text-[9px] text-[#7A5648] font-medium">Today Earning</p>
                                <p className="text-[16px] font-bold text-[#462211] leading-tight">₹{formatMoney(todayFF)}</p>
                            </div>
                            <div className="bg-white/80 rounded-xl px-2.5 py-2.5 text-left border border-[#EDE4DC]/60">
                                <div className="w-7 h-7 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center mb-1">
                                    <Wallet size={13} />
                                </div>
                                <p className="text-[9px] text-[#7A5648] font-medium">Lifetime Earning</p>
                                <p className="text-[16px] font-bold text-[#462211] leading-tight">₹{formatMoney(totalFF)}</p>
                            </div>
                        </div>

                        <div className="w-full mt-2.5 bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-2.5 py-2 flex items-start gap-1.5 text-left">
                            <Info size={12} className="text-[#462211] shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[#462211] leading-snug">
                                Your earning will be transferred to your wallet daily.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-2">
                    <div className="shrink-0 pt-1">
                        <ActionCards navigate={navigate} />
                    </div>

                    <div className="shrink-0 mt-3 space-y-3">
                        <SectionDivider title="Your Daily Progress" />
                        <div className="space-y-3">
                            <DailyProgressRow
                                icon={Play}
                                title={`${dailyAdTarget} Ad Videos`}
                                current={dailyAdCurrent}
                                target={dailyAdTarget}
                                onClick={() => navigate('/user/watch')}
                            />
                            <DailyProgressRow
                                icon={ClipboardList}
                                title={`${dailyTaskTarget} Tasks`}
                                current={dailyTaskCurrent}
                                target={dailyTaskTarget}
                                onClick={() => navigate('/user/earn')}
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-h-0" aria-hidden="true" />

                    <div className="shrink-0 space-y-2 pt-2">
                        <div className="w-full bg-[#F3E8E0]/70 border border-[#EDE4DC] rounded-xl px-3 py-2.5 text-center">
                            <p className="text-[11px] text-[#462211] leading-snug font-medium">
                                Keep doing both activities daily to earn daily passive income from your fund.{' '}
                                <span className="font-bold">Ad Video + Task</span>.
                            </p>
                        </div>

                        <p className="text-center text-[10px] text-[#9A8478]">
                            From <span className="font-semibold text-[#462211]">Jangu Group</span>
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate('/user/home')}
                            className="w-full py-3 rounded-xl text-[13px] font-semibold text-white bg-[#462211] active:scale-[0.99] shadow-[0_4px_12px_rgba(70,34,17,0.2)]"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activationRows = [
        {
            key: 'kyc',
            label: `${kycTarget} Successful KYC`,
            subtitle: 'Invited friends who complete KYC',
            icon: User,
            current: kycCurrent,
            target: kycTarget,
            completed: !!kycCriterion?.completed || kycCurrent >= kycTarget,
            onClick: () => navigate('/user/marketing'),
        },
        {
            key: 'ads',
            label: `${adsTarget} Advertisement Videos`,
            subtitle: 'Watch ads in the app to grow this count',
            icon: Play,
            current: adsCurrent,
            target: adsTarget,
            completed: !!adsCriterion?.completed || adsCurrent >= adsTarget,
            onClick: () => navigate('/user/watch'),
        },
        {
            key: 'tasks',
            label: `${tasksTarget} Tasks`,
            subtitle: 'Complete daily / company tasks',
            icon: ClipboardList,
            current: tasksCurrent,
            target: tasksTarget,
            completed: !!tasksCriterion?.completed || tasksCurrent >= tasksTarget,
            onClick: () => navigate('/user/earn'),
        },
    ];

    const instructions = [
        { icon: Play, text: 'Watch ad videos daily and grow your fund balance.' },
        { icon: ClipboardList, text: 'Complete small tasks to activate your fund faster.' },
        { icon: IndianRupee, text: 'Even after your fund is active, keep working daily to earn passive income.' },
        { icon: AlertCircle, text: 'If you skip ad videos and tasks, your fund earnings will be very low or may not grow.' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#FCF8F5] font-poppins pb-12">
            <FFHeader onBack={() => navigate(-1)} />

            <div className="px-3 space-y-3 max-w-md mx-auto w-full">
                <ActionCards navigate={navigate} />

                <FundRewardNotice />

                <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5">
                    <SectionDivider title="Future Fund Activation Criteria" />
                    <div className="space-y-3.5 mt-3.5">
                        {activationRows.map((row) => {
                            const Icon = row.icon;
                            const pct = criterionPct(row.current, row.target);
                            return (
                                <button
                                    key={row.key}
                                    type="button"
                                    onClick={row.onClick}
                                    className="w-full flex items-start gap-2.5 text-left active:opacity-80"
                                >
                                    <div className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center shrink-0">
                                        <Icon size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[12px] font-medium text-[#462211]">{row.label}</p>
                                            <span className="text-[11px] font-medium text-[#462211] shrink-0">
                                                {Math.min(row.current, row.target)}/{row.target}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-[#7A5648] mt-0.5 leading-snug">{row.subtitle}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="flex-1 h-1.5 bg-[#F3E8E0] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#462211] rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            {row.completed
                                                ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                : <span className="text-[10px] text-[#7A5648] w-8 text-right shrink-0">{pct}%</span>}
                                        </div>
                                    </div>
                                </button>
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
                    <p className="text-[11px] text-[#462211] leading-snug">
                        Activate with {kycTarget} Successful KYC, {adsTarget} Advertisement Videos, and {tasksTarget} Tasks.
                    </p>
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
