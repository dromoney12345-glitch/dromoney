import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import {
    Users, Copy, Send, ChevronLeft,
    History, CheckCircle2, Share2, ArrowUpRight, Wallet, TrendingUp, Trophy, Shield, Mail
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildReferralLink } from '../../shared/utils/referral';

const Marketing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userData } = useUser();
    const [copied, setCopied] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(200);
    const [linkBase, setLinkBase] = useState('');
    const [showReferralLink, setShowReferralLink] = useState(location.state?.showReferral || false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [referrals, setReferrals] = useState([]);

    const referralCode = userData?.referrals?.code || '';
    const referralLink = buildReferralLink(referralCode, linkBase);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setRewardAmount(res.data.referralCommission || 200);
                    setLinkBase(res.data.referralLinkBaseUrl || '');
                }
            } catch (err) {
                console.error("Failed to fetch referral settings", err);
            }
        };
        fetchSettings();
    }, []);

    React.useEffect(() => {
        if (!showReferralLink) return;
        const loadReferrals = async () => {
            try {
                const res = await api.get('/user/data/referrals');
                if (res.success) setReferrals(res.data || []);
            } catch (err) {
                console.error('Failed to load referrals', err);
            }
        };
        loadReferrals();
    }, [showReferralLink]);

    const inviteBadge = (ref) => {
        if (ref.status === 'Completed') return 'Released';
        if (ref.status === 'Failed') return 'Removed';
        if (ref.daysLeft != null) return `${ref.daysLeft} days left`;
        return ref.kycStatus || 'Pending';
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async () => {
        const shareText = `Hey! Join Dromoney and start earning 🚀\n\nInvite code: ${referralCode}\n\n${referralLink}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Dromoney & Earn',
                    text: shareText,
                    url: referralLink,
                });
            } catch (err) {
                console.log('Share failed or cancelled');
            }
        } else {
            setShowShareModal(true);
        }
    };

    const shareOnSocial = (platform) => {
        const message = encodeURIComponent(`Hey! Join Dromoney and start earning 🚀\n\nInvite code: ${referralCode}\n\n${referralLink}`);
        const url = encodeURIComponent(referralLink);
        
        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${message}`, '_blank');
                break;
            case 'telegram':
                window.open(`https://t.me/share/url?url=${url}&text=${message}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${message}`, '_blank');
                break;
            case 'email':
                window.open(`mailto:?subject=Join Dromoney&body=${message}`, '_self');
                break;
            default:
                break;
        }
        setShowShareModal(false);
    };

    /* ─── Referral / Affiliate View ─── */
    if (showReferralLink) {
        return (
            <div className="flex flex-col min-h-fit bg-[#FCF8F5] font-poppins pb-20">
                <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-[#EDE4DC] sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowReferralLink(false)} className="text-[#462211] active:scale-95 transition-all">
                            <ChevronLeft size={22} strokeWidth={2.2} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-[16px] font-semibold text-[#462211] tracking-tight leading-none">Affiliate Center</h1>
                            <p className="text-[9px] font-semibold text-[#B3591C] uppercase tracking-widest mt-0.5">Share & Earn</p>
                        </div>
                    </div>
                    <span className="text-[9px] font-semibold text-[#B3591C] bg-[#FFF5F0] border border-[#EDE4DC] px-2.5 py-1 rounded-full uppercase tracking-widest">Active</span>
                </div>

                <div className="flex-1 overflow-y-auto pt-2 space-y-2.5 px-3">
                    {/* Main Invite Card */}
                    <div className="bg-white rounded-2xl border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] p-4">
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className="w-12 h-12 bg-[#462211] rounded-xl flex items-center justify-center text-white shadow-md">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-semibold text-[#462211] leading-tight">Affiliate Program</h3>
                                <p className="text-[10px] font-semibold text-[#B3591C] uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                    ₹{rewardAmount} Reward per referral <CheckCircle2 size={10} className="text-emerald-500" />
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-xl p-1 pl-3.5 flex items-center justify-between gap-2 mb-3.5">
                            <a href={referralLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[#7A5648] truncate tracking-tight hover:text-[#B3591C] hover:underline">
                                {referralLink}
                            </a>
                            <button
                                onClick={handleCopy}
                                className={`px-3.5 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 shrink-0
                                    ${copied ? 'bg-emerald-500 text-white' : 'bg-[#462211] text-white'}`}
                            >
                                {copied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>

                        <button 
                            onClick={handleInvite}
                            className="w-full bg-[#B3591C] hover:bg-[#9E4E18] active:scale-95 text-white font-semibold uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all text-[11px] shadow-[0_2px_8px_rgba(179,89,28,0.35)]"
                        >
                            <Send size={15} className="rotate-[-20deg]" />
                            INVITE & EARN NOW
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="bg-white rounded-2xl border border-[#EDE4DC] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-[#FFF5F0] rounded-lg border border-[#EDE4DC] flex items-center justify-center">
                                <Users size={14} className="text-[#462211]" />
                            </div>
                            <span className="text-[11px] font-semibold text-[#462211] uppercase tracking-wider">Total Members</span>
                        </div>
                        <span className="text-[13px] font-semibold text-[#462211]">{userData?.referrals?.count || 0}</span>
                    </div>

                    {/* Earnings */}
                    <div className="bg-white rounded-2xl border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] p-4">
                        <div className="flex items-center justify-between mb-3.5">
                            <div>
                                <span className="text-[10px] font-semibold text-[#9A8478] uppercase tracking-wider">Total Affiliate Earnings</span>
                                <h4 className="text-2xl font-bold text-[#462211] tracking-tight mt-0.5">₹{Number(userData?.earnings?.referral || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            </div>
                            <div className="w-10 h-10 bg-[#FFF5F0] text-[#B3591C] flex items-center justify-center rounded-xl border border-[#EDE4DC]">
                                <Wallet size={18} />
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/user/marketing-history')}
                            className="w-full bg-[#FFF5F0] border border-[#EDE4DC] py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#F8EDE4] active:scale-95 transition-all"
                        >
                            <History size={14} className="text-[#9A8478]" />
                            <span className="text-[10px] font-semibold text-[#462211] uppercase tracking-widest">Transaction History</span>
                            <ArrowUpRight size={13} className="text-[#9A8478]" />
                        </button>
                    </div>

                    {/* How it works */}
                    <div className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-2xl p-3.5">
                        <h5 className="text-[11px] font-semibold text-[#462211] uppercase tracking-wider mb-1">How it works</h5>
                        <p className="text-[10px] font-medium text-[#7A5648] leading-relaxed">
                            Share your link. When a friend completes KYC, ₹{rewardAmount} goes to your Pending Wallet. It releases to Virtual Wallet when they create a Withdrawal Card within 28 days.
                        </p>
                    </div>

                    {referrals.length > 0 && (
                        <div>
                            <h5 className="text-[11px] font-semibold text-[#462211] uppercase tracking-wider mb-2 px-1">Invite Status</h5>
                            <div className="bg-white rounded-2xl border border-[#EDE4DC] divide-y divide-[#F3E8E0] overflow-hidden">
                                {referrals.map((ref) => (
                                    <div key={ref._id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-[#462211] truncate">{ref.name}</p>
                                            <p className="text-[10px] text-[#9A8478]">₹{ref.amount} · {ref.status}</p>
                                        </div>
                                        <span className="text-[9px] font-semibold text-[#B3591C] bg-[#FFF5F0] px-2 py-0.5 rounded-full shrink-0 border border-[#EDE4DC]">
                                            {inviteBadge(ref)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center">
                        <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-[#462211]">Share via</h3>
                                <button onClick={() => setShowShareModal(false)} className="text-[#9A8478] hover:text-[#462211]">✕</button>
                            </div>
                            <div className="grid grid-cols-4 gap-y-5 gap-x-4 mb-4">
                                <button onClick={() => shareOnSocial('whatsapp')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                                        <Share2 size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">WhatsApp</span>
                                </button>
                                <button onClick={() => shareOnSocial('telegram')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                                        <Send size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">Telegram</span>
                                </button>
                                <button onClick={() => shareOnSocial('facebook')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">Facebook</span>
                                </button>
                                <button onClick={() => shareOnSocial('twitter')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-[#F3E8E0] text-[#462211] rounded-xl flex items-center justify-center border border-[#EDE4DC]">
                                        <span className="font-bold text-[16px]">X</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">Twitter</span>
                                </button>
                                <button onClick={() => shareOnSocial('email')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100">
                                        <Mail size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">Email</span>
                                </button>
                                <button onClick={() => { handleCopy(); setShowShareModal(false); }} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-[#FFF5F0] text-[#462211] rounded-xl flex items-center justify-center border border-[#EDE4DC]">
                                        <Copy size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-[#462211]">Copy Link</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    /* ─── Information Center (4 Cards) ─── */
    const CARDS = [
        {
            icon: Share2, title: 'Referral System', badge: `EARN ₹${rewardAmount} REWARD`,
            accent: '#B3591C', accentBg: '#FFF5F0',
            steps: [
                { title: 'SHARE YOUR LINK', text: 'Share your referral link with friends.' },
                { title: `EARN ₹${rewardAmount} INSTANT`, text: `Earn ₹${rewardAmount} instantly for every successful registration.` },
                { title: 'DIRECT WALLET CREDIT', text: 'Your reward is credited directly to your wallet and can be withdrawn.' },
            ],
            cta: 'GET REFERRAL LINK', ctaAction: () => setShowReferralLink(true),
        },
        {
            icon: CheckCircle2, title: 'Daily Tasks', badge: 'COLLECT REWARD COINS',
            accent: '#462211', accentBg: '#F8EDE4',
            steps: [
                { title: 'COMPLETE TASKS', text: 'Complete simple daily tasks and earn reward coins.' },
                { title: 'REDEEM FOR CASH', text: 'Convert these coins to real cash later.' },
                { title: '3X BOOSTER BENEFIT', text: 'Activate a booster to multiply your coin earnings up to 3X.' },
            ],
            cta: 'VIEW TASKS', ctaAction: () => navigate('/user/earn'),
        },
        {
            icon: TrendingUp, title: 'Future Fund', badge: 'PASSIVE INCOME SECURITY',
            accent: '#5D2E17', accentBg: '#F3E8E0',
            steps: [
                { title: 'PLATFORM STAKE', text: 'Once eligible, you receive a share of platform profits.' },
                { title: 'MONTHLY PAYOUTS', text: 'Profit share is auto-credited to your wallet every month.' },
                { title: 'LONG TERM GROWTH', text: 'As the platform grows, your passive income increases too.' },
            ],
            cta: 'CHECK ELIGIBILITY', ctaAction: () => navigate('/user/future-fund'),
        },
        {
            icon: Trophy, title: 'Events & Contests', badge: 'WIN BIG PRIZES',
            accent: '#7A5648', accentBg: '#FFF5F0',
            steps: [
                { title: 'WEEKLY CONTESTS', text: 'New exciting events go live every week for a limited time.' },
                { title: 'MEGA JACKPOTS', text: 'Join contests to win up to ₹500 in instant cash and exciting prizes.' },
                { title: 'LEADERBOARD REWARDS', text: 'Top earners receive special bonuses and verification badges.' },
            ],
            cta: 'VIEW EVENTS', ctaAction: () => navigate('/user/events'),
        },
    ];

    return (
        <div className="flex flex-col min-h-fit bg-[#FCF8F5] font-poppins pb-24 relative overflow-hidden">
            <div className="bg-white px-4 py-2.5 flex items-center gap-3.5 sticky top-0 z-40 border-b border-[#EDE4DC]">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-9 h-9 flex items-center justify-center text-[#462211] active:scale-90 transition-all shrink-0"
                >
                    <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight leading-none">Information Center</h1>
                    <p className="text-[9px] font-semibold text-[#9A8478] uppercase tracking-widest mt-1 leading-none">Guide to Earning Systems</p>
                </div>
            </div>

            <div className="px-3 pt-3 pb-6 flex flex-col gap-3 relative z-10 max-w-md mx-auto w-full">
                {CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className="bg-white rounded-2xl border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] p-4 transition-all">
                            <div className="flex items-center gap-3.5 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: card.accentBg, color: card.accent }}>
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-[#462211] leading-tight tracking-tight">{card.title}</h3>
                                    <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: card.accent }}>{card.badge}</p>
                                </div>
                            </div>
                            <div className="space-y-3 mb-4">
                                {card.steps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold" style={{ backgroundColor: card.accentBg, color: card.accent }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <h4 className="text-[11px] font-semibold text-[#462211] uppercase tracking-wide mb-0.5 leading-none">{step.title}</h4>
                                            <p className="text-[10.5px] font-medium text-[#7A5648] leading-snug">{step.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); card.ctaAction(); }}
                                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold uppercase text-[11px] tracking-wider transition-all active:scale-95 shadow-md text-white"
                                style={{ backgroundColor: card.accent }}
                            >
                                {card.cta}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Marketing;
