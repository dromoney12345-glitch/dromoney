import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Rocket, ChevronLeft, ArrowRight, ChevronRight,
    Sparkles, MessageSquare,
    Play, TrendingUp, Copy, Users,
    ShieldCheck, Zap, Star,
    Loader2,
    Factory, BarChart3, Lightbulb, PlayCircle, Calculator, Settings,
    ClipboardList, IndianRupee, Award, Headphones, Bell, RefreshCw,
    Wrench, Check, ChevronDown, Info, Lock
} from 'lucide-react';
import api from '../../shared/services/api';
import UniversalVideoPlayer from '../../shared/components/UniversalVideoPlayer';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';

const BusinessIdeas = () => {
    const navigate = useNavigate();
    const { ideaId, section, cardId } = useParams();
    const { userData, refreshUserProfile } = useUser();

    // Support chat / membership plan active — does NOT unlock every idea
    const hasActiveSupport = !!(userData?.supportExpiry && new Date(userData.supportExpiry) > new Date());
    const unlockedIdeaIds = (userData?.unlockedIdeas || []).map(String);
    const isIdeaFree = (idea) => {
        if (!idea) return false;
        if (idea.isPremium !== true) return true;
        return Number(idea.price) <= 0;
    };
    const isIdeaUnlocked = (idea) => {
        if (!idea) return false;
        if (isIdeaFree(idea)) return true;
        if (idea.isLocked === false) return true;
        const id = idea._id ? String(idea._id) : '';
        return !!id && unlockedIdeaIds.includes(id);
    };

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
    const [paymentMode, setPaymentMode] = useState('plan'); // plan | idea | renew
    const [selectedEcoCard, setSelectedEcoCard] = useState(null);
    const [settings, setSettings] = useState({
        businessPlans: [],
        supportChatRenewalAmount: 0,
        supportChatRenewalDays: 90,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [detailType, setDetailType] = useState(null); // 'howItWorks', 'investmentDetails', 'profitDetails'
    const [descExpanded, setDescExpanded] = useState(false);

    const step = getStepFromUrl();

    const PageHeader = ({ title, onBack }) => (
        <div className="px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30 bg-[#FCF8F5]/95 backdrop-blur-sm">
            <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center text-[#462211] active:scale-95 transition-transform shrink-0"
                aria-label="Go back"
            >
                <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">{title}</h1>
        </div>
    );

    const SectionDivider = ({ label }) => (
        <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#EDE4DC]" />
            <span className="text-[11px] font-medium text-[#7A5648] whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px bg-[#EDE4DC]" />
        </div>
    );

    const DEFAULT_PLAN_BENEFITS = [
        { title: 'Daily Support', subtitle: 'Get help from experts every day', iconType: 'support' },
        { title: 'Daily New Updates', subtitle: 'Fresh business tips and strategies', iconType: 'updates' },
        { title: 'Complete Business Calculation', subtitle: 'Cost, profit and break-even clarity', iconType: 'calculator' },
        { title: 'Grow Business Faster', subtitle: 'Scale sales and marketing smartly', iconType: 'growth' },
        { title: 'Machines & Contact Supplier', subtitle: 'Where to buy and whom to contact', iconType: 'tools' },
        { title: 'Explain How to Make Product', subtitle: 'Step-by-step product guidance', iconType: 'product' },
        { title: 'Free Special Meeting', subtitle: 'Join live sessions with mentors', iconType: 'meeting' },
        { title: 'Free Support Chat Box', subtitle: 'Chat with business experts anytime', iconType: 'chat' },
    ];

    const getBenefitIcon = (iconType) => {
        switch (iconType) {
            case 'updates': return RefreshCw;
            case 'calculator': return Calculator;
            case 'growth': return TrendingUp;
            case 'tools': return Wrench;
            case 'product': return Lightbulb;
            case 'meeting': return Users;
            case 'chat': return MessageSquare;
            case 'zap': return Zap;
            case 'shield': return ShieldCheck;
            default: return Headphones;
        }
    };

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
        if (ideas.length > 0) {
            if (ideaId) {
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
            } else {
                // If on intro screen, use the first idea to make content dynamic
                setSelectedIdea(ideas[0]);
            }
        }
    }, [ideaId, cardId, ideas]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/public/settings');
            if (res.success) {
                setSettings({
                    businessPlans: res.data.businessPlans || [],
                    supportChatRenewalAmount: Number(res.data.supportChatRenewalAmount) || 0,
                    supportChatRenewalDays: Number(res.data.supportChatRenewalDays) || 90,
                });
            }
        } catch (err) { console.error('Settings fetch error:', err); }
    };

    /** Renewal price from admin settings, else cheapest membership plan — never hardcoded. */
    const getSupportRenewalQuote = () => {
        const fromSettings = Number(settings.supportChatRenewalAmount) || 0;
        const planPrices = (settings.businessPlans || [])
            .map((p) => Number(p.price))
            .filter((n) => Number.isFinite(n) && n > 0);
        const fromPlans = planPrices.length ? Math.min(...planPrices) : 0;
        const amount = fromSettings > 0 ? fromSettings : fromPlans;
        const days = Number(settings.supportChatRenewalDays) > 0
            ? Number(settings.supportChatRenewalDays)
            : 90;
        return { amount, days };
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

    const BUSINESS_FEATURES = [
        {
            icon: Lightbulb,
            title: 'Business Ideas',
            text: 'Low-investment, high-profit manufacturing business ideas.',
        },
        {
            icon: PlayCircle,
            title: 'Video Support',
            text: 'Understand and start your business with step-by-step video guides.',
        },
        {
            icon: Calculator,
            title: 'Cost & Profit Breakdown',
            text: 'Clear calculations for cost, profit, and break-even.',
        },
        {
            icon: Settings,
            title: 'Machines, Suppliers & Details',
            text: 'Where to buy machines and full supplier information.',
        },
        {
            icon: TrendingUp,
            title: 'Grow Your Business Daily',
            text: 'Daily growth, sales, and marketing guidance.',
        },
    ];

    const IntroScreen = () => {
        const monthly = selectedIdea?.potentialEarnings || '50,000';
        return (
        <div className="flex-1 flex flex-col bg-[#FCF8F5] font-poppins pb-4">
            <h1 className="text-[20px] font-semibold text-[#462211] text-center pt-2 pb-3 tracking-tight">Business</h1>
            <div className="px-3 space-y-2.5">
                <div className="bg-[#F8EEE4] rounded-2xl px-4 py-4 text-center relative overflow-hidden">
                    <Factory size={28} className="absolute left-4 top-5 text-[#462211]" strokeWidth={1.6} />
                    <BarChart3 size={26} className="absolute right-4 top-5 text-[#462211]" strokeWidth={1.6} />
                    <h2 className="text-[28px] font-semibold text-[#462211] tracking-tight leading-none">SHME</h2>
                    <p className="text-[11px] font-medium text-[#462211] mt-1.5 leading-snug px-8">
                        Swadeshi Hyper Local Manufacturing Ecosystem
                    </p>
                    <p className="text-[12px] text-[#462211] mt-3 leading-snug font-medium">
                        Start a <span className="font-semibold">Business</span> earning{' '}
                        <span className="font-semibold">₹{monthly}</span>/month with very low investment
                    </p>
                </div>

                <div className="space-y-2">
                    {BUSINESS_FEATURES.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.title} className="bg-white rounded-2xl px-3 py-2.5 flex items-start gap-3 shadow-[0_2px_10px_rgba(93,46,23,0.04)]">
                                <div className="w-10 h-10 rounded-xl bg-[#F8EDE4] text-[#462211] flex items-center justify-center shrink-0">
                                    <Icon size={18} strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0 pt-0.5">
                                    <p className="text-[13px] font-semibold text-[#3D1E10] leading-tight">{item.title}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-[#F8EEE4] rounded-2xl px-3 py-3 flex items-start gap-2.5">
                    <ShieldCheck size={22} className="text-[#462211] shrink-0 mt-0.5" strokeWidth={1.8} />
                    <p className="text-[11px] text-[#462211] leading-snug">
                        We do not just teach — we help you succeed. Join us to start your own manufacturing business and achieve financial freedom.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/user/business-ideas/all')}
                    className="w-full bg-[#462211] text-white font-semibold text-[14px] py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                    Which Business to Start? <ArrowRight size={16} strokeWidth={2.4} />
                </button>

                <p className="text-center text-[11px] text-slate-400 pb-2">
                    from <span className="font-semibold text-slate-500">Jangu Group</span>
                </p>
            </div>
        </div>
        );
    };

    // --- SCREEN 0: BUSINESS HUB LISTING ---
    const ListingScreen = () => (
        <div className="min-h-screen bg-[#FCF8F5] pb-32 font-poppins">
            <PageHeader title="Business Hub" onBack={() => navigate('/user/business')} />

            <div className="px-4 pb-4">
                <h2 className="text-[18px] font-semibold text-[#462211] leading-tight">Explore Business Ideas</h2>
                <p className="text-[12px] text-[#7A5648] mt-1">Choose a business idea and start your journey</p>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={32} className="text-[#462211] animate-spin" />
                        <p className="text-[11px] font-medium text-[#9A8478]">Loading ideas...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {ideas.map((idea) => {
                            const badge = (idea.badges && idea.badges.length > 0) ? idea.badges[0] : 'Trending';
                            const desc = idea.description || idea.subtitle || idea.desc || 'Start your own business with guided support.';
                            const locked = !isIdeaUnlocked(idea);
                            return (
                                <button
                                    key={idea._id}
                                    type="button"
                                    onClick={() => handleIdeaSelect(idea)}
                                    className="bg-white rounded-2xl p-3 text-left shadow-[0_2px_12px_rgba(70,34,17,0.06)] border border-[#EDE4DC]/60 active:scale-[0.98] transition-transform relative"
                                >
                                    {locked && Number(idea.price) > 0 ? (
                                        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 bg-[#462211] text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                                            <Lock size={8} /> ₹{idea.price}
                                        </span>
                                    ) : !locked && isIdeaFree(idea) ? (
                                        <span className="absolute top-2 right-2 z-10 inline-flex items-center bg-emerald-100 text-emerald-700 text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                                            Free
                                        </span>
                                    ) : !locked ? (
                                        <span className="absolute top-2 right-2 z-10 inline-flex items-center bg-emerald-100 text-emerald-700 text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                                            Unlocked
                                        </span>
                                    ) : null}
                                    <div className="h-[72px] flex items-center justify-center mb-2.5 rounded-xl bg-[#FCF8F5] overflow-hidden">
                                        {idea.bannerImage ? (
                                            <img src={idea.bannerImage} className="w-full h-full object-contain p-1" alt="" />
                                        ) : (
                                            <Rocket size={28} className="text-[#462211]/30" />
                                        )}
                                    </div>
                                    <h3 className="text-[12px] font-semibold text-[#462211] leading-snug line-clamp-2 min-h-[32px]">
                                        {idea.title}
                                    </h3>
                                    <p className="text-[10px] text-[#7A5648] mt-1 leading-snug line-clamp-2 min-h-[28px]">
                                        {desc}
                                    </p>
                                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F3E8E0]">
                                        <span className="inline-flex items-center gap-1 bg-[#FFF5F0] text-[#B85C1E] text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                            <Star size={9} fill="currentColor" /> {badge}
                                        </span>
                                        {locked ? <Lock size={13} className="text-[#9A8478]" /> : <ChevronRight size={14} className="text-[#462211]" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    // --- SCREEN 1: BUSINESS DETAILS ---
    const DetailsScreen = () => {
        const badge = (selectedIdea?.badges && selectedIdea.badges.length > 0)
            ? selectedIdea.badges[0]
            : 'High Profit';
        const summary = selectedIdea?.description || selectedIdea?.subtitle || selectedIdea?.desc
            || 'Start your own business with step-by-step guidance, video support and expert help.';
        const canAccessHub = isIdeaUnlocked(selectedIdea);
        const ideaPrice = Number(selectedIdea?.price) || 0;
        const ideaIsFree = isIdeaFree(selectedIdea);

        const infoRows = [
            {
                key: 'howItWorks',
                title: 'How to Start',
                subtitle: 'Step-by-step process to begin',
                icon: ClipboardList,
                iconBg: 'bg-[#FDF4EA]',
            },
            {
                key: 'investmentDetails',
                title: 'Investment & Cost',
                subtitle: 'Total cost and budget breakdown',
                icon: IndianRupee,
                iconBg: 'bg-[#F8EEE4]',
            },
            {
                key: 'profitDetails',
                title: 'Profit Potential',
                subtitle: 'Earnings and growth outlook',
                icon: TrendingUp,
                iconBg: 'bg-[#EEF7EE]',
                iconColor: 'text-emerald-700',
            },
        ];

        return (
            <div className="min-h-screen bg-[#FCF8F5] pb-40 font-poppins">
                <PageHeader title="Business Details" onBack={() => navigate('/user/business-ideas/all')} />

                <div className="px-4 space-y-4">
                    <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(70,34,17,0.05)] border border-[#EDE4DC]/50">
                        <div className="flex gap-3">
                            <div className="w-[88px] h-[88px] rounded-xl bg-[#FCF8F5] overflow-hidden shrink-0 border border-[#F3E8E0]">
                                {selectedIdea?.bannerImage ? (
                                    <img src={selectedIdea.bannerImage} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Rocket size={28} className="text-[#462211]/30" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[15px] font-semibold text-[#462211] leading-snug">
                                    {selectedIdea?.title || 'Business Idea'}
                                </h2>
                                <span className="inline-flex items-center gap-1 mt-1.5 bg-[#FFF5F0] text-[#B85C1E] text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                    <Star size={9} fill="currentColor" /> {badge}
                                </span>
                                <p className={`text-[11px] text-[#7A5648] mt-2 leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
                                    {summary}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setDescExpanded((v) => !v)}
                                    className="flex items-center gap-0.5 text-[10px] font-medium text-[#462211] mt-1 ml-auto"
                                >
                                    {descExpanded ? 'Less' : 'More'} <ChevronDown size={12} className={`transition-transform ${descExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(70,34,17,0.05)] border border-[#EDE4DC]/50 overflow-hidden divide-y divide-[#F3E8E0]">
                        {infoRows.map((row) => {
                            const Icon = row.icon;
                            return (
                                <button
                                    key={row.key}
                                    type="button"
                                    onClick={() => {
                                        if (!canAccessHub) {
                                            setPaymentMode('idea');
                                            setShowPaymentModal(true);
                                            return;
                                        }
                                        navigate(`/user/business-ideas/${ideaId}/info/${row.key}`);
                                    }}
                                    className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left active:bg-[#FCF8F5] transition-colors"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${row.iconBg} flex items-center justify-center shrink-0`}>
                                        <Icon size={18} className={row.iconColor || 'text-[#462211]'} strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-[#462211]">{row.title}</p>
                                        <p className="text-[10px] text-[#7A5648] mt-0.5">{row.subtitle}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-[#462211] shrink-0" />
                                </button>
                            );
                        })}
                    </div>

                    <div>
                        <h3 className="text-[14px] font-semibold text-[#462211] mb-2.5">Video Support</h3>
                        <div className="bg-[#FDF4EA] rounded-2xl p-3.5 border border-[#EDE4DC]/60">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPlaying(true)}
                                    className="w-11 h-11 rounded-full bg-[#F3E8E0] flex items-center justify-center shrink-0 text-[#462211]"
                                >
                                    <Play size={18} fill="currentColor" className="ml-0.5" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-[#462211]">Watch Guidance Video</p>
                                    <p className="text-[10px] text-[#7A5648] mt-0.5 leading-snug">
                                        Learn how to start this business step by step
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPlaying(true)}
                                    className="shrink-0 bg-[#462211] text-white text-[10px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                                >
                                    <Play size={10} fill="currentColor" /> Watch Now
                                </button>
                            </div>
                            {selectedIdea?.videoUrl && (
                                <div className="mt-3 rounded-xl overflow-hidden bg-black/5">
                                    <UniversalVideoPlayer
                                        url={selectedIdea.videoUrl}
                                        className="w-full aspect-video object-cover"
                                        autoPlay={false}
                                        playing={isPlaying}
                                        controls
                                    />
                                </div>
                            )}
                            <div className="mt-3 h-1 rounded-full bg-[#EDE4DC] overflow-hidden">
                                <div className="h-full w-1/3 bg-[#462211] rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 z-50 bg-[#FCF8F5] px-3 pt-2 pb-4 space-y-2 border-t border-[#EDE4DC]">
                    {canAccessHub || ideaIsFree ? (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate(`/user/business-ideas/${ideaId}/ecosystem`)}
                                className="w-full bg-[#462211] text-white font-semibold text-[14px] py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] shadow-[0_4px_16px_rgba(70,34,17,0.25)]"
                            >
                                Continue to Support Hub <ArrowRight size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/user/business-ideas/${ideaId}/subscription`)}
                                className="w-full bg-white text-[#462211] font-semibold text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] border border-[#EDE4DC]"
                            >
                                Get Premium Support (optional)
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMode('idea');
                                    setShowPaymentModal(true);
                                }}
                                className="w-full bg-[#462211] text-white font-semibold text-[14px] py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] shadow-[0_4px_16px_rgba(70,34,17,0.25)]"
                            >
                                <Lock size={15} /> Unlock this idea · ₹{ideaPrice}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/user/business-ideas/${ideaId}/subscription`)}
                                className="w-full bg-white text-[#462211] font-semibold text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] border border-[#EDE4DC]"
                            >
                                Get Premium Support instead
                            </button>
                        </>
                    )}
                    <p className="text-[9px] text-[#9A8478] text-center flex items-start justify-center gap-1 px-2">
                        <Info size={11} className="shrink-0 mt-0.5" />
                        <span>
                            By continuing, you agree to our{' '}
                            <button type="button" onClick={() => navigate('/user/info/terms')} className="underline text-[#462211]">Terms & Conditions</button>
                            {' '}and{' '}
                            <button type="button" onClick={() => navigate('/user/info/privacy')} className="underline text-[#462211]">Privacy Policy</button>.
                        </span>
                    </p>
                </div>
            </div>
        );
    };

    // --- SCREEN 2: PREMIUM SUPPORT ---
    const SubscriptionScreen = () => {
        const benefits = settings.businessPlans.length > 0
            && settings.businessPlans[selectedPlanIdx]?.benefits?.length > 0
            ? settings.businessPlans[selectedPlanIdx].benefits
            : DEFAULT_PLAN_BENEFITS;

        return (
            <div className="min-h-screen bg-[#FCF8F5] pb-28 font-poppins">
                <PageHeader title="Premium Support" onBack={() => navigate(`/user/business-ideas/${ideaId}`)} />

                <div className="px-4 space-y-4">
                    <div className="bg-[#FFF5F0] rounded-2xl p-4 flex gap-3 border border-[#EDE4DC]/60">
                        <div className="w-11 h-11 rounded-full bg-[#FDF4EA] flex items-center justify-center shrink-0">
                            <Award size={22} className="text-[#462211]" strokeWidth={1.8} />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#462211] leading-snug">
                                You&apos;re not just starting a business, you&apos;re building your future!
                            </h2>
                            <p className="text-[11px] text-[#7A5648] mt-1.5 leading-relaxed">
                                Our premium support gives you the right guidance, tools and strategy to grow faster and smarter.
                            </p>
                        </div>
                    </div>

                    <SectionDivider label="Choose Your Plan" />

                    {settings.businessPlans.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {settings.businessPlans.map((plan, idx) => {
                                const selected = selectedPlanIdx === idx;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedPlanIdx(idx)}
                                        className={`rounded-2xl p-3 text-center transition-all border ${
                                            selected
                                                ? 'bg-[#FDF4EA] border-[#462211] shadow-sm'
                                                : 'bg-white border-[#EDE4DC] text-[#7A5648]'
                                        }`}
                                    >
                                        <p className={`text-[10px] font-medium ${selected ? 'text-[#462211]' : 'text-[#7A5648]'}`}>
                                            {plan.title || `${plan.durationInDays || 30} Days`}
                                        </p>
                                        <p className={`text-[20px] font-bold mt-1 ${selected ? 'text-[#462211]' : 'text-[#462211]/80'}`}>
                                            ₹{plan.price}
                                        </p>
                                        <p className="text-[9px] text-[#9A8478] mt-0.5">
                                            {plan.duration || `${plan.durationInDays || 30} days`}
                                        </p>
                                        <div className="flex justify-center mt-2.5">
                                            {selected ? (
                                                <div className="w-5 h-5 rounded-full bg-[#462211] flex items-center justify-center">
                                                    <Check size={12} className="text-white" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-[#D4C4B8]" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-8 text-center border border-[#EDE4DC]">
                            <Loader2 size={24} className="text-[#462211] animate-spin mx-auto" />
                            <p className="text-[#9A8478] font-medium text-[11px] mt-2">Loading plans...</p>
                        </div>
                    )}

                    {hasActiveSupport && timeRem && (
                        <div className="bg-[#EEF7EE] rounded-xl px-3 py-2.5 border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-medium">Plan active — {timeRem.days} days {timeRem.hours} hrs remaining</p>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2">
                        <ShieldCheck size={14} className="text-[#462211]" />
                        <span className="text-[12px] font-semibold text-[#462211]">What You Will Get</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#EDE4DC]/60 overflow-hidden divide-y divide-[#F3E8E0]">
                        {benefits.map((benefit, i) => {
                            const Icon = getBenefitIcon(benefit.iconType);
                            return (
                                <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#FDF4EA] flex items-center justify-center shrink-0">
                                        <Icon size={16} className="text-[#462211]" strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[12px] font-semibold text-[#462211] leading-tight">{benefit.title}</h4>
                                        {benefit.subtitle && (
                                            <p className="text-[10px] text-[#7A5648] mt-0.5 leading-snug">{benefit.subtitle}</p>
                                        )}
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-[#462211] flex items-center justify-center shrink-0">
                                        <Check size={11} className="text-white" strokeWidth={3} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            // Buying a plan unlocks ONLY this idea — never skip pay when user came for Premium Support
                            if (hasActiveSupport && isIdeaUnlocked(selectedIdea)) {
                                navigate(`/user/business-ideas/${ideaId}/ecosystem`);
                            } else {
                                setPaymentMode('plan');
                                setShowPaymentModal(true);
                            }
                        }}
                        className="w-full bg-[#462211] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] shadow-[0_4px_16px_rgba(70,34,17,0.2)]"
                    >
                        <span>
                            {hasActiveSupport && isIdeaUnlocked(selectedIdea)
                                ? 'Continue to Support Hub'
                                : 'Explore & Pay Now'}
                        </span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    };

    // --- SCREEN 3: MY SUPPORT HUB ---
    const EcosystemScreen = () => {
        useEffect(() => {
            if (!selectedIdea?._id) return;
            // Only paid-premium ideas need unlock; free ideas open hub directly
            if (!isIdeaUnlocked(selectedIdea) && !isIdeaFree(selectedIdea)) {
                navigate(`/user/business-ideas/${ideaId}/subscription`, { replace: true });
            }
        }, [ideaId, selectedIdea, unlockedIdeaIds.join('|')]);

        const cards = selectedIdea?.ecosystemCards || [];
        const hubIcons = [Headphones, Bell, Calculator, Wrench];
        const freeIdea = isIdeaFree(selectedIdea);
        const paidPlanName = userData?.activeBusinessPlan || null;

        if (cards.length === 0 && !loading) {
            return (
                <div className="min-h-screen bg-[#FCF8F5] flex flex-col items-center justify-center p-6 gap-4">
                    <Loader2 size={36} className="text-[#462211] animate-spin" />
                    <p className="text-[#9A8478] font-medium text-[11px] text-center">Loading support content...</p>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#FCF8F5] pb-28 font-poppins relative">
                <PageHeader title="My Support Hub" onBack={() => navigate(`/user/business-ideas/${ideaId}`)} />

                <div className="px-4 space-y-4">
                    <div className="bg-[#FDF4EA] rounded-2xl p-4 flex items-center gap-3 border border-[#EDE4DC]/60">
                        <div className="w-12 h-12 rounded-full bg-[#F3E8E0] flex items-center justify-center shrink-0">
                            <Award size={22} className="text-[#462211]" strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[#7A5648]">Access</p>
                            <p className="text-[15px] font-semibold text-[#462211] leading-tight">
                                {hasActiveSupport
                                    ? (paidPlanName || 'Premium Support')
                                    : freeIdea
                                        ? 'Free Idea Access'
                                        : 'Idea Unlocked'}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[10px] text-[#7A5648]">{hasActiveSupport ? 'Support' : 'Status'}</p>
                            <p className="text-[18px] font-bold text-[#462211]">
                                {hasActiveSupport && timeRem
                                    ? `${timeRem.days}d left`
                                    : freeIdea
                                        ? 'Free'
                                        : (Number(selectedIdea?.price) > 0 ? `₹${selectedIdea.price}` : 'Open')}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-1 bg-emerald-100 text-emerald-700 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                <Check size={9} strokeWidth={3} /> Active
                            </span>
                        </div>
                    </div>

                    <SectionDivider label="Your Support & Benefits" />

                    <div className="space-y-2.5">
                        {cards.map((card, i) => {
                            const Icon = hubIcons[i % hubIcons.length];
                            return (
                                <button
                                    key={card.id || i}
                                    type="button"
                                    onClick={() => navigate(`/user/business-ideas/${ideaId}/ecosystem/${card.id}`)}
                                    className="w-full bg-white rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left shadow-[0_2px_10px_rgba(70,34,17,0.04)] border border-[#EDE4DC]/50 active:scale-[0.99] transition-transform"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[#FDF4EA] flex items-center justify-center shrink-0">
                                        <Icon size={18} className="text-[#462211]" strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-[#462211] leading-tight">{card.title}</p>
                                        <p className="text-[10px] text-[#7A5648] mt-0.5 line-clamp-2">
                                            {card.description?.split('\n')[0] || 'Tap to view full details'}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-[#462211] shrink-0" />
                                </button>
                            );
                        })}
                    </div>

                    {selectedIdea?.meetingLink && (
                        <div className="bg-white rounded-2xl p-4 border border-[#EDE4DC]/50">
                            <h4 className="text-[13px] font-semibold text-[#462211] mb-2">Join Meeting</h4>
                            <div className="bg-[#FCF8F5] border border-[#F3E8E0] rounded-xl p-3 flex items-center justify-between mb-3">
                                <p className="text-[10px] font-medium text-[#7A5648] truncate pr-2">{selectedIdea.meetingLink}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const link = selectedIdea?.meetingLink;
                                        if (!link) return;
                                        navigator.clipboard.writeText(link).then(() => alert('Link copied!')).catch(() => alert('Could not copy'));
                                    }}
                                    className="text-[#462211] active:scale-90 transition-transform shrink-0"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const link = selectedIdea?.meetingLink;
                                    if (link) window.open(link, '_blank', 'noopener,noreferrer');
                                    else alert('Meeting link not available yet.');
                                }}
                                className="w-full bg-[#462211] text-white py-3 rounded-xl font-medium text-[13px] flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <Play size={16} fill="currentColor" /> Join Meeting
                            </button>
                        </div>
                    )}

                    <div className="bg-[#FDF4EA] rounded-2xl p-4 flex items-center gap-3 border border-[#EDE4DC]/60">
                        <div className="w-10 h-10 rounded-xl bg-[#F3E8E0] flex items-center justify-center shrink-0">
                            <MessageSquare size={18} className="text-[#462211]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#462211]">Support Chat Box</p>
                            <p className="text-[10px] text-[#7A5648] mt-0.5">
                                {(() => {
                                    if (hasActiveSupport) return 'Chat with business experts anytime';
                                    const { amount, days } = getSupportRenewalQuote();
                                    if (amount > 0) return `Renew support chat for ₹${amount} / ${days} days`;
                                    return 'Renew support chat (price set by admin)';
                                })()}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (hasActiveSupport) {
                                    navigate('/user/chat-support');
                                } else {
                                    setPaymentMode('renew');
                                    setShowPaymentModal(true);
                                }
                            }}
                            className="shrink-0 bg-[#462211] text-white text-[10px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                        >
                            <MessageSquare size={12} /> {hasActiveSupport ? 'Open Chat' : 'Renew Chat'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- SCREEN 4: ECO CARD DETAIL ---
    const EcoCardDetailScreen = () => {
        useEffect(() => {
            if (!selectedIdea?._id) return;
            if (!isIdeaUnlocked(selectedIdea)) {
                navigate(`/user/business-ideas/${ideaId}`, { replace: true });
            }
        }, [ideaId, selectedIdea, unlockedIdeaIds.join('|')]);
        const card = selectedIdea?.ecosystemCards?.find(c => c.id === cardId);
        const cardIdx = selectedIdea?.ecosystemCards?.findIndex(c => c.id === cardId);
        
        if (!card || cardIdx === undefined || cardIdx === -1) {
            return (
                <div className="min-h-screen bg-[#FCF8F5] flex flex-col items-center justify-center p-6 gap-4">
                    <Loader2 size={36} className="text-[#462211] animate-spin" />
                    <p className="text-[#9A8478] font-medium text-[11px] text-center">Loading details...</p>
                </div>
            );
        }

        const nextCard = selectedIdea?.ecosystemCards?.[(cardIdx + 1) % selectedIdea?.ecosystemCards?.length];

        return (
            <div className="min-h-screen bg-[#FCF8F5] pb-28 font-poppins">
                <PageHeader title={card?.title || 'Details'} onBack={() => navigate(`/user/business-ideas/${ideaId}/ecosystem`)} />

                <div className="px-4">
                    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(70,34,17,0.05)] border border-[#EDE4DC]/50 min-h-[280px]">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#F3E8E0]">
                            <div className="w-9 h-9 bg-[#FDF4EA] text-[#462211] rounded-xl flex items-center justify-center">
                                <Sparkles size={16} />
                            </div>
                            <h3 className="text-[14px] font-semibold text-[#462211]">Full Details</h3>
                        </div>

                        {card?.description ? (
                            <div className="text-[#7A5648] text-[13px] leading-relaxed">
                                {card.description.split('\n').map((line, i) => (
                                    line.trim() ? (
                                        <p key={i} className="mb-3">{line}</p>
                                    ) : <div key={i} className="h-2" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                                <div className="w-12 h-12 bg-[#FDF4EA] rounded-full flex items-center justify-center">
                                    <MessageSquare size={22} className="text-[#462211]" />
                                </div>
                                <p className="font-semibold text-[#462211] text-[12px]">Update in progress</p>
                                <p className="text-[#9A8478] text-[10px] max-w-[200px]">Content will be available soon.</p>
                            </div>
                        )}
                    </div>

                    {nextCard && (
                        <button
                            type="button"
                            onClick={() => {
                                navigate(`/user/business-ideas/${ideaId}/ecosystem/${nextCard.id}`);
                                window.scrollTo(0, 0);
                            }}
                            className="w-full mt-4 bg-[#462211] text-white py-3.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            Next <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // --- SCREEN 5: INFO DETAIL ---
    const InfoDetailScreen = () => {
        const type = cardId;
        const unlocked = isIdeaUnlocked(selectedIdea);
        const content = unlocked ? selectedIdea?.[type] : '';

        const config = {
            howItWorks: { title: 'How to Start', icon: ClipboardList, bg: 'bg-[#FDF4EA]' },
            investmentDetails: { title: 'Investment & Cost', icon: IndianRupee, bg: 'bg-[#F8EEE4]' },
            profitDetails: { title: 'Profit Potential', icon: TrendingUp, bg: 'bg-[#EEF7EE]' },
        };

        const c = config[type] || config.howItWorks;
        const Icon = c.icon;

        if (refreshing && !content) {
            return (
                <div className="min-h-screen bg-[#FCF8F5] flex flex-col items-center justify-center p-6">
                    <Loader2 size={36} className="text-[#462211] animate-spin" />
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#FCF8F5] pb-32 font-poppins">
                <PageHeader title={c.title} onBack={() => navigate(`/user/business-ideas/${ideaId}`)} />

                <div className="px-4">
                    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(70,34,17,0.05)] border border-[#EDE4DC]/50 min-h-[300px]">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#F3E8E0]">
                            <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
                                <Icon size={18} className="text-[#462211]" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-[14px] font-semibold text-[#462211]">Full Details</h3>
                        </div>

                        {content ? (
                            <div className="text-[#7A5648] text-[13px] leading-relaxed">
                                {content.split('\n').map((line, i) => (
                                    line.trim() ? (
                                        <p key={i} className="mb-3">{line}</p>
                                    ) : <div key={i} className="h-2" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                                <div className={`w-12 h-12 ${c.bg} rounded-full flex items-center justify-center`}>
                                    {unlocked ? <MessageSquare size={22} className="text-[#462211]" /> : <Lock size={22} className="text-[#462211]" />}
                                </div>
                                <p className="font-semibold text-[#462211] text-[12px]">{unlocked ? 'Update in progress' : 'Unlock this idea to view details'}</p>
                                <p className="text-[#9A8478] text-[10px] max-w-[200px]">
                                    {unlocked
                                        ? 'Content will be available soon.'
                                        : `Pay ₹${selectedIdea?.price || 0} to enable this business idea only.`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 z-50 bg-[#FCF8F5] px-3 pt-2 pb-4 border-t border-[#EDE4DC]">
                    <button
                        type="button"
                        onClick={() => navigate(`/user/business-ideas/${ideaId}`)}
                        className="w-full bg-[#462211] text-white py-3.5 rounded-xl font-semibold text-[14px] active:scale-[0.99]"
                    >
                        Back to Business Details
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full bg-[#FCF8F5] flex-1 flex flex-col font-poppins relative overflow-x-clip">
            {step === -1 && <IntroScreen />}
            {step === 0 && <ListingScreen />}
            {step === 1 && <DetailsScreen />}
            {step === 2 && <SubscriptionScreen />}
            {step === 3 && <EcosystemScreen />}
            {step === 4 && <EcoCardDetailScreen />}
            {step === 5 && <InfoDetailScreen />}

            {showPaymentModal && paymentMode === 'plan' && settings.businessPlans[selectedPlanIdx] && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    plan={settings.businessPlans[selectedPlanIdx].title}
                    type="BUSINESS_HUB_PLAN"
                    itemId={ideaId}
                    extraData={{
                        planName: settings.businessPlans[selectedPlanIdx].title,
                        planDuration: settings.businessPlans[selectedPlanIdx].duration,
                        durationInDays: settings.businessPlans[selectedPlanIdx].durationInDays || 30
                    }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        refreshUserProfile?.();
                        fetchIdeas();
                        fetchIdeaDetails();
                        if (ideaId) navigate(`/user/business-ideas/${ideaId}/ecosystem`);
                    }}
                />
            )}
            {showPaymentModal && paymentMode === 'idea' && selectedIdea && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    plan={`Unlock: ${selectedIdea.title}`}
                    type="BUSINESS_IDEA_UNLOCK"
                    itemId={selectedIdea._id}
                    extraData={{ planName: `Unlock: ${selectedIdea.title}` }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        refreshUserProfile?.();
                        fetchIdeas();
                        fetchIdeaDetails();
                    }}
                />
            )}
            {showPaymentModal && paymentMode === 'renew' && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    plan={`${getSupportRenewalQuote().days} Days Support Extension`}
                    type="SUPPORT_CHAT_RENEWAL"
                    extraData={{
                        planName: `${getSupportRenewalQuote().days} Days Support Extension`,
                        durationInDays: getSupportRenewalQuote().days
                    }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        refreshUserProfile?.();
                    }}
                />
            )}
        </div>
    );
};

export default BusinessIdeas;
