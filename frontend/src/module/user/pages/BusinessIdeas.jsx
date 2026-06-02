import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Rocket, ChevronLeft, ArrowRight, ChevronRight,
    Sparkles, Briefcase, MessageSquare, Clock,
    Play, TrendingUp, Copy, Users,
    Crown, ShieldCheck, Zap, Star, Video,
    Lock as LockIcon, Loader2
} from 'lucide-react';
import api from '../../shared/services/api';
import UniversalVideoPlayer from '../../shared/components/UniversalVideoPlayer';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';

const BusinessIdeas = () => {
    const navigate = useNavigate();
    const { ideaId, section, cardId } = useParams();
    const { userData } = useUser();

    const isSubscribed = userData?.supportExpiry && new Date(userData.supportExpiry) > new Date();

    // Derive step from URL
    const getStepFromUrl = () => {
        if (!ideaId) return -1;           // Intro
        if (ideaId === 'all') return 0;   // Listing
        if (section === 'ecosystem' && cardId) return 4;
        if (section === 'ecosystem') return 3;
        if (section === 'info' && cardId) return 5;
        if (section === 'subscription') return 2;
        return 1;                         // idea detail
    };

    const [ideas, setIdeas] = useState([]);
    const [selectedIdea, setSelectedIdea] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedEcoCard, setSelectedEcoCard] = useState(null);
    const [settings, setSettings] = useState({ businessPlans: [] });
    const [refreshing, setRefreshing] = useState(false);
    const [detailType, setDetailType] = useState(null); // 'howItWorks', 'investmentDetails', 'profitDetails'

    const step = getStepFromUrl();

    // Fetch single idea details when ideaId is present or step changes
    useEffect(() => {
        if (ideaId && step > 0) {
            fetchIdeaDetails();
        }
    }, [ideaId, step]);

    useEffect(() => {
        fetchIdeas();
        fetchSettings();
    }, []);

    // When ideas load and ideaId is in URL, auto-select the idea
    useEffect(() => {
        if (ideaId && ideas.length > 0) {
            const found = ideas.find(i => i._id === ideaId);
            if (found) {
                setSelectedIdea(found);
                // Restore eco card from cardId if present
                if (cardId && found.ecosystemCards) {
                    const ecoColors = [
                        { color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
                        { color: 'text-indigo-500',  bg: 'bg-indigo-50',  ring: 'ring-indigo-200' },
                        { color: 'text-blue-500',    bg: 'bg-blue-50',    ring: 'ring-blue-200' },
                        { color: 'text-amber-500',   bg: 'bg-amber-50',   ring: 'ring-amber-200' }
                    ];
                    const cardIdx = found.ecosystemCards.findIndex(c => c.id === cardId);
                    if (cardIdx !== -1) {
                        setSelectedEcoCard({ ...found.ecosystemCards[cardIdx], colorStyle: ecoColors[cardIdx % 4] });
                    }
                }
            }
        }
    }, [ideaId, cardId, ideas]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/public/settings');
            if (res.success) setSettings({ businessPlans: res.data.businessPlans || [] });
        } catch (err) { console.error('Settings fetch error:', err); }
    };

    const fetchIdeas = async () => {
        try {
            const res = await api.get('/public/business-ideas');
            if (res.success) {
                setIdeas(res.data);
                // Also update selectedIdea if it's already set to keep it in sync
                if (ideaId) {
                    const found = res.data.find(i => i._id === ideaId);
                    if (found) setSelectedIdea(found);
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchIdeaDetails = async () => {
        if (!ideaId) return;
        setRefreshing(true);
        try {
            const res = await api.get(`/public/business-ideas/${ideaId}`);
            if (res.success) {
                setSelectedIdea(res.data);
            }
        } catch (err) { console.error('Fetch detail error:', err); }
        finally { setRefreshing(false); }
    };

    const handleIdeaSelect = (idea) => {
        setSelectedIdea(idea);
        setIsPlaying(false);
        navigate(`/user/business-ideas/${idea._id}`);
    };

    const getTimeRemaining = (expiryDate) => {
        if (!expiryDate) return null;
        const diff = new Date(expiryDate) - new Date();
        if (diff <= 0) return null;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { days, hours };
    };

    const timeRem = getTimeRemaining(userData?.supportExpiry);

    // --- SCREEN -1: INTRO (Premium Rocket Welcome) ---
    const IntroScreen = () => (
        <div className="flex-1 flex flex-col bg-[#F8FAFF] overflow-hidden select-none pb-20">
            <style>
                {`
                @keyframes boost {
                    0%, 100% { transform: translateY(0) rotate(-45deg); }
                    50% { transform: translateY(-8px) rotate(-45deg); }
                }
                @keyframes puff {
                    0% { transform: scale(0.8) opacity(0); }
                    50% { transform: scale(1.2) opacity(0.5); }
                    100% { transform: scale(1.5) opacity(0); }
                }
                .animate-boost {
                    animation: boost 3s ease-in-out infinite;
                }
                .animate-puff {
                    animation: puff 2s ease-out infinite;
                }
                `}
            </style>

            {/* Sticky Header Row */}
            <div className="bg-white/80 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-slate-100/50 shrink-0">
                <button onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100">
                    <ChevronLeft size={22} />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start pt-12 p-5 overflow-hidden gap-6">
                <div className="w-full max-w-[320px] bg-gradient-to-br from-[#5D38F0] to-[#8643FF] rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-0 mb-2">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-400/20 rounded-full -ml-8 -mb-8 blur-2xl" />

                    <div className="text-center space-y-1 relative z-10">
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                            <Star size={12} className="text-[#FFE03D]" fill="#FFE03D" />
                            <p className="text-[10px] font-medium text-white/70 uppercase tracking-[0.2em]">महीने की कमाई</p>
                            <Star size={12} className="text-[#FFE03D]" fill="#FFE03D" />
                        </div>
                        <p className="text-[28px] font-medium text-white leading-none drop-shadow-md">
                            ₹50k - <span className="text-[#FFE03D]">₹{selectedIdea?.potentialEarnings || '1 Lakh'}</span>
                        </p>
                    </div>

                    <div className="my-3 relative z-10 shrink-0">
                        <div className="absolute inset-0 bg-white/10 blur-[40px] rounded-full scale-125 animate-pulse" />
                        <div className="animate-boost relative">
                            <div className="absolute -bottom-6 -right-6 z-0 flex gap-1">
                                <div className="animate-puff w-4 h-4 bg-white/40 rounded-full blur-sm" style={{ animationDelay: '0s' }} />
                                <div className="animate-puff w-6 h-6 bg-white/20 rounded-full blur-md" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <Rocket size={64} className="text-white drop-shadow-[0_10px_10px_rgba(255,255,255,0.25)] relative z-10" fill="white" fillOpacity={0.2} />
                        </div>
                    </div>

                    <div className="text-center space-y-1.5 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl inline-block">
                            <p className="text-[11px] font-medium text-[#00FF94] leading-tight uppercase tracking-wider">बहुत कम इन्वेस्टमेंट से</p>
                        </div>
                        <p className="text-[9px] font-medium text-white/60 uppercase tracking-[0.2em] mt-1">Start Your Own Brand Today</p>
                    </div>
                </div>

                <button 
                    onClick={() => navigate('/user/business-ideas/all')}
                    className="w-full max-w-[320px] bg-[#5D38F0] hover:bg-[#4C2CD9] text-white font-medium text-[14px] py-4 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest border-b-4 border-indigo-800 shrink-0"
                >
                    LET'S START <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );

    // --- SCREEN 0: PREMIUM CARDS LISTING ---
    const ListingScreen = () => (
        <div className="min-h-screen bg-[#F8FAFF] pb-32">
            <div className="bg-white px-5 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] w-full">
                <button onClick={() => navigate('/user/business-ideas')} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-all border border-slate-100 shrink-0">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight leading-none">Business Hub</h1>
                    <p className="text-[10px] font-medium text-[#5D38F0] uppercase tracking-widest mt-1">Explore Opportunities</p>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-12 h-12 border-4 border-[#5D38F0] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Searching Best Ideas...</p>
                    </div>
                ) : (
                    ideas.map((idea) => (
                        <div 
                            key={idea._id}
                            onClick={() => handleIdeaSelect(idea)}
                            className="bg-white rounded-2xl p-2.5 flex items-center gap-3.5 shadow-sm border border-slate-100 group hover:shadow-md transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden"
                        >
                            <div className="w-[72px] h-[72px] bg-indigo-50 rounded-[14px] flex items-center justify-center shrink-0 relative overflow-hidden">
                                {idea.bannerImage ? (
                                    <img src={idea.bannerImage} className="w-full h-full object-cover relative z-10" alt="" />
                                ) : (
                                    <Rocket size={24} className="text-[#5D38F0]/40 -rotate-45 relative z-10" />
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-medium text-white flex items-center gap-1 z-20">
                                    <div className="w-1 h-1 bg-white rounded-full"></div> New
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 py-0.5">
                                <div className="text-[8px] font-semibold text-[#5D38F0] uppercase tracking-widest mb-0.5">
                                    {(idea.badges && idea.badges.length > 0) ? idea.badges[0] : 'Trending Idea'}
                                </div>
                                <h3 className="text-[14px] font-medium text-slate-800 leading-tight truncate mb-1.5">{idea.title}</h3>
                                
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded text-[9px] font-medium text-amber-600">
                                        <Star size={9} fill="currentColor" /> ₹{idea.potentialEarnings || "50k"}+
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
                                        <Clock size={9} /> {idea.duration || "1mo"}
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 text-slate-300 pr-1">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // --- SCREEN 1: START JOURNEY (Business Details) ---
    const DetailsScreen = () => (
        <div className="min-h-screen bg-white pb-40">
            <div className="px-5 pt-8 pb-2 flex items-center justify-between bg-white sticky top-[64px] z-40">
                <button onClick={() => navigate('/user/business-ideas/all')} className="w-9 h-9 flex items-center justify-center text-slate-900 bg-slate-50 rounded-xl active:scale-90 transition-all border border-slate-100">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-base font-medium text-slate-900 uppercase tracking-tight">Start Journey</h1>
                <button className="w-9 h-9 flex items-center justify-center text-slate-400 border border-slate-100 rounded-xl">
                    <span className="font-medium text-xs">?</span>
                </button>
            </div>
            <div className="px-6 py-4 flex items-center justify-center">
                <div className="flex items-center w-full max-w-xs relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                    {[
                        { num: 1, label: 'Idea', active: true },
                        { num: 2, label: 'Upgrade', active: false },
                        { num: 3, label: 'Ecosystem', active: false }
                    ].map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-[10px] transition-all duration-300 ${s.active ? 'bg-[#5D38F0] text-white shadow-md' : 'bg-white border border-slate-100 text-slate-300'}`}>
                                {s.active ? s.num : <LockIcon size={10} className="opacity-60" />}
                            </div>
                            <span className={`text-[7px] font-medium uppercase tracking-widest ${s.active ? 'text-[#5D38F0]' : 'text-slate-300'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="px-6 mt-2">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 shrink-0">
                        {selectedIdea?.bannerImage ? <img src={selectedIdea.bannerImage} className="w-full h-full object-cover" alt="icon" /> : <Rocket size={28} className="text-[#5D38F0]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[19px] font-medium text-[#1E293B] leading-tight truncate uppercase">{selectedIdea?.hindiTitle || "बिजनेस आइडिया"}</h2>
                        <p className="text-[13px] font-medium text-slate-400 truncate uppercase mt-0.5">{selectedIdea?.title}</p>
                        <p className="text-[9px] font-medium text-indigo-500 mt-1 leading-snug uppercase tracking-tight">₹{selectedIdea?.potentialEarnings || "50,000"} Monthly Potential</p>
                    </div>
                </div>
            </div>
            <div className="px-6 mt-8 space-y-4">
                <h3 className="text-base font-medium text-slate-900 uppercase tracking-tight">बिजनेस डिटेल्स</h3>
                <div className="grid grid-cols-3 gap-2">
                    <div 
                        onClick={() => navigate(`/user/business-ideas/${ideaId}/info/howItWorks`)}
                        className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-2"><Sparkles size={18} /></div>
                        <h4 className="text-[9px] font-medium text-slate-900 leading-tight">कैसे करें</h4>
                        <p className="text-[7px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">प्रोसेस समझें</p>
                    </div>
                    <div 
                        onClick={() => navigate(`/user/business-ideas/${ideaId}/info/investmentDetails`)}
                        className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-2"><Briefcase size={18} /></div>
                        <h4 className="text-[9px] font-medium text-slate-900 leading-tight">इन्वेस्टमेंट</h4>
                        <p className="text-[7px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">कुल खर्च</p>
                    </div>
                    <div 
                        onClick={() => navigate(`/user/business-ideas/${ideaId}/info/profitDetails`)}
                        className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-2"><TrendingUp size={18} /></div>
                        <h4 className="text-[9px] font-medium text-slate-900 leading-tight">प्रॉफिट</h4>
                        <p className="text-[7px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">कमाई जानें</p>
                    </div>
                </div>
            </div>
            
            <div className="px-6 mt-8 space-y-3">
                <h3 className="text-base font-medium text-slate-900 uppercase tracking-tight">सपोर्ट वीडियो</h3>
                <div className="relative aspect-video bg-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg border border-slate-100" onClick={() => setIsPlaying(!isPlaying)}>
                    {selectedIdea?.videoUrl ? (
                        <UniversalVideoPlayer 
                            url={selectedIdea.videoUrl} 
                            className="w-full h-full object-cover"
                            autoPlay={false}
                            playing={isPlaying}
                            controls={true}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-800">
                            <Video size={32} className="text-white/20" />
                            <p className="text-white/40 text-[9px] font-medium uppercase tracking-widest">Video Not Available</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mx-6 mt-6 bg-[#EEF2FF] rounded-2xl p-4 flex items-center gap-4 shadow-sm shadow-indigo-100">
                <Sparkles size={20} className="text-[#5D38F0]" fill="currentColor" />
                <p className="text-[11px] font-medium text-[#5D38F0]">यह एक लो इन्वेस्टमेंट हाई प्रॉफिट बिजनेस आइडिया है।</p>
            </div>

            <div className="fixed bottom-24 left-6 right-6 z-50 max-w-sm mx-auto">
                <button 
                    onClick={() => navigate(`/user/business-ideas/${ideaId}/subscription`)} 
                    className="w-full bg-[#5D38F0] hover:bg-[#4C2CD9] text-white font-medium py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest border border-white/20"
                >
                    Next <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    // --- SCREEN 2: SUBSCRIPTION ---
    const SubscriptionScreen = () => (
        <div className="min-h-screen bg-[#F8FAFF] pb-40">
            <div className="px-6 pt-4 pb-4 flex items-center justify-between sticky top-[64px] z-40 bg-[#F8FAFF]/80 backdrop-blur-md">
                <button onClick={() => navigate(`/user/business-ideas/${ideaId}`)} className="w-10 h-10 flex items-center justify-center text-slate-900 bg-white rounded-xl shadow-sm"><ChevronLeft size={24} /></button>
                <h1 className="text-lg font-medium text-slate-900">Unlock Premium</h1>
                <div className="w-10" />
            </div>

            {settings.businessPlans.length > 1 && (
                <div className="px-6 mt-4 overflow-x-auto flex gap-3 pb-2" style={{ scrollbarWidth: 'none' }}>
                    {settings.businessPlans.map((plan, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedPlanIdx(idx)}
                            className={`shrink-0 px-6 py-3 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all ${selectedPlanIdx === idx ? 'bg-[#5D38F0] text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            {plan.title.split(' ')[0]} {plan.durationInDays ? `${plan.durationInDays} Days` : plan.duration.replace('/ ', '')}
                        </button>
                    ))}
                </div>
            )}

            <div className="px-6 mt-8">
                {settings.businessPlans.length > 0 ? (
                    <div className="bg-gradient-to-br from-[#5D38F0] to-[#8643FF] rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <Crown size={32} className="text-[#FFE03D] mb-6" fill="#FFE03D" fillOpacity={0.4} />
                        <h2 className="text-3xl font-medium mb-2">{settings.businessPlans[selectedPlanIdx]?.title}</h2>
                        <p className="text-white/80 font-medium text-sm">{settings.businessPlans[selectedPlanIdx]?.subtitle}</p>
                        <div className="mt-8 flex items-baseline gap-2">
                            <span className="text-4xl font-medium">₹{settings.businessPlans[selectedPlanIdx]?.price}</span>
                            <span className="text-white/60 font-medium text-sm">
                                {settings.businessPlans[selectedPlanIdx]?.durationInDays ? `(${settings.businessPlans[selectedPlanIdx].durationInDays} Days)` : settings.businessPlans[selectedPlanIdx]?.duration}
                            </span>
                        </div>

                        {isSubscribed && timeRem && (
                            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] font-medium uppercase tracking-widest text-white/70 mb-1">Plan Active Until</p>
                                <p className="text-lg font-medium text-white">
                                    {timeRem.days} Days {timeRem.hours} Hours <span className="text-[10px] font-medium text-white/50 lowercase ml-1">remaining</span>
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-indigo-50 rounded-[3rem] p-12 text-center">
                        <p className="text-indigo-400 font-medium text-xs uppercase tracking-widest">Loading Premium Plans...</p>
                    </div>
                )}
            </div>

            <div className="px-6 mt-10 space-y-4">
                <h3 className="text-lg font-medium text-slate-900 ml-2">Premium Benefits</h3>
                {settings.businessPlans.length > 0 && (settings.businessPlans[selectedPlanIdx]?.benefits?.length > 0 ? settings.businessPlans[selectedPlanIdx].benefits : [
                    { title: '24/7 Expert Support', subtitle: 'Premium Benefit unlocked', iconType: 'support', colorType: 'emerald' },
                    { title: 'Weekly Live Meetings', subtitle: 'Premium Benefit unlocked', iconType: 'meeting', colorType: 'indigo' },
                    { title: 'Daily Strategies', subtitle: 'Premium Benefit unlocked', iconType: 'zap', colorType: 'amber' }
                ]).map((benefit, i) => {
                    const Icon = benefit.iconType === 'meeting' ? Users :
                                 benefit.iconType === 'zap' ? Zap :
                                 benefit.iconType === 'shield' ? ShieldCheck : MessageSquare;
                    const colorClasses = benefit.colorType === 'indigo' ? 'text-indigo-500 bg-indigo-50' :
                                         benefit.colorType === 'amber' ? 'text-amber-500 bg-amber-50' :
                                         benefit.colorType === 'rose' ? 'text-rose-500 bg-rose-50' :
                                         'text-emerald-500 bg-emerald-50';
                    return (
                        <div key={i} className="bg-white rounded-3xl p-5 flex items-start gap-4 border border-slate-50 shadow-sm">
                            <div className={`w-12 h-12 ${colorClasses} rounded-2xl flex items-center justify-center shrink-0`}>
                                <Icon size={22} />
                            </div>
                            <div>
                                <h4 className="text-[14px] font-medium text-slate-900 leading-tight">{benefit.title}</h4>
                                <p className="text-[10px] font-medium text-slate-400 mt-1">{benefit.subtitle}</p>
                            </div>
                            <ShieldCheck size={18} className="ml-auto text-emerald-500" />
                        </div>
                    );
                })}
            </div>
            <div className="fixed bottom-24 left-6 right-6 z-50 max-w-sm mx-auto">
                <button 
                    onClick={() => {
                        if (isSubscribed) {
                            navigate(`/user/business-ideas/${ideaId}/ecosystem`);
                        } else {
                            setShowPaymentModal(true);
                        }
                    }} 
                    className="w-full bg-[#5D38F0] hover:bg-[#4C2CD9] text-white font-medium py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest border border-white/20"
                >
                    {isSubscribed ? 'Continue to Ecosystem' : 'Unlock Journey'} <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    // --- SCREEN 3: ECOSYSTEM ---
    const EcosystemScreen = () => {
        // Redirection Guard: If not subscribed, go to subscription
        useEffect(() => {
            if (!isSubscribed) {
                navigate(`/user/business-ideas/${ideaId}/subscription`, { replace: true });
            }
        }, [isSubscribed, ideaId]);

        const ecoColors = [
            { color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-400', grad: 'from-emerald-50 to-white' },
            { color: 'text-[#5D38F0]',  bg: 'bg-indigo-50',  ring: 'ring-indigo-400', grad: 'from-indigo-50 to-white' },
            { color: 'text-blue-500',    bg: 'bg-blue-50',    ring: 'ring-blue-400', grad: 'from-blue-50 to-white' },
            { color: 'text-amber-500',   bg: 'bg-amber-50',   ring: 'ring-amber-400', grad: 'from-amber-50 to-white' }
        ];
        const cards = selectedIdea?.ecosystemCards || [];

        if (cards.length === 0 && !loading) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
                    <Loader2 size={40} className="text-[#5D38F0] animate-spin" />
                    <p className="text-slate-400 font-medium text-xs uppercase tracking-widest text-center">Loading Ecosystem Content...</p>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#F8FAFF] pb-40">
                <style>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }
                    .animate-float {
                        animation: float 4s ease-in-out infinite;
                    }
                `}</style>
                <div className="px-6 pt-4 pb-4 flex items-center justify-between bg-[#F8FAFF]/90 backdrop-blur-md sticky top-[64px] z-40">
                    <button onClick={() => navigate(`/user/business-ideas/${ideaId}/subscription`)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-100 active:scale-90 transition-all"><ChevronLeft size={24} /></button>
                    <h1 className="text-lg font-medium text-slate-900 tracking-tight">Premium Hub</h1>
                    <div className="w-10" />
                </div>

                {/* Progress Stepper */}
                <div className="px-6 py-6 flex items-center justify-center">
                    <div className="flex items-center w-full max-w-xs relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200/50 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#5D38F0] -translate-y-1/2"></div>
                        { [
                            { num: 1, label: 'Idea', active: true },
                            { num: 2, label: 'Upgrade', active: true },
                            { num: 3, label: 'Ecosystem', active: true }
                        ].map((s, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-300 ${s.active ? 'bg-[#5D38F0] text-white shadow-lg ring-4 ring-indigo-100' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                                    {s.active ? s.num : <LockIcon size={12} />}
                                </div>
                                <span className={`text-[8px] font-medium uppercase tracking-widest ${s.active ? 'text-[#5D38F0]' : 'text-slate-300'}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-6 mt-8">
                    <div className="flex items-center gap-3 mb-1">
                        <Sparkles size={18} className="text-[#5D38F0]" />
                        <h2 className="text-2xl font-medium text-slate-900 tracking-tight">Strategy Ecosystem</h2>
                    </div>
                    <p className="text-[12px] font-medium text-slate-400">Unlock your business potential with these steps</p>
                </div>

                <div className="px-6 mt-6 grid grid-cols-2 gap-4">
                    {cards.map((card, i) => {
                        const c = ecoColors[i % ecoColors.length];
                        const getIcon = (idx) => {
                            switch(idx) {
                                case 0: return <TrendingUp size={18} />;
                                case 1: return <Zap size={18} />;
                                case 2: return <Briefcase size={18} />;
                                case 3: return <Crown size={18} />;
                                default: return <Sparkles size={18} />;
                            }
                        };

                        return (
                            <div
                                key={card.id || i}
                                onClick={() => { navigate(`/user/business-ideas/${ideaId}/ecosystem/${card.id}`); }}
                                className={`group relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer active:scale-95`}
                            >
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
                                            <span className={`${c.color}`}>{getIcon(i)}</span>
                                        </div>
                                        <span className={`text-[9px] font-medium text-slate-200 uppercase`}>0{i+1}</span>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-medium text-slate-800 leading-tight mb-2 group-hover:text-[#5D38F0] transition-colors line-clamp-2 uppercase">
                                            {card.title}
                                        </h4>
                                    </div>

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                        <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">Details</span>
                                        <div className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center ${c.color} group-hover:bg-[#5D38F0] group-hover:text-white transition-all`}>
                                            <ArrowRight size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mx-6 mt-8 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">मीटिंग जॉइन करें</h4>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between mb-4">
                        <p className="text-[10px] font-medium text-slate-500 truncate">{selectedIdea?.meetingLink || "Link not set"}</p>
                        <button 
                            onClick={() => {
                                const link = selectedIdea?.meetingLink;
                                if (!link) return;
                                try {
                                    navigator.clipboard.writeText(link).then(() => {
                                        alert('Link copied!');
                                    }).catch(() => {
                                        // Fallback for older browsers/http
                                        const el = document.createElement('textarea');
                                        el.value = link;
                                        document.body.appendChild(el);
                                        el.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(el);
                                        alert('Link copied!');
                                    });
                                } catch(e) {
                                    alert('Could not copy: ' + link);
                                }
                            }}
                            className="text-indigo-600 hover:text-indigo-800 active:scale-90 transition-all"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                    <button 
                        onClick={() => {
                            const link = selectedIdea?.meetingLink;
                            if (link) {
                                window.open(link, '_blank', 'noopener,noreferrer');
                            } else {
                                alert('Meeting link not available yet.');
                            }
                        }}
                        className="w-full bg-[#5D38F0] text-white py-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                        <Play size={16} fill="currentColor" /> जॉइन मीटिंग
                    </button>
                </div>
                <div className="mx-6 mt-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">सपोर्ट चैट</h4>
                    <p className="text-[10px] font-medium text-slate-400 mb-4">किसी भी समस्या के लिए हमसे चैट करें।</p>
                    <button onClick={() => navigate('/user/chat-support')} className="bg-white border border-indigo-100 text-[#5D38F0] px-6 py-2 rounded-xl font-medium text-[11px] flex items-center gap-2 hover:bg-indigo-50 transition-all"><MessageSquare size={14} /> चैट शुरू करें</button>
                </div>
            </div>
        );
    };

    // --- SCREEN 4: ECO CARD DETAIL ---
    const EcoCardDetailScreen = () => {
        const card = selectedIdea?.ecosystemCards?.find(c => c.id === cardId);
        const cardIdx = selectedIdea?.ecosystemCards?.findIndex(c => c.id === cardId);
        
        if (!card || cardIdx === undefined || cardIdx === -1) {
            return (
                <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6 gap-4">
                    <Loader2 size={40} className="text-[#5D38F0] animate-spin" />
                    <p className="text-slate-400 font-medium text-xs uppercase tracking-widest text-center">Loading Strategy Details...</p>
                </div>
            );
        }

        const ecoColors = [
            { color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-400', grad: 'from-emerald-500 to-emerald-400' },
            { color: 'text-[#5D38F0]',  bg: 'bg-indigo-50',  ring: 'ring-indigo-400', grad: 'from-indigo-600 to-[#5D38F0]' },
            { color: 'text-blue-500',    bg: 'bg-blue-50',    ring: 'ring-blue-400', grad: 'from-blue-600 to-blue-400' },
            { color: 'text-amber-500',   bg: 'bg-amber-50',   ring: 'ring-amber-400', grad: 'from-amber-600 to-amber-400' }
        ];
        const c = ecoColors[cardIdx % ecoColors.length] || ecoColors[0];

        const nextCard = selectedIdea?.ecosystemCards?.[(cardIdx + 1) % selectedIdea?.ecosystemCards?.length];

        return (
            <div className="min-h-screen bg-white pb-32">
                {/* Hero Header */}
                <div className={`relative h-64 overflow-hidden rounded-b-[3.5rem] bg-gradient-to-br ${c.grad}`}>
                    <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
                        <button onClick={() => navigate(`/user/business-ideas/${ideaId}/ecosystem`)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20">
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-medium text-white/60 uppercase tracking-widest">Premium Strategy</p>
                            <span className="text-white font-medium text-xs">Phase 0{cardIdx + 1}</span>
                        </div>
                    </div>

                    <div className="absolute bottom-10 left-8 right-8 z-20">
                        <h1 className="text-3xl font-medium text-white leading-tight mb-2">{card?.title}</h1>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-1 bg-white/40 rounded-full"></div>
                            <p className="text-[10px] font-medium text-white/80 uppercase tracking-widest">Premium Strategy</p>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -left-10 top-0 w-32 h-32 bg-black/5 rounded-full blur-2xl"></div>
                </div>

                <div className="px-6 -mt-6 relative z-30">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50 min-h-[400px]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`w-10 h-10 ${c.bg} ${c.color} rounded-xl flex items-center justify-center shadow-inner`}>
                                <Sparkles size={18} />
                            </div>
                            <h3 className="text-sm font-medium text-slate-800">विस्तृत जानकारी</h3>
                        </div>

                        {card?.description ? (
                            <div className="prose prose-sm max-w-none">
                                {card.description.split('\n').map((line, i) => (
                                    line.trim() ? (
                                        <p key={i} className="text-[15px] font-medium text-slate-600 leading-relaxed mb-4">{line}</p>
                                    ) : <div key={i} className="h-4" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                <div className={`w-16 h-16 ${c.bg} rounded-full flex items-center justify-center`}>
                                    <MessageSquare size={30} className={c.color} />
                                </div>
                                <p className="font-medium text-slate-300 text-xs uppercase tracking-widest">Update In Progress</p>
                                <p className="text-slate-400 text-[11px] max-w-[200px]">Admin team is refining this section. Please check back shortly.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Nav Area */}
                <div className="sticky -bottom-4 px-6 z-50 pb-8">
                    <button 
                        onClick={() => {
                            if (nextCard) {
                                navigate(`/user/business-ideas/${ideaId}/ecosystem/${nextCard.id}`);
                                window.scrollTo(0, 0);
                            }
                        }}
                        className="w-full bg-[#1E293B] hover:bg-slate-800 text-white py-5 rounded-[2rem] font-medium text-sm flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(0,0,0,0.3)] active:scale-95 transition-all border border-slate-700"
                    >
                        Next Strategy <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    };

    // --- SCREEN 5: INFO DETAIL (Step 1 Cards) ---
    const InfoDetailScreen = () => {
        const type = cardId; // e.g. howItWorks
        const content = selectedIdea?.[type];

        const config = {
            howItWorks: { title: 'कैसे करें', icon: <Sparkles size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-50', grad: 'from-emerald-600 to-emerald-400' },
            investmentDetails: { title: 'इन्वेस्टमेंट', icon: <Briefcase size={24} />, color: 'text-amber-500', bg: 'bg-amber-50', grad: 'from-amber-600 to-amber-400' },
            profitDetails: { title: 'प्रॉफिट', icon: <TrendingUp size={24} />, color: 'text-indigo-500', bg: 'bg-indigo-50', grad: 'from-indigo-600 to-[#5D38F0]' }
        };

        const c = config[type] || config.howItWorks;

        if (refreshing && !content) {
            return (
                <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                    <Loader2 size={40} className="text-[#5D38F0] animate-spin" />
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-white pb-32">
                {/* Hero Header */}
                <div className={`relative h-64 overflow-hidden rounded-b-[3.5rem] bg-gradient-to-br ${c.grad}`}>
                    <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
                        <button onClick={() => navigate(`/user/business-ideas/${ideaId}`)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20">
                            <ChevronLeft size={24} />
                        </button>
                    </div>

                    <div className="absolute bottom-10 left-8 right-8 z-20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                                {c.icon}
                            </div>
                            <span className="text-white/60 font-medium text-xs uppercase tracking-widest">Business Detail</span>
                        </div>
                        <h1 className="text-3xl font-medium text-white leading-tight">{c.title}</h1>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                <div className="px-6 -mt-6 relative z-30">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50_rgba(0,0,0,0.05)] border border-slate-50 min-h-[400px]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`w-10 h-10 ${c.bg} ${c.color} rounded-xl flex items-center justify-center shadow-inner`}>
                                <Rocket size={18} />
                            </div>
                            <h3 className="text-sm font-medium text-slate-800">विस्तृत जानकारी</h3>
                        </div>

                        {content ? (
                            <div className="prose prose-sm max-w-none">
                                {content.split('\n').map((line, i) => (
                                    line.trim() ? (
                                        <p key={i} className="text-[15px] font-medium text-slate-600 leading-relaxed mb-4">{line}</p>
                                    ) : <div key={i} className="h-4" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                <div className={`w-16 h-16 ${c.bg} rounded-full flex items-center justify-center`}>
                                    <MessageSquare size={30} className={c.color} />
                                </div>
                                <p className="font-medium text-slate-300 text-xs uppercase tracking-widest">Update In Progress</p>
                                <p className="text-slate-400 text-[11px] max-w-[200px]">Admin team is refining this section. Please check back shortly.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Bottom Nav */}
                {/* Bottom Nav Area */}
                <div className="sticky bottom-0 p-6 z-50 bg-white/80 backdrop-blur-md border-t border-slate-50">
                    <button 
                        onClick={() => navigate(`/user/business-ideas/${ideaId}`)}
                        className="w-full bg-[#1E293B] hover:bg-slate-800 text-white py-5 rounded-[2rem] font-medium text-sm shadow-xl active:scale-95 transition-all"
                    >
                        Got it! Back to Journey
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full bg-[#F8FAFF] flex-1 flex flex-col font-poppins relative overflow-x-clip">
            {step === -1 && <IntroScreen />}
            {step === 0 && <ListingScreen />}
            {step === 1 && <DetailsScreen />}
            {step === 2 && <SubscriptionScreen />}
            {step === 3 && <EcosystemScreen />}
            {step === 4 && <EcoCardDetailScreen />}
            {step === 5 && <InfoDetailScreen />}

            {showPaymentModal && settings.businessPlans[selectedPlanIdx] && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    plan={settings.businessPlans[selectedPlanIdx].title}
                    amount={settings.businessPlans[selectedPlanIdx].price}
                    type="BUSINESS_HUB_PLAN"
                    itemId={ideaId}
                    extraData={{
                        planName: settings.businessPlans[selectedPlanIdx].title,
                        planDuration: settings.businessPlans[selectedPlanIdx].duration,
                        durationInDays: settings.businessPlans[selectedPlanIdx].durationInDays || 30
                    }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        // refreshUserProfile is already called inside PaymentModal
                    }}
                />
            )}
        </div>
    );
};

export default BusinessIdeas;
