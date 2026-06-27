import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
    ChevronLeft, ChevronDown, Trophy, Users,
    Sparkles, Zap, Coins, Clock, Lightbulb, Rocket, Award, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import UnlockModal from '../components/UnlockModal';
import PaymentModal from '../components/PaymentModal';
import { eventStorage } from '../../shared/services/eventStorage';
import api from '../../shared/services/api';

const Events = () => {
    const { userData, addCoins, addNotification, refreshUserProfile, updateCoinBalance } = useUser();
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [isBoosterExpanded, setIsBoosterExpanded] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [joinedEvents, setJoinedEvents] = useState([]);
    const [toast, setToast] = useState(null);
    const [isRefreshingCoins, setIsRefreshingCoins] = useState(false);
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
        switch (event.tag) {
            case 'Quiz': navigate(`/user/quiz/${id}`); break;
            case 'Draw': navigate(`/user/lucky-draw/${id}`); break;
            case 'Brain': navigate(`/user/memory-master/${id}`); break;
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
                if (res.newCoinBalance !== undefined) {
                    updateCoinBalance(res.newCoinBalance);
                }
                
                // Refresh profile to see updated coins
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

    // Pastel palette styles configuration per event tag
    const getPastelTheme = (tag) => {
        switch (tag) {
            case 'Quiz':
                return {
                    cardBg: 'bg-gradient-to-br from-[#F5F3FF] via-[#FAF9FF] to-[#EEF2FF]', // Soft Lavender-Indigo
                    border: 'border-purple-100/80',
                    tagBadge: 'bg-purple-100/60 text-purple-600 border border-purple-200/40',
                    statsBg: 'bg-white/60 border border-purple-100/40',
                    button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100',
                    accentIcon: <Trophy size={14} className="text-indigo-500" />
                };
            case 'Draw':
                return {
                    cardBg: 'bg-gradient-to-br from-[#FFF1F2] via-[#FFF8F8] to-[#FFF5F5]', // Soft Rose-Pink
                    border: 'border-rose-100/80',
                    tagBadge: 'bg-rose-100/60 text-rose-600 border border-rose-200/40',
                    statsBg: 'bg-white/60 border border-rose-100/40',
                    button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100',
                    accentIcon: <Sparkles size={14} className="text-rose-500" />
                };
            case 'Brain':
                return {
                    cardBg: 'bg-gradient-to-br from-[#ECFDF5] via-[#F9FEFB] to-[#F0FDF4]', // Soft Mint-Emerald
                    border: 'border-emerald-100/80',
                    tagBadge: 'bg-emerald-100/60 text-emerald-700 border border-[#A7F3D0]/40',
                    statsBg: 'bg-white/60 border border-emerald-100/40',
                    button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100',
                    accentIcon: <Lightbulb size={14} className="text-emerald-600" />
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
        <div className="flex flex-col bg-[#F8FAFC] pb-24 font-['Poppins']">
            <UnlockModal isOpen={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
            
            {/* Header — flush to top, no gap */}
            <div className="bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 px-4 pt-3 pb-4 shadow-lg sticky top-0 z-40 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full blur-3xl"></div>
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex flex-col text-left">
                            <h1 className="text-base text-white tracking-tight leading-none">Events</h1>
                            <p className="text-[9px] text-blue-300 opacity-80 uppercase tracking-widest mt-0.5">Win Big Rewards</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleRefreshCoins} disabled={isRefreshingCoins} className="w-7 h-7 flex items-center justify-center bg-white/10 text-white rounded-full border border-white/20 active:scale-95 transition-all">
                            <RefreshCw size={12} className={isRefreshingCoins ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                            <Coins size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-[12px] text-white">{userData.coins.total}</span>
                        </div>
                    </div>
                </div>

                {/* Trophy Banner */}
                <div className="mt-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shrink-0">
                        <Trophy size={18} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <h2 className="text-[12px] text-white leading-none">Join & Win Prizes!</h2>
                        <p className="text-[8px] text-blue-100 opacity-60 mt-0.5">Use coins to participate and earn huge Cash payouts.</p>
                    </div>
                </div>
            </div>

            <div className="p-3 space-y-3 w-full">
                {/* Live badge */}
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Active Live Events</h2>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider border border-emerald-100 animate-pulse">Live</span>
                </div>
                
                {/* Event Cards */}
                <div className="flex flex-col gap-2.5">
                    {eventList.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
                            <Trophy size={28} className="text-slate-200 mx-auto mb-2" />
                            <h3 className="text-[12px] text-slate-600 mb-1">No Live Events</h3>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Check back soon!</p>
                        </div>
                    ) : eventList.map((event) => {
                        const id = event._id?.toString() || event.id?.toString();
                        const isJoined = joinedEvents.includes(id);
                        const isComingSoon = event.status !== 'Active';
                        const theme = getPastelTheme(event.tag);
                        // Ensure fee is always shown as positive
                        const feeDisplay = Math.abs(Number(event.fee) || 0);

                        return (
                            <div
                                key={id}
                                className={`border rounded-2xl overflow-hidden shadow-sm ${theme.cardBg} ${theme.border}`}
                            >
                                {/* Card top: title + join button */}
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
                                            <Coins size={9} className="text-amber-500 fill-amber-500" />
                                            <span className="text-[10px] text-slate-700">{feeDisplay}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2 px-1 border-r border-slate-100/60">
                                        <p className="text-[7px] text-slate-400 uppercase tracking-wide mb-0.5">Prize</p>
                                        <span className="text-[10px] text-emerald-600">{event.prize || '₹500'}</span>
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

                {/* Support Booster */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-amber-400/20 rounded-xl flex items-center justify-center border border-amber-400/20 shrink-0">
                                <Zap size={18} className="text-amber-400 fill-amber-400" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[12px] text-white leading-none mb-0.5">{supportBooster.title}</h4>
                                <p className="text-[8px] text-slate-400">{supportBooster.subtitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsBoosterExpanded(!isBoosterExpanded)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${isBoosterExpanded ? 'bg-amber-400 text-slate-900 rotate-180' : 'bg-white/5 text-white/40 border border-white/10'}`}
                            >
                                <ChevronDown size={14} />
                            </button>
                            <button
                                onClick={() => !(userData.isSupportBoosterActive || userData.isTaskBoosterActive) && handleBuyBooster()}
                                disabled={userData.isSupportBoosterActive || userData.isTaskBoosterActive}
                                className={`px-3 py-2 rounded-lg text-[9px] tracking-widest uppercase shadow-lg active:scale-95 transition-all cursor-pointer ${
                                    (userData.isSupportBoosterActive || userData.isTaskBoosterActive)
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {(userData.isSupportBoosterActive || userData.isTaskBoosterActive) ? '✓ Active' : 'Buy'}
                            </button>
                        </div>
                    </div>

                    {isBoosterExpanded && (
                        <div className="bg-white/5 border-t border-white/5 p-3.5 space-y-2.5 animate-in slide-in-from-top-4 duration-300">
                            {supportBooster.benefits.map((item, i) => {
                                const icons = [<Zap size={13} />, <Lightbulb size={13} />, <Rocket size={13} />, <Award size={13} />];
                                const colors = ["text-amber-400", "text-yellow-400", "text-orange-400", "text-blue-400"];
                                return (
                                    <div key={i} className="flex items-center gap-2.5 text-left">
                                        <div className={`w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center shrink-0 ${colors[i % colors.length]}`}>
                                            {icons[i % icons.length]}
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] text-white leading-tight">Benefit {i + 1}</h4>
                                            <p className="text-[8px] text-slate-400 mt-0.5">{item}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Disclaimer */}
                    <div className="bg-slate-950 p-2 text-center border-t border-slate-800">
                        <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">
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
                amount={supportBooster.price} 
                plan={supportBooster.title} 
                onSuccess={handlePaymentSuccess} 
            />
        </div>
    );
};

export default Events;
