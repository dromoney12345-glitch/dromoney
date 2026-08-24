import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
    UserPlus, IndianRupee, ClipboardList, Rocket, ChevronRight, ChevronLeft, Loader2,
    Wallet, Clock, Lock, Gift
} from 'lucide-react';
import api from '../../shared/services/api';

const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OptionCard = ({ icon: Icon, iconBg, iconColor, arrowBg, title, subtitle, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="w-full bg-white rounded-2xl px-3 py-3 flex items-center gap-3 text-left shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-slate-100/80 active:scale-[0.99]"
    >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={20} className={iconColor} strokeWidth={2.1} />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-slate-900 leading-tight">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
        </div>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${arrowBg}`}>
            <ChevronRight size={16} className={iconColor} strokeWidth={2.4} />
        </span>
    </button>
);

const Income = () => {
    const navigate = useNavigate();
    const { userData, loading: userLoading } = useUser();
    const status = String(userData?.kycStatus || 'Not Started').toLowerCase();
    const virtualUnlocked = !!userData?.isPaid && userData?.withdrawalCard?.status === 'active';
    const pending = Number(userData?.wallet?.pendingBalance ?? 0);
    const virtual = Number(userData?.wallet?.virtualBalance ?? 0);

    const [inviteAmount, setInviteAmount] = useState(null);
    const [offerwallEnabled, setOfferwallEnabled] = useState(false);
    const [futurePlan, setFuturePlan] = useState({
        title: 'Future Plan',
        subtitle: 'We are continuously bringing new earning opportunities for you.',
    });

    useEffect(() => {
        if (userLoading) return;
        if (status === 'pending' || status === 'rejected') navigate('/user/auth/pending');
        else if (status === 'not started') navigate('/user/auth/kyc');
    }, [status, navigate, userLoading]);

    useEffect(() => {
        const load = async () => {
            try {
                const [settingsRes, cmsRes] = await Promise.all([
                    api.get('/public/settings'),
                    api.get('/public/content/menu_future_features').catch(() => null),
                ]);
                const commission = Number(settingsRes?.data?.referralCommission);
                if (commission > 0) setInviteAmount(commission);
                setOfferwallEnabled(!!settingsRes?.data?.offerwallEnabled);

                const payload = cmsRes?.data?.data && typeof cmsRes.data.data === 'object'
                    ? cmsRes.data.data
                    : cmsRes?.data;
                if (payload?.title || payload?.subtitle) {
                    setFuturePlan({
                        title: payload.title || 'Future Plan',
                        subtitle: payload.subtitle || payload.description || 'We are continuously bringing new earning opportunities for you.',
                    });
                }
            } catch {
                /* keep live wallet data; copy fallbacks stay as UI labels */
            }
        };
        load();
    }, []);

    if (userLoading || status === 'pending' || status === 'rejected' || status === 'not started') {
        return (
            <div className="min-h-full flex flex-col items-center justify-center gap-3 bg-[#FCF8F5] font-poppins">
                <Loader2 className="animate-spin text-[#462211]" size={28} />
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Verifying KYC...</p>
            </div>
        );
    }

    const reward = inviteAmount;

    return (
        <div className="flex flex-col min-h-full bg-[#FCF8F5] font-poppins pb-4">
            <div className="bg-white px-3 sm:px-4 py-2.5 flex items-center gap-3 sticky top-0 z-40 border-b border-[#EDE4DC]">
                <button type="button" onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                    <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
                <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">Income</h1>
            </div>

            <div className="px-3 pt-2.5 space-y-2.5">
                <OptionCard
                    icon={UserPlus}
                    iconBg="bg-[#FFF5F0]"
                    iconColor="text-[#462211]"
                    arrowBg="bg-[#FFF5F0]"
                    title={reward != null ? `Invite & Earn ₹${reward}` : 'Invite & Earn'}
                    subtitle={reward != null ? `₹${reward} goes to Pending after KYC, then to Virtual Wallet in min 14 and max 28 days.` : 'Reward is credited after KYC, then to Virtual Wallet in min 14 and max 28 days.'}
                    onClick={() => navigate('/user/guide/invite')}
                />
                <OptionCard
                    icon={IndianRupee}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    arrowBg="bg-emerald-50"
                    title="Future Fund"
                    subtitle="Build daily activity and grow with the fund."
                    onClick={() => navigate('/user/guide/fund')}
                />
                <OptionCard
                    icon={ClipboardList}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-600"
                    arrowBg="bg-sky-50"
                    title="Work Daily, Start Earning"
                    subtitle="See how daily work and company tasks run."
                    onClick={() => navigate('/user/guide/daily')}
                />
                {offerwallEnabled && (
                    <OptionCard
                        icon={Gift}
                        iconBg="bg-[#FFF5F0]"
                        iconColor="text-[#B3591C]"
                        arrowBg="bg-[#FFF5F0]"
                        title="Offers & Surveys"
                        subtitle="Complete partner offers. Reward is added after confirmation."
                        onClick={() => navigate('/user/offerwall')}
                    />
                )}

                <div className="bg-white rounded-2xl px-3.5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-slate-100/80">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Wallet size={16} className="text-[#462211]" />
                            <span className="text-[14px] font-bold text-slate-900">Wallet</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/user/wallet', { state: { pane: 'pending' } })}
                            className="text-[11px] font-semibold text-[#462211] flex items-center"
                        >
                            View Wallet <ChevronRight size={13} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                if (virtualUnlocked) navigate('/user/wallet', { state: { pane: 'virtual' } });
                                else navigate('/user/virtual-account');
                            }}
                            className="pr-3 text-left"
                        >
                            <div className="flex items-center gap-1 mb-1">
                                <Wallet size={13} className="text-[#462211]" />
                                <p className="text-[10px] text-slate-400">Virtual Account</p>
                            </div>
                            <p className="text-[18px] sm:text-[20px] font-bold text-[#462211] leading-none">₹{formatMoney(virtual)}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                {virtualUnlocked ? 'Available Balance' : (
                                    <>
                                        <Lock size={10} /> Locked
                                    </>
                                )}
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/user/wallet', { state: { pane: 'pending' } })}
                            className="pl-3 text-left"
                        >
                            <div className="flex items-center gap-1 mb-1">
                                <Clock size={13} className="text-[#462211]" />
                                <p className="text-[10px] text-slate-400">Pending Wallet</p>
                            </div>
                            <p className="text-[18px] sm:text-[20px] font-bold text-[#462211] leading-none">₹{formatMoney(pending)}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5">Always open</p>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/user/guide/options')}
                    className="w-full bg-white rounded-2xl px-3 py-3 flex items-center gap-3 text-left shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-slate-100/80 active:scale-[0.99]"
                >
                    <div className="w-11 h-11 rounded-2xl bg-[#FFF5F0] flex items-center justify-center shrink-0">
                        <Rocket size={20} className="text-[#462211]" strokeWidth={2.1} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight">{futurePlan.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{futurePlan.subtitle}</p>
                    </div>
                    <ChevronRight size={18} className="text-[#462211] shrink-0" />
                </button>

                <p className="text-center text-[11px] text-slate-400 pt-2 pb-1">
                    from <span className="font-semibold text-slate-500">Jangu Group</span>
                </p>
            </div>
        </div>
    );
};

export default Income;
