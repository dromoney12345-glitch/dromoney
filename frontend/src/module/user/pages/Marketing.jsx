import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import {
    Users, Copy, Send, ChevronLeft,
    History, CheckCircle2, Share2, ArrowUpRight, Wallet, TrendingUp, Trophy, Shield, Mail
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnlockModal from '../components/UnlockModal';

const Marketing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userData } = useUser();
    const [copied, setCopied] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(200);
    const [showReferralLink, setShowReferralLink] = useState(location.state?.showReferral || false);
    const [showShareModal, setShowShareModal] = useState(false);

    const referralLink = userData?.referrals?.link || `https://earningapp.com/join/nhgfAFF-${userData?.referrals?.code || ''}`;

    if (!userData?.isPaid) {
        return (
            <div className="min-h-screen bg-[#f8fafc] font-poppins">
                <UnlockModal isOpen={true} onClose={() => navigate('/user/income')} />
            </div>
        );
    }

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/public/settings');
                if (res.success && res.data) {
                    setRewardAmount(res.data.referralCommission);
                }
            } catch (err) {
                console.error("Failed to fetch referral settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Dromoney & Earn',
                    text: `Hey! Join Dromoney using my link and start earning ₹${rewardAmount} per referral easily! 🚀`,
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
        const message = encodeURIComponent(`Hey! Join Dromoney using my link and start earning ₹${rewardAmount} per referral easily! 🚀\n\n${referralLink}`);
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

    if (showReferralLink) {
        return (
            <div className="flex flex-col min-h-fit bg-[#f0f4f9] font-poppins pb-20">
                {/* ── Compact Header ── */}
                <div className="bg-white px-5 py-2.5 flex items-center justify-between border-b border-slate-100 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowReferralLink(false)} className="text-slate-500 active:scale-95 transition-all">
                            <ChevronLeft size={22} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-[16px] font-medium text-slate-800 tracking-tight leading-none">Affiliate Center</h1>
                            <p className="text-[9px] font-medium text-sky-600 uppercase tracking-widest mt-0.5">Share & Earn</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 border border-emerald-100">
                        <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-widest">Active</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-2 space-y-2">
                    {/* ── Main Invite Card (Fintech Style) ── */}
                    <div className="bg-white border-b border-slate-100 p-5">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-blue-600 rounded-none flex items-center justify-center text-white shadow-lg">
                                <Users size={22} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-medium text-slate-800 leading-tight">Affiliate Program</h3>
                                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mt-1 flex items-center gap-1">
                                    ₹{rewardAmount} Reward per referral <CheckCircle2 size={10} className="text-emerald-500" />
                                </p>
                            </div>
                        </div>

                        {/* Referral Link Box */}
                        <div className="bg-slate-50 border border-slate-200 p-1 pl-4 flex items-center justify-between gap-3 mb-4">
                            <a href={referralLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-slate-500 truncate tracking-tight hover:text-blue-600 hover:underline">
                                {referralLink}
                            </a>
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2 text-[10px] font-medium uppercase tracking-widest transition-all active:scale-95 shrink-0
                                    ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-blue-600 border-l border-slate-200'}`}
                            >
                                {copied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>

                        <button 
                            onClick={handleInvite}
                            className="w-full bg-[#1e293b] hover:bg-black active:scale-95 text-white font-medium uppercase tracking-widest py-3.5 rounded-none flex items-center justify-center gap-2.5 transition-all text-[11px] shadow-md"
                        >
                            <Send size={16} className="rotate-[-20deg]" />
                            INVITE & EARN NOW
                        </button>
                    </div>

                    {/* ── Stats Strip ── */}
                    <div className="bg-white border-y border-slate-100 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <Users size={16} className="text-blue-500" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-800 uppercase tracking-widest">Total Members</span>
                        </div>
                        <span className="text-[13px] font-medium text-slate-900">{userData?.referrals?.count || 0} Participants</span>
                    </div>

                    {/* ── Earnings Section (Payment Style) ── */}
                    <div className="bg-white border-y border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.15em] mb-1">Total Affiliate Earnings</span>
                                <h4 className="text-2xl font-medium text-slate-800 tracking-tighter">₹{Number(userData?.earnings?.referral || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            </div>
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <Wallet size={20} />
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/user/marketing-history')}
                            className="w-full bg-slate-50 border border-slate-200 py-3 flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-95 transition-all group"
                        >
                            <History size={16} className="text-slate-400" />
                            <span className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">Transaction History</span>
                            <ArrowUpRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </button>
                    </div>

                    {/* ── Information Strip ── */}
                    <div className="px-5 py-4">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <h5 className="text-[11px] font-medium text-blue-800 uppercase tracking-wider mb-1">How it works</h5>
                            <p className="text-[10px] font-medium text-blue-600 leading-relaxed">
                                Share your referral link with friends. When they join and verify their account, you instantly receive ₹200 in your wallet.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center">
                        <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom-full duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-medium text-slate-800">Share via</h3>
                                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="grid grid-cols-4 gap-y-6 gap-x-4 mb-4">
                                <button onClick={() => shareOnSocial('whatsapp')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <Share2 size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">WhatsApp</span>
                                </button>
                                <button onClick={() => shareOnSocial('telegram')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center">
                                        <Send size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">Telegram</span>
                                </button>
                                <button onClick={() => shareOnSocial('facebook')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">Facebook</span>
                                </button>
                                <button onClick={() => shareOnSocial('twitter')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center">
                                        <span className="font-bold text-[16px] font-serif">X</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">Twitter</span>
                                </button>
                                <button onClick={() => shareOnSocial('email')} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                        <Mail size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">Email</span>
                                </button>
                                <button onClick={() => { handleCopy(); setShowShareModal(false); }} className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                                        <Copy size={20} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">Copy Link</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Otherwise show the 4 cards Information Center (guide to earning systems)
    return (
        <div className="flex flex-col min-h-fit bg-[#F8FAFC] font-poppins pb-24 relative overflow-hidden">
            {/* ── Header ── */}
            <div className="bg-white px-5 py-2.5 flex items-center gap-4 sticky top-0 z-40 border-b border-slate-100 shadow-sm">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 active:scale-90 transition-all shadow-sm shrink-0"
                >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-[17px] font-medium text-slate-800 uppercase tracking-wide leading-none">Information Center</h1>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.15em] mt-1.5 leading-none">Guide to Earning Systems</p>
                </div>
            </div>

            {/* Content: 4 Cards */}
            <div className="px-4 pt-3 pb-6 flex flex-col gap-4 relative z-10 overflow-y-auto max-w-md mx-auto w-full">
                {/* Card 1: Referral SysteM */}
                <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-5 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#EEF2FF] text-[#2563EB]">
                            <Share2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-[18px] font-medium text-slate-800 leading-none tracking-tight flex items-center gap-1.5 font-poppins italic">
                                Referral System
                            </h3>
                            <p className="text-[10px] font-medium uppercase tracking-wider mt-1.5 text-[#2563EB]">
                                EARN ₹{rewardAmount} REWARD
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                1
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    SHARE YOUR LINK
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    अपना referral link दोस्तो के साथ share करे।
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                2
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    EARN ₹{rewardAmount} INSTANT
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    हर सफल registration पर आपको ₹{rewardAmount} का instant reward मिलेगा।
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                3
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    DIRECT WALLET CREDIT
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    आपका reward amount सीधे आपके wallet मे add कर दिया जायेगा जिसे आप withdraw कर सकते है।
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowReferralLink(true)}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium uppercase text-[12px] tracking-wider transition-all duration-300 active:scale-95 shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
                    >
                        GET REFERRAL LINK ❯
                    </button>
                </div>

                {/* Card 2: Daily Tasks */}
                <div 
                    onClick={() => navigate('/user/earn')}
                    className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-5 transition-all hover:shadow-2xl cursor-pointer"
                >
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#ECFDF5] text-[#10B981]">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-[18px] font-medium text-slate-800 leading-none tracking-tight flex items-center gap-1.5 font-poppins italic">
                                Daily Tasks
                            </h3>
                            <p className="text-[10px] font-medium uppercase tracking-wider mt-1.5 text-[#10B981]">
                                COLLECT REWARD COINS
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#ECFDF5] text-[#059669]">
                                1
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    COMPLETE TASKS
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    रोजाना simple tasks को पूरा करे और reward coins earn करे।
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#ECFDF5] text-[#059669]">
                                2
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    REDEEM FOR CASH
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    इन coins को आप बाद मे real cash मे convert kar sakte hain !
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#ECFDF5] text-[#059669]">
                                3
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    3X BOOSTER BENEFIT
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    Booster active karke aap apni coin earnings ko 3X tak badha sakte hain !
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/user/earn'); }}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium uppercase text-[12px] tracking-wider transition-all duration-300 active:scale-95 shadow-md bg-[#059669] hover:bg-[#047857] text-white shadow-emerald-500/10"
                    >
                        VIEW TASKS ❇️
                    </button>
                </div>

                {/* Card 3: Future Fund */}
                <div 
                    onClick={() => navigate('/user/future-fund')}
                    className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-5 transition-all hover:shadow-2xl cursor-pointer"
                >
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#EFF6FF] text-[#3B82F6]">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 className="text-[18px] font-medium text-slate-800 leading-none tracking-tight flex items-center gap-1.5 font-poppins italic">
                                Future Fund
                            </h3>
                            <p className="text-[10px] font-medium uppercase tracking-wider mt-1.5 text-[#3B82F6]">
                                PASSIVE INCOME SECURITY
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                1
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    PLATFORM STAKE
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    एक बार eligible होने पर, आपको platform के profits में हिस्सा मिलेगा।
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                2
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    MONTHLY PAYOUTS
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    Profit share har mahine aapke wallet mein auto-credit hoga !
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                                3
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    LONG TERM GROWTH
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    Jaise-jaise platform grow karega, aapki passive income badhti jayegi.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/user/future-fund'); }}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium uppercase text-[12px] tracking-wider transition-all duration-300 active:scale-95 shadow-md bg-[#034C6A] hover:bg-[#023E56] text-white shadow-[#034C6A]/10"
                    >
                        CHECK ELIGIBILITY 🛡️
                    </button>
                </div>

                {/* Card 4: Events & Contests */}
                <div 
                    onClick={() => navigate('/user/events')}
                    className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-5 transition-all hover:shadow-2xl cursor-pointer"
                >
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#F5F3FF] text-[#8B5CF6]">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <h3 className="text-[18px] font-medium text-slate-800 leading-none tracking-tight flex items-center gap-1.5 font-poppins italic">
                                Events & Contests
                            </h3>
                            <p className="text-[10px] font-medium uppercase tracking-wider mt-1.5 text-[#8B5CF6]">
                                WIN BIG PRIZES
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#F5F3FF] text-[#7C3AED]">
                                1
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    WEEKLY CONTESTS
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    हर हफ्ते नए Exciting Events live होते है, jo limited time ke liye hote hain !
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#F5F3FF] text-[#7C3AED]">
                                2
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    MEGA JACKPOTS
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    Contests mein bhag lekar aap ₹500 tak ka instant cash aur exciting prizes जीत सकते है।
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium bg-[#F5F3FF] text-[#7C3AED]">
                                3
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-[12px] font-medium text-slate-800 uppercase tracking-wide mb-1 leading-none">
                                    LEADERBOARD REWARDS
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                    Top earners ko special bonuses aur verification badges diye jaate hain !
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/user/events'); }}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium uppercase text-[12px] tracking-wider transition-all duration-300 active:scale-95 shadow-md bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-slate-900/10"
                    >
                        VIEW EVENTS 🏆
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Marketing;
