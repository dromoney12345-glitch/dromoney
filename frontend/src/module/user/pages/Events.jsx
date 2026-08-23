import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
    ChevronLeft, ChevronDown, Trophy, Users, Gift,
    Sparkles, Zap, IndianRupee, Clock, Lightbulb, Rocket, Award, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import PaymentModal from '../components/PaymentModal';
import { eventStorage } from '../../shared/services/eventStorage';
import api from '../../shared/services/api';

const Events = () => {
    const { userData, addCoins, addNotification, refreshUserProfile } = useUser();
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [isBoosterExpanded, setIsBoosterExpanded] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [joinedEvents, setJoinedEvents] = useState([]);
    const [toast, setToast] = useState(null);
    const [isRefreshingCoins, setIsRefreshingCoins] = useState(false);

    if (!userData?.isPaid) {
        return (
            <div className="min-h-screen bg-[#f8fafc] font-poppins">
                <UnlockModal isOpen={true} onClose={() => navigate('/user/income')} />
            </div>
        );
    }
    const [isJoining, setIsJoining] = useState(false);

    const handleRefreshCoins = async () => {
        setIsRefreshingCoins(true);
        await refreshUserProfile(false);
        
        try {
            // Also refresh events data on click
            const res = await api.get('/public/events');
            if (res.success && res.data && res.data.length > 0) {
                setEventList(res.data);
                if (res.joinedEvents && Array.isArray(res.joinedEvents)) {
                    const joinedIds = res.joinedEvents.map(id => id.toString());
                    setJoinedEvents(joinedIds);
                    localStorage.setItem('dromoney_joined_events', JSON.stringify(joinedIds));
                } else {
                    setJoinedEvents([]);
                }
            } else {
                const allEvents = eventStorage.getEvents();
                setEventList(allEvents.filter(e => e.status === 'Active'));
                const saved = JSON.parse(localStorage.getItem('dromoney_joined_events') || '[]');
                setJoinedEvents(saved);
            }
        } catch (err) {
            console.error("Failed to refresh events:", err);
        }

        setIsRefreshingCoins(false);
    };
    const [eventList, setEventList] = useState([]);
    const [supportBooster, setSupportBooster] = useState({
        title: '₹21 Event Support Kit',
        subtitle: 'Activate Guided Assistance',
        price: 21,
        benefits: [
            "Gain a performance edge with guided assistance",
            "+3 seconds extra time per question",
            "Preview cards for +2 seconds",
            "Exclusive golden ticket visual badge on profile"
        ]
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEventsAndBoosters = async () => {
            try {
                // Fetch Events
                const res = await api.get('/public/events');
                if (res.success && res.data && res.data.length > 0) {
                    setEventList(res.data);
                    if (res.joinedEvents && Array.isArray(res.joinedEvents)) {
                        const joinedIds = res.joinedEvents.map(id => id.toString());
                        setJoinedEvents(joinedIds);
                        localStorage.setItem('dromoney_joined_events', JSON.stringify(joinedIds));
                    } else {
                        setJoinedEvents([]);
                    }
                } else {
                    const allEvents = eventStorage.getEvents();
                    setEventList(allEvents.filter(e => e.status === 'Active'));
                    const saved = JSON.parse(localStorage.getItem('dromoney_joined_events') || '[]');
                    setJoinedEvents(saved);
                }
            } catch (err) {
                console.error("Failed to fetch events:", err);
            }

            try {
                // Fetch Boosters
                const res = await api.get('/public/boosters');
                if (res.success && res.data) {
                    const support = res.data.find(b => b.type === 'support');
                    if (support) {
                        const pricePrefix = `₹${support.price} `;
                        if (!support.title.includes('₹')) {
                            support.title = pricePrefix + support.title;
                        }
                        setSupportBooster(support);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch boosters:", err);
            }
        };

        fetchEventsAndBoosters();
    }, [userData?._id]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBuyBooster = () => {
        setIsPaymentOpen(true);
    };

    const handlePaymentSuccess = () => {
        setIsPaymentOpen(false);
        addNotification("Utility Pass Activated!", `${supportBooster.title} successfully activated for 30 days.`, "success");
        setIsBoosterExpanded(false);
    };

    const navigateToEvent = (event) => {
        const id = event._id || event.id;
        const tag = (event.tag || '').toUpperCase();
        switch (tag) {
            case 'QUIZ': navigate(`/user/quiz/${id}`); break;
            case 'DRAW': navigate(`/user/lucky-draw/${id}`); break;
            case 'BRAIN': navigate(`/user/memory-master/${id}`); break;
            case 'GOLD': navigate(`/user/gold-production/${id}`); break;
            default: break;
        }
    };

    const handleJoinEvent = async (event) => {
        const id = event._id || event.id;

        // Strict double-check: If already joined, just navigate and block any API calls
        if (joinedEvents.includes(id)) {
            navigateToEvent(event);
            return;
        }

        if (isJoining) return;
        setIsJoining(true);

        try {
            const res = await api.post(`/user/data/events/${id}/join`);
            if (res.success) {
                await refreshUserProfile(false);
                
                // Save joined status locally and update state
                const newJoined = [...joinedEvents, id];
                setJoinedEvents(newJoined);
                localStorage.setItem('dromoney_joined_events', JSON.stringify(newJoined));

                showToast(`Successfully joined ${event.title}!`, "success");
                setTimeout(() => navigateToEvent(event), 900);
            } else {
                showToast(res.message || "Failed to join event", "error");
            }
        } catch (err) {
            showToast(err.message || "Something went wrong", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const getPastelTheme = (tag, isMega) => {
        if (isMega) {
            return {
                cardBg: 'bg-gradient-to-br from-[#FFFBEB] via-[#FFF9E6] to-[#FEF3C7]', // Golden theme
                border: 'border-amber-300/60',
                tagBadge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-amber-400 font-bold',
                statsBg: 'bg-white/70 border border-amber-200/40',
                button: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-100 font-bold',
                accentIcon: <Trophy size={14} className="text-amber-500 fill-amber-500" />
            };
        }
        const normalizedTag = (tag || '').toUpperCase();
        switch (normalizedTag) {
            case 'QUIZ':
                return {
                    cardBg: 'bg-gradient-to-br from-[#EEF2FF] via-[#F5F7FF] to-[#E0E7FF]', // Soft Indigo-Blue
                    border: 'border-indigo-100/80',
                    tagBadge: 'bg-indigo-100/60 text-indigo-700 border border-indigo-200/40',
                    statsBg: 'bg-white/60 border border-indigo-100/40',
                    button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100',
                    accentIcon: <Sparkles size={14} className="text-indigo-500" />
                };
            case 'DRAW':
                return {
                    cardBg: 'bg-gradient-to-br from-[#FAF5FF] via-[#FDFBFF] to-[#F3E8FF]', // Soft Lavender-Purple
                    border: 'border-purple-100/80',
                    tagBadge: 'bg-purple-100/60 text-purple-700 border border-purple-200/40',
                    statsBg: 'bg-white/60 border border-purple-100/40',
                    button: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-100',
                    accentIcon: <Gift size={14} className="text-purple-600" />
                };
            case 'BRAIN':
                return {
                    cardBg: 'bg-gradient-to-br from-[#ECFDF5] via-[#F9FEFB] to-[#F0FDF4]', // Soft Mint-Emerald
                    border: 'border-emerald-100/80',
                    tagBadge: 'bg-emerald-100/60 text-emerald-700 border border-[#A7F3D0]/40',
                    statsBg: 'bg-white/60 border border-emerald-100/40',
                    button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100',
                    accentIcon: <Lightbulb size={14} className="text-emerald-600" />
                };
            case 'GOLD':
                return {
                    cardBg: 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A]', // Soft Amber/Gold
                    border: 'border-amber-200/80',
                    tagBadge: 'bg-amber-100/80 text-amber-700 border border-amber-300/50',
                    statsBg: 'bg-white/60 border border-amber-200/40',
                    button: 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-200 font-bold',
                    accentIcon: <IndianRupee size={14} className="text-amber-600" />
                };
            default:
                return {
                    cardBg: 'bg-gradient-to-br from-slate-50 via-white to-slate-100', // Neutral Pastel
                    border: 'border-slate-200/60',
                    tagBadge: 'bg-slate-100 text-slate-600 border border-slate-200/30',
                    statsBg: 'bg-white/60 border border-slate-100',
                    button: 'bg-blue-600 hover:bg-blue-700 text-white',
                    accentIcon: <Sparkles size={14} className="text-blue-500" />
                };
        }
    };

    return (
        <div className="flex flex-col bg-[#FCF8F5] pb-24 font-poppins">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
            
            {/* Header */}
            <div className="bg-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-[#EDE4DC]">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-[#462211] active:scale-95 transition-all cursor-pointer"
                    >
                        <ChevronLeft size={22} strokeWidth={2.2} />
                    </button>
                    <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">Events</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-8 h-8 flex items-center justify-center bg-[#FFF5F0] text-[#9A8478] rounded-lg border border-[#EDE4DC] active:scale-95 transition-all">
                        <RefreshCw size={14} className={isRefreshingCoins ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-1.5 bg-[#FFF5F0] px-3 py-1.5 rounded-lg border border-[#EDE4DC]">
                        <span className="text-[13px] font-semibold text-[#462211]">₹{userData?.wallet?.balance || 0}</span>
                    </div>
                </div>
            </div>

            {/* Trophy Banner */}
            <div className="mx-3 mt-3 bg-[#462211] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#B3591C] rounded-lg flex items-center justify-center shrink-0">
                    <Trophy size={18} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                    <h2 className="text-[12px] text-white font-semibold leading-none">Join & Win Prizes!</h2>
                    <p className="text-[9px] text-white/60 mt-0.5">Participate and earn huge Cash payouts.</p>
                </div>
            </div>

            {/* Eligibility Progress Bar */}
            <div className="px-3 pt-3 w-full">
                <div className="bg-white border border-[#EDE4DC] rounded-2xl p-4 shadow-[0_2px_12px_rgba(70,34,17,0.06)]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] text-[#7A5648] font-bold uppercase tracking-widest">Mega Event Eligibility</span>
                        <span className="text-[10px] font-extrabold text-[#B3591C]">
                            ₹{userData?.megaEligibility?.balance ?? userData?.wallet?.balance ?? 0} Balance
                        </span>
                    </div>
                    <div className="w-full bg-[#F3E8E0] h-2.5 rounded-full overflow-hidden border border-[#EDE4DC]">
                        <div 
                            className="bg-gradient-to-r from-[#B3591C] to-[#D4783A] h-full rounded-full transition-all duration-500" 
                            style={{ width: `${userData?.megaEligibility?.progressPercent ?? 0}%` }}
                        ></div>
                    </div>
                    <p className="text-[8.5px] text-[#7A5648] font-semibold mt-2 leading-tight uppercase tracking-wider">
                        {userData?.megaEligibility?.eligible
                            ? '🎉 Eligible! You have enough balance to enter Sunday Mega Event.' 
                            : `⚠️ Need ₹${userData?.megaEligibility?.remaining ?? 0} more to unlock Sunday Mega Event.`
                        }
                    </p>
                </div>
            </div>

            <div className="p-3 pt-0 space-y-4 w-full">
                {/* Mega Events Section */}
                {(() => {
                    const megaEvents = eventList.filter(e => e.isMega);
                    if (megaEvents.length === 0) return null;
                    return (
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center px-1">
                                <h2 className="text-[10px] text-[#B3591C] font-bold uppercase tracking-[0.2em] flex items-center gap-1">👑 Sunday Mega Event</h2>
                                <span className="bg-[#FFF5F0] text-[#B3591C] px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-[#EDE4DC] animate-pulse">Sunday 8:00 PM</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {megaEvents.map((event) => {
                                    const id = event._id?.toString() || event.id?.toString();
                                    const isJoined = joinedEvents.includes(id);
                                    const isComingSoon = event.status !== 'Active';
                                    const theme = getPastelTheme(event.tag, true);
                                    const feeDisplay = Math.abs(Number(event.fee) || 0);

                                    return (
                                        <div
                                            key={id}
                                            className={`border rounded-2xl overflow-hidden shadow-sm ${theme.cardBg} ${theme.border}`}
                                        >
                                            {/* Card top */}
                                            <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {theme.accentIcon}
                                                    <div className="min-w-0">
                                                        <h3 className="text-[13px] text-slate-800 font-bold leading-tight truncate">{event.title}</h3>
                                                        <span className={`inline-block text-[7px] tracking-widest px-1.5 py-0.5 rounded mt-0.5 uppercase ${theme.tagBadge}`}>
                                                            {event.tag}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isJoined) navigateToEvent(event);
                                                        else handleJoinEvent(event);
                                                    }}
                                                    disabled={(isComingSoon && !isJoined) || isJoining || (!isJoined && (userData?.wallet?.balance || 0) < 500)}
                                                    className={`ml-2 px-3 py-2 rounded-xl text-[9px] tracking-widest uppercase transition-all active:scale-95 shrink-0 cursor-pointer ${
                                                        isJoined
                                                            ? 'bg-emerald-500 text-white'
                                                            : (!isJoined && (userData?.wallet?.balance || 0) < 500)
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                            : isComingSoon
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                            : theme.button
                                                    }`}
                                                >
                                                    {isJoined ? '✓ Joined' : (!isJoined && (userData?.wallet?.balance || 0) < 500) ? 'Locked' : isComingSoon ? 'Soon' : 'Join'}
                                                </button>
                                            </div>

                                            {/* Stats row */}
                                            <div className={`mx-3 mb-3 grid grid-cols-4 gap-0 rounded-xl overflow-hidden border ${theme.statsBg}`}>
                                                <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                    <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Entry</p>
                                                    <div className="flex items-center gap-0.5">
                                                        <span className="text-[10px] text-slate-700">₹{feeDisplay}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                    <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Prize</p>
                                                    <span className="text-[9px] text-emerald-600 font-bold leading-tight text-center px-1 truncate max-w-[55px]">{event.prize || '50% Pool'}</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                    <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Time</p>
                                                    <div className="flex items-center gap-0.5">
                                                        <Clock size={9} className="text-slate-400" />
                                                        <span className="text-[9px] text-slate-500 truncate max-w-[40px]">{event.startTime || 'Live'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center py-2 px-1">
                                                    <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Joined</p>
                                                    <div className="flex items-center gap-0.5">
                                                        <Users size={9} className="text-slate-400" />
                                                        <span className="text-[10px] text-slate-500">{event.participantsCount || event.participants || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Normal Live Events Section */}
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-[10px] text-[#7A5648] uppercase tracking-[0.2em]">Active Live Events</h2>
                        <span className="bg-[#FFF5F0] text-[#B3591C] px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider border border-[#EDE4DC] animate-pulse">Live</span>
                    </div>
                    
                    <div className="flex flex-col gap-2.5">
                        {(() => {
                            const normalEvents = eventList.filter(e => !e.isMega);
                            if (normalEvents.length === 0) {
                                return (
                                    <div className="bg-white border border-[#EDE4DC] rounded-2xl p-8 text-center shadow-[0_2px_12px_rgba(70,34,17,0.06)]">
                                        <Trophy size={28} className="text-[#D4C4B8] mx-auto mb-2" />
                                        <h3 className="text-[12px] text-[#462211] mb-1">No Live Events</h3>
                                        <p className="text-[9px] text-[#7A5648] uppercase tracking-wider">Check back soon!</p>
                                    </div>
                                );
                            }
                            return normalEvents.map((event) => {
                                const id = event._id?.toString() || event.id?.toString();
                                const isJoined = joinedEvents.includes(id);
                                const isComingSoon = event.status !== 'Active';
                                const theme = getPastelTheme(event.tag, false);
                                const feeDisplay = Math.abs(Number(event.fee) || 0);

                                return (
                                    <div
                                        key={id}
                                        className={`border rounded-2xl overflow-hidden shadow-sm ${theme.cardBg} ${theme.border}`}
                                    >
                                        {/* Card top */}
                                        <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {theme.accentIcon}
                                                <div className="min-w-0">
                                                    <h3 className="text-[13px] text-slate-800 leading-tight truncate">{event.title}</h3>
                                                    <span className={`inline-block text-[7px] tracking-widest px-1.5 py-0.5 rounded mt-0.5 uppercase ${theme.tagBadge}`}>
                                                        {event.tag}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isJoined) navigateToEvent(event);
                                                    else handleJoinEvent(event);
                                                }}
                                                disabled={(isComingSoon && !isJoined) || isJoining}
                                                className={`ml-2 px-3 py-2 rounded-xl text-[9px] tracking-widest uppercase transition-all active:scale-95 shrink-0 cursor-pointer ${
                                                    isJoined
                                                        ? 'bg-emerald-500 text-white'
                                                        : isComingSoon
                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        : theme.button
                                                }`}
                                            >
                                                {isJoined ? '✓ Joined' : isComingSoon ? 'Soon' : 'Join'}
                                            </button>
                                        </div>

                                        {/* Stats row */}
                                        <div className={`mx-3 mb-3 grid grid-cols-4 gap-0 rounded-xl overflow-hidden border ${theme.statsBg}`}>
                                            <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Entry</p>
                                                    <div className="flex items-center gap-0.5">
                                                        <span className="text-[10px] text-slate-700">₹{feeDisplay}</span>
                                                    </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Prize</p>
                                                <span className="text-[9px] text-emerald-600 font-bold leading-tight text-center px-1 truncate max-w-[55px]">{event.prize || '50% Pool'}</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                                <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Time</p>
                                                <div className="flex items-center gap-0.5">
                                                    <Clock size={9} className="text-slate-400" />
                                                    <span className="text-[9px] text-slate-500 truncate max-w-[40px]">{event.startTime || 'Live'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center py-2 px-1">
                                                <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Joined</p>
                                                <div className="flex items-center gap-0.5">
                                                    <Users size={9} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-500">{event.participantsCount || event.participants || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Support Booster */}
                <div className="bg-[#462211] border border-[#5a2d1a] rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-[#B3591C]/30 rounded-xl flex items-center justify-center border border-[#B3591C]/30 shrink-0">
                                <Zap size={18} className="text-[#F5C28A] fill-[#F5C28A]" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[12px] text-white leading-none mb-0.5">{supportBooster.title}</h4>
                                <p className="text-[8px] text-white/50">{supportBooster.subtitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsBoosterExpanded(!isBoosterExpanded)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${isBoosterExpanded ? 'bg-[#B3591C] text-white rotate-180' : 'bg-white/10 text-white/40 border border-white/10'}`}
                            >
                                <ChevronDown size={14} />
                            </button>
                            <button
                                onClick={() => !userData.isSupportBoosterActive && handleBuyBooster()}
                                disabled={userData.isSupportBoosterActive}
                                className={`px-3 py-2 rounded-lg text-[9px] tracking-widest uppercase shadow-lg active:scale-95 transition-all cursor-pointer ${
                                    userData.isSupportBoosterActive
                                        ? 'bg-emerald-600/80 text-white cursor-not-allowed'
                                        : 'bg-[#B3591C] hover:bg-[#D4783A] text-white'
                                }`}
                            >
                                {userData.isSupportBoosterActive ? '✓ Active' : 'Buy'}
                            </button>
                        </div>
                    </div>

                    {isBoosterExpanded && (
                        <div className="bg-white/5 border-t border-white/10 p-3.5 space-y-2.5 animate-in slide-in-from-top-4 duration-300">
                            {supportBooster.benefits.map((item, i) => {
                                const icons = [<Zap size={13} />, <Lightbulb size={13} />, <Rocket size={13} />, <Award size={13} />];
                                const colors = ["text-[#F5C28A]", "text-[#D4A574]", "text-[#B3591C]", "text-[#E8A87C]"];
                                return (
                                    <div key={i} className="flex items-center gap-2.5 text-left">
                                        <div className={`w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0 ${colors[i % colors.length]}`}>
                                            {icons[i % icons.length]}
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] text-white leading-tight">Benefit {i + 1}</h4>
                                            <p className="text-[8px] text-white/50 mt-0.5">{item}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="bg-[#3a1a0d] p-2 text-center border-t border-[#5a2d1a]">
                        <p className="text-[8px] text-white/40 font-medium uppercase tracking-widest leading-relaxed">
                            This pass is a utility service intended solely to improve task efficiency and user experience.
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-[85%] max-w-xs p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[100] ${
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-[10px] uppercase tracking-widest">{toast.message}</p>
                </div>
            )}

            <PaymentModal 
                isOpen={isPaymentOpen} 
                onClose={() => setIsPaymentOpen(false)} 
                plan={supportBooster.title} 
                type="SUPPORT_BOOSTER"
                onSuccess={handlePaymentSuccess} 
            />
        </div>
    );
};

export default Events;
