import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    IndianRupee, Coins, Users, CreditCard, ChevronRight, Zap,
    Wallet, Sparkles, Send, Trophy, Gift, Shield, Rocket, CheckCircle2, BarChart2, ClipboardList, ChevronDown, Share2, TrendingUp, Timer,
    Video, X, ArrowUp, RotateCcw, QrCode, Smartphone, Receipt, Building, Clock, Lightbulb, Film, PlusSquare, MoreHorizontal
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import api from '../../shared/services/api';
import UniversalVideoPlayer from '../../shared/components/UniversalVideoPlayer';
import LogoImg from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';
import { messaging, getToken, onMessage } from '../../../services/firebase';

// --- Custom Social Icons for Reliability ---
const FacebookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const InstagramIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16H20L8.267 4z" /><path d="M4 20l6.768-6.768m2.46-2.46L20 4" /></svg>
);

const FALLBACK_BANNERS = [
    {
        _id: '1',
        tag: 'Affiliate Program',
        title: 'Earn ₹200 Per Sale',
        subtitle: 'Share your link & get instant commission on every referral',
        ctaText: 'Invite Now',
        path: '/user/profile',
        gradient: 'from-sky-100 to-sky-200',
        textColor: 'text-sky-900',
        iconName: 'Users',
    },
    {
        _id: '2',
        tag: '12X Booster Active',
        title: 'Multiply Your Coins',
        subtitle: 'Upgrade to Task Booster and earn 12x coins on every task',
        ctaText: 'Upgrade Now',
        path: '/user/profile',
        gradient: 'from-purple-100 to-indigo-100',
        textColor: 'text-indigo-900',
        iconName: 'Zap',
    },
    {
        _id: '3',
        tag: 'Live Contest',
        title: 'Win Up To ₹500',
        subtitle: 'Join the Mega Jackpot Night — limited seats, big rewards!',
        ctaText: 'Join Event',
        path: '/user/events',
        gradient: 'from-blue-100 to-indigo-100',
        textColor: 'text-blue-900',
        iconName: 'Trophy',
    },
];

// Mapping helper for dynamic string icon loading
import * as Icons from 'lucide-react';

const AdBanners = ({ navigate }) => {
    const [active, setActive] = useState(0);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBanners = async () => {
            try {
                const response = await api.get('/public/banners');
                if (response.success && response.data && response.data.length > 0) {
                    setBanners(response.data);
                } else {
                    setBanners(FALLBACK_BANNERS);
                }
            } catch (err) {
                console.error("Banner fetch error", err);
                setBanners(FALLBACK_BANNERS);
            } finally {
                setLoading(false);
            }
        };
        loadBanners();
    }, []);

    useEffect(() => {
        if (banners.length === 0) return;
        const timer = setInterval(() => {
            setActive(prev => (prev + 1) % banners.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (loading || banners.length === 0) {
        return <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>;
    }

    const BANNER_THEMES = [
        { gradient: 'from-blue-600 to-indigo-700', text: 'text-white', dots: 'bg-blue-600' },
        { gradient: 'from-purple-600 to-violet-800', text: 'text-white', dots: 'bg-purple-600' },
        { gradient: 'from-emerald-600 to-teal-800', text: 'text-white', dots: 'bg-emerald-600' },
        { gradient: 'from-rose-500 to-pink-700', text: 'text-white', dots: 'bg-rose-500' },
        { gradient: 'from-amber-500 to-orange-700', text: 'text-white', dots: 'bg-amber-600' },
    ];

    const theme = BANNER_THEMES[active % BANNER_THEMES.length];
    const banner = banners[active];
    const BannerIcon = Icons[banner.iconName] || Icons.Megaphone;

    const handleBannerClick = (e, path) => {
        if (e) e.stopPropagation();
        let targetUrl = path || '/user/events';
        if (targetUrl === '/user/home') {
            targetUrl = '/user/events'; // default to events if path is empty or recursive
        }
        if (targetUrl.startsWith('http')) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
            navigate(targetUrl);
        }
    };

    return (
        <div className="relative">
            <div
                onClick={(e) => handleBannerClick(e, banner.path)}
                className={`cursor-pointer bg-gradient-to-br ${theme.gradient} rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-700 group min-h-[160px] flex flex-col justify-center`}
            >
                {/* Background Glass Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                {/* Background Icon Decor */}
                <div className={`absolute -right-4 -bottom-4 opacity-20 text-white group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 pointer-events-none`}>
                    <BannerIcon size={130} strokeWidth={1} />
                </div>

                <div className={`relative z-10 ${theme.text} font-poppins`}>
                    <span className="text-[9px] uppercase tracking-[0.2em] bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                        {banner.tag}
                    </span>
                    <h2 className="text-2xl tracking-tight mt-3 leading-none drop-shadow-sm">{banner.title}</h2>
                    <p className="text-[12px] text-white/80 mt-2 mb-5 leading-tight max-w-[80%]">{banner.subtitle}</p>
                    <button 
                        onClick={(e) => handleBannerClick(e, banner.path)}
                        type="button"
                        style={{ cursor: 'pointer', zIndex: 50, position: 'relative' }}
                        className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl uppercase text-[10px] tracking-widest shadow-lg shadow-black/20 hover:bg-slate-50 transition-all active:scale-95 w-fit"
                    >
                        <span>{banner.ctaText || 'Get Started'}</span>
                        <ChevronRight size={14} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Dot Indicators */}
            <div className="flex items-center justify-center gap-2 mt-4">
                {banners.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`transition-all duration-500 rounded-full ${i === active ? `w-8 h-1.5 ${theme.dots} shadow-sm` : 'w-1.5 h-1.5 bg-slate-200'}`}
                    />
                ))}
            </div>
        </div>
    );
};


const Home = () => {
    const { userData, addNotification, refreshUserProfile } = useUser();
    const { earnings, coins, referrals, futureFund, isPaid, isSupportBoosterActive, isTaskBoosterActive } = userData || {};
    const navigate = useNavigate();

    // Custom States for Booster Cards
    const [isSupportExpanded, setIsSupportExpanded] = useState(false);
    const [isTaskExpanded, setIsTaskExpanded] = useState(false);
    const [introConfig, setIntroConfig] = useState(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [paymentConfig, setPaymentConfig] = useState({ isOpen: false, plan: '', amount: 0, type: 'PLATFORM_UNLOCK' });
    const [isFcmLoading, setIsFcmLoading] = useState(false);
    
    // Season Countdown Timer Logic
    const [seasonCountdown, setSeasonCountdown] = useState('');

    // Booster Active Countdown Timer
    const [taskBoosterTimeLeft, setTaskBoosterTimeLeft] = useState('');

    useEffect(() => {
        if (!isTaskBoosterActive || !userData?.taskBoosterExpiry) {
            setTaskBoosterTimeLeft('');
            return;
        }

        const updateTimer = () => {
            const expiry = new Date(userData.taskBoosterExpiry).getTime();
            const diff = expiry - Date.now();
            if (diff <= 0) {
                setTaskBoosterTimeLeft('Expired');
                return;
            }

            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff / (1000 * 60)) % 60);
            const secs = Math.floor((diff / 1000) % 60);

            setTaskBoosterTimeLeft(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isTaskBoosterActive, userData?.taskBoosterExpiry]);

    // Weekly Season Reset Animation Hook
    const [showResetAnimation, setShowResetAnimation] = useState(false);

    useEffect(() => {
        const getMostRecentMonday = () => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday.getTime();
        };

        const lastSeen = localStorage.getItem('dromoney_season_reset_seen');
        const recentMonday = getMostRecentMonday();

        if (!lastSeen || Number(lastSeen) < recentMonday) {
            setShowResetAnimation(true);
        }
    }, []);

    const dismissResetAnimation = () => {
        localStorage.setItem('dromoney_season_reset_seen', Date.now().toString());
        setShowResetAnimation(false);
    };

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date();
            const nextSunday = new Date();
            
            // Calculate days to next Sunday
            // 0 is Sunday. If today is Sunday (0), next Sunday is either today (if before 23:59) or next week
            let daysUntilSunday = 7 - now.getDay();
            if (daysUntilSunday === 7) {
                // It's Sunday. Have we passed 23:59? (Practically never, but let's be safe)
                daysUntilSunday = 0;
            }

            nextSunday.setDate(now.getDate() + daysUntilSunday);
            nextSunday.setHours(23, 59, 59, 999);

            const diff = nextSunday - now;
            if (diff <= 0) return '0D 0H 0M';

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);

            return `${days}D ${hours}H ${minutes}M`;
        };

        setSeasonCountdown(calculateTimeRemaining());
        const timer = setInterval(() => {
            setSeasonCountdown(calculateTimeRemaining());
        }, 60000); // update every minute

        return () => clearInterval(timer);
    }, []);

    // FCM Registration & Foreground Handling
    useEffect(() => {
        const registerFCM = async () => {
            try {
                if (!('serviceWorker' in navigator)) return;

                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Explicitly register Service Worker
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                    const token = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (token) {
                        const platformStr = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'web';
                        await api.post('/fcm-tokens/save', { token, platform: platformStr });
                    }
                }
            } catch (err) {
                // Register silently
            }
        };

        registerFCM();

        const unsubscribe = onMessage(messaging, (payload) => {
            // Trigger native browser notification in foreground
            if (Notification.permission === 'granted') {
                new Notification(payload.notification.title, {
                    body: payload.notification.body,
                    icon: '/logo.png'
                });
            }
            addNotification(
                payload.notification.title,
                payload.notification.body,
                'info'
            );
        });

        return () => unsubscribe();
    }, []);

    const triggerTestNotification = async () => {
        setIsFcmLoading(true);
        try {
            await api.post('/fcm-tokens/test');
            window.alert("🚀 Notification Sent Successfully!\n\nIf you don't see it:\n1. Check if Chrome notifications are allowed.\n2. Minimize the browser and try again.");
            addNotification("Success", "Test notification triggered!", "success");
        } catch (err) {
            addNotification("Error", "Could not trigger notification", "error");
        } finally {
            setIsFcmLoading(false);
        }
    };
    const [lifetimePromo, setLifetimePromo] = useState(null);
    const [boosters, setBoosters] = useState({
        support: { title: '₹21 Event Booster', subtitle: 'Guided assistance in events!', price: 21, validity: 'Event Duration', benefits: [] },
        task: { title: '₹49 Power Booster', subtitle: 'Get 12x earning speed!', price: 49, validity: '24 Hours', benefits: [] }
    });
    const [footerPolicies, setFooterPolicies] = useState([
        { label: 'Privacy Policy', path: 'privacy' },
        { label: 'Terms & Conditions', path: 'terms' },
        { label: 'Guidelines', path: 'guidelines' },
        { label: 'No Refund Policy', path: 'refund-policy' }
    ]);

    const fetchHomeData = async () => {
        const keys = ['lifetime_promo', 'menu_privacy', 'menu_terms', 'menu_guidelines', 'menu_refund_policy', 'platform_intro_video'];
        try {
            const res = await api.get(`/public/content/bulk?keys=${keys.join(',')}`);
            if (res.success && res.data) {
                const data = res.data;

                // 1. Lifetime Promo
                if (data['lifetime_promo'] && data['lifetime_promo'].data) {
                    setLifetimePromo(data['lifetime_promo'].data);
                }

                // 2. Intro Video Config
                if (data['platform_intro_video'] && data['platform_intro_video'].data) {
                    setIntroConfig(data['platform_intro_video'].data);
                } else {
                    // Fallback to show it if not set in admin
                    setIntroConfig({
                        isActive: true,
                        title: 'Welcome to Dromoney',
                        subtitle: 'Watch our guide to start earning today!',
                        thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
                        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
                    });
                }

                // 3. Footer Policies
                const policyKeys = ['menu_privacy', 'menu_terms', 'menu_guidelines', 'menu_refund_policy'];
                const policies = policyKeys.map(key => {
                    const item = data[key];
                    const urlPath = key === 'menu_refund_policy' ? 'refund-policy' : key.replace('menu_', '');
                    if (item && item.data) {
                        return {
                            label: item.data.title || item.title,
                            path: urlPath
                        };
                    }
                    // Fallback
                    let label = 'Guidelines';
                    if (key === 'menu_privacy') label = 'Privacy Policy';
                    else if (key === 'menu_terms') label = 'Terms & Conditions';
                    else if (key === 'menu_refund_policy') label = 'No Refund Policy';
                    return { label, path: urlPath };
                });
                setFooterPolicies(policies);
            }
        } catch (err) {
            console.error('Error fetching home bulk data:', err);
        }
    };

    const fetchBoosters = async () => {
        try {
            const res = await api.get('/public/boosters');
            if (res.success && res.data) {
                const results = { ...boosters };
                res.data.forEach(item => {
                    if (item.type === 'support' || item.type === 'task') {
                        // Ensure title has price prefix if missing
                        const pricePrefix = `₹${item.price} `;
                        if (!item.title.includes('₹')) {
                            item.title = pricePrefix + item.title;
                        }
                        results[item.type] = item;
                    }
                });
                setBoosters(results);
            }
        } catch (err) {
            console.error('Error fetching boosters:', err);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchHomeData();
        fetchBoosters();
    }, []);

    const handleBuy = (plan, amount) => {
        if (!isPaid) {
            // Must buy ₹499 first — show the main 499 plan modal
            setPaymentConfig({ isOpen: true, plan: 'Lifetime Access Plan', amount: 499, type: 'PLATFORM_UNLOCK' });
        } else {
            // Calculate price with 4% markup
            const markupPrice = Math.round(amount * 1.04 * 100) / 100;
            const boosterType = plan.toLowerCase().includes('support') ? 'SUPPORT_BOOSTER' : 'TASK_BOOSTER';
            setPaymentConfig({ isOpen: true, plan, amount: markupPrice, type: boosterType });
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referrals.link);
        addNotification("Copied!", "Link copied to clipboard.", "success");
    };

    const handleServiceClick = (service) => {
        const path = service.path;
        const isTargetService = path === '/user/earn' || path === '/user/future-fund' || path === '/user/events';

        if (isTargetService) {
            const kycStr = (userData?.kycStatus || 'Not Started').toLowerCase();
            if (kycStr === 'verified' || kycStr === 'approved') {
                if (!isPaid) {
                    setPaymentConfig({ isOpen: true, plan: 'Lifetime Access Plan', amount: 499, type: 'PLATFORM_UNLOCK' });
                } else {
                    navigate(path);
                }
            } else if (kycStr === 'pending' || kycStr === 'rejected') {
                navigate('/user/auth/pending');
            } else {
                navigate('/user/auth/kyc');
            }
        } else {
            if (path === '/user/marketing') {
                navigate('/user/marketing', { state: { showReferral: false } });
            } else {
                navigate(path);
            }
        }
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-700 min-h-full">
            {/* --- Season Countdown Timer --- */}
            <div className="bg-slate-900 text-white text-center py-2 px-4 flex items-center justify-center gap-2 border-b border-slate-800">
                <Timer size={14} className="text-amber-400" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-300">Season Ends In:</span>
                <span className="text-xs font-semibold tracking-wider text-amber-400">{seasonCountdown}</span>
            </div>

            {/* --- 1. Platform Intro Video Card (Moved to Top) --- */}
            {introConfig && introConfig.isActive && (
                <div
                    onClick={() => setIsVideoPlaying(true)}
                    className="w-full bg-slate-900 rounded-none overflow-hidden shadow-2xl relative group cursor-pointer active:brightness-90 transition-all border border-white/5"
                >
                    <div className="absolute inset-0">
                        <img src={introConfig.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'} className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000" alt="Intro" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    </div>

                    <div className="relative z-10 p-8 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-4 group-hover:scale-110 transition-all shadow-2xl">
                            <Video size={28} className="text-white fill-white/20" />
                        </div>
                        <h3 className="text-xl font-medium text-white tracking-tight uppercase leading-tight max-w-[280px]">
                            {introConfig.title}
                        </h3>
                        <p className="text-[10px] font-medium text-sky-400 uppercase tracking-[0.2em] mt-2">
                            {introConfig.subtitle}
                        </p>
                    </div>
                </div>
            )}

            {/* --- 4. Marketplace & Services (Moved Up) --- */}
            <div className="px-4 pt-2 pb-1">
                <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3 ml-1">Marketplace & Services</h3>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 bg-white rounded-2xl p-5 shadow-xl shadow-slate-200/40 border border-slate-50">
                    {[
                        { icon: Share2, label: 'Refer', color: 'bg-emerald-50 text-emerald-500', path: '/user/marketing' },
                        { icon: ClipboardList, label: 'Task', color: 'bg-amber-50 text-amber-500', path: '/user/earn' },
                        { icon: TrendingUp, label: 'Fund', color: 'bg-blue-50 text-blue-500', path: '/user/future-fund' },
                        { icon: Sparkles, label: 'Events', color: 'bg-purple-50 text-purple-500', path: '/user/events' }
                    ].map((service, i) => (
                        <button
                            key={i}
                            onClick={() => handleServiceClick(service)}
                            className="flex flex-col items-center gap-2 group transition-all"
                        >
                            <div className={`w-12 h-12 ${service.color} rounded-2xl flex items-center justify-center shadow-sm group-hover:-translate-y-1 transition-transform`}>
                                <service.icon size={22} strokeWidth={2.2} />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none">{service.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 2. Promotional Ad Banners --- */}
            <div className="py-2">
                <AdBanners navigate={navigate} />
            </div>

            {/* Main Content Area (With Padding) */}
            <div className="flex flex-col gap-5 p-4 pt-0 pb-4">





                {/* --- 3. Wallet Section --- */}
                <div className="mx-[-12px]">
                    <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3 ml-4">Your Wallet</h3>
                    <div className="bg-gradient-to-br from-teal-800 to-emerald-700 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex justify-between items-start mb-1 relative z-10">
                            <div className="flex items-center gap-2 text-teal-50">
                                <Wallet size={14} />
                                <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Available Balance</span>
                            </div>
                            <div className="w-9 h-9 flex items-center justify-center text-teal-50/80 border border-teal-50/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate('/user/wallet')}>
                                <QrCode size={18} />
                            </div>
                        </div>

                        <h2 className="text-2xl font-medium text-white mb-5 tracking-tight relative z-10">₹ {Number(userData?.wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>

                        <div className="flex justify-around items-center relative z-10">
                            {[
                                { icon: IndianRupee, label: 'Balance', action: () => navigate('/user/income') },
                                { icon: ArrowUp, label: 'Send', action: () => navigate('/user/wallet') },
                                { icon: RotateCcw, label: 'History', action: () => navigate('/user/wallet') },
                            ].map((action, i) => (
                                <div key={i} onClick={action.action} className="flex flex-col items-center gap-1.5 cursor-pointer group/btn w-[72px]">
                                    <div className="w-11 h-11 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-teal-50 transition-all group-hover/btn:bg-white/20">
                                        <action.icon size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[9px] text-teal-100 font-medium uppercase group-hover/btn:text-white transition-colors text-center w-full">{action.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>



                {/* --- 6. Booster Sections --- */}
                <div className="space-y-4">
                    <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-widest ml-4 mb-1">Premium Boosters</h3>
                    {/* Support Booster */}
                    <div className="bg-[#FFFBEB] border border-amber-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="p-4 flex flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-amber-50 shrink-0">
                                    <Coins className="text-amber-500" size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[14px] font-medium text-amber-900 tracking-tight leading-none truncate">{boosters.support.title}</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <p className="text-[9px] font-medium text-amber-600/70 uppercase tracking-tight truncate">{boosters.support.subtitle}</p>
                                        <span className="w-1 h-1 bg-amber-200 rounded-full shrink-0"></span>
                                        <p className="text-[9px] font-medium text-amber-500 uppercase tracking-tight flex items-center gap-0.5 shrink-0">
                                            <Clock size={10} /> {boosters.support.validity || '30 Days'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <button
                                    onClick={() => !isSupportBoosterActive && handleBuy(boosters.support.title, boosters.support.price)}
                                    disabled={isSupportBoosterActive}
                                    className={`${
                                        isSupportBoosterActive
                                            ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed shadow-none border border-emerald-200'
                                            : 'bg-[#10B981] text-white hover:bg-[#059669] shadow-lg shadow-emerald-500/30'
                                    } px-4 py-2 rounded-xl text-[10px] font-medium tracking-tight active:scale-95 transition-all`}
                                >
                                    {isSupportBoosterActive ? '✓ Active' : 'Get Kit'}
                                </button>
                                <button onClick={() => setIsSupportExpanded(!isSupportExpanded)} className="text-amber-500 flex items-center gap-1 active:scale-95 transition-all">
                                    <span className="text-[9px] font-medium uppercase tracking-widest">{isSupportExpanded ? 'Less Info' : 'More Info'}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${isSupportExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {isSupportExpanded && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                <ul className="space-y-1.5 border-t border-amber-100 pt-3">
                                    {(boosters.support.benefits && boosters.support.benefits.length > 0 
                                        ? boosters.support.benefits 
                                        : ['Extra 3 Seconds in Games', 'Guided Assistance in Events', 'Valid for 1 event (auto-expires after use)']
                                    ).map((benefit, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={8} className="text-amber-500" />
                                            </div>
                                            <span className="text-[10px] font-medium text-amber-900/70 uppercase tracking-tight">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>


                    {/* Task Booster */}
                    <div className="bg-sky-50 border border-sky-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="p-4 flex flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-sky-50 shrink-0">
                                    <Zap className="text-sky-500" size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[14px] font-medium text-sky-900 tracking-tight leading-none truncate">{boosters.task.title}</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <p className="text-[9px] font-medium text-sky-600/70 uppercase tracking-tight truncate">{boosters.task.subtitle}</p>
                                        <span className="w-1 h-1 bg-sky-200 rounded-full shrink-0"></span>
                                        <p className="text-[9px] font-medium text-sky-500 uppercase tracking-tight flex items-center gap-0.5 shrink-0">
                                            <Clock size={10} /> {boosters.task.validity || '30 Days'}
                                        </p>
                                    </div>
                                    {isTaskBoosterActive && (
                                        <div className="mt-1.5 flex items-center gap-1 bg-sky-100/80 px-2 py-0.5 rounded-lg border border-sky-200 w-fit">
                                            <span className="text-[8.5px] font-bold text-sky-700 uppercase animate-pulse">
                                                Booster Active! Expires in: {taskBoosterTimeLeft || '24:00:00'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <button
                                    onClick={() => !isTaskBoosterActive && handleBuy(boosters.task.title, boosters.task.price)}
                                    disabled={isTaskBoosterActive}
                                    className={`${
                                        isTaskBoosterActive
                                            ? 'bg-sky-100 text-sky-600 cursor-not-allowed shadow-none border border-sky-200'
                                            : 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                                    } px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-tight active:scale-95 transition-all`}
                                >
                                    {isTaskBoosterActive ? '✓ Active' : 'Get Pass'}
                                </button>
                                <button onClick={() => setIsTaskExpanded(!isTaskExpanded)} className="text-sky-500 flex items-center gap-1 active:scale-95 transition-all">
                                    <span className="text-[9px] font-medium uppercase tracking-widest">{isTaskExpanded ? 'Less Info' : 'More Info'}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${isTaskExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {isTaskExpanded && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                <ul className="space-y-1.5 border-t border-sky-100/50 pt-3">
                                    {(boosters.task.benefits && boosters.task.benefits.length > 0 
                                        ? boosters.task.benefits 
                                        : ['12X Coins on Tasks & Ads', 'Fast Rewards Processing', 'Priority Task Verification']
                                    ).map((benefit, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-sky-100 rounded-full flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={8} className="text-sky-500" />
                                            </div>
                                            <span className="text-[10px] font-medium text-sky-900/70 uppercase tracking-tight">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {/* Disclaimer */}
                    <div className="mt-2 text-center px-4">
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
                            This pass is a utility service intended solely to improve task efficiency and user experience.
                        </p>
                    </div>
                </div>

                {/* --- 7. Lifetime Promo --- */}
                {lifetimePromo && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mx-[-2px]"
                    >
                        <div 
                            onClick={() => setPaymentConfig({ isOpen: true, plan: lifetimePromo.title, amount: 499, type: 'PLATFORM_UNLOCK' })}
                            className="w-full bg-slate-900 rounded-2xl p-5 shadow-2xl relative overflow-hidden border border-white/5 group cursor-pointer active:scale-[0.98] transition-all"
                        >
                            {/* Static Accent Glow for performance/simplicity */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-[60px]"></div>

                            <div className="relative z-10 flex flex-col gap-4">
                                {/* Header */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={12} className="text-sky-400" />
                                        <h3 className="text-[10px] font-medium text-sky-400/80 tracking-[0.2em] uppercase font-poppins not-italic">Exclusive Offer</h3>
                                    </div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight leading-none font-poppins uppercase not-italic">{lifetimePromo.title}</h2>
                                    <div className="h-0.5 w-8 bg-sky-500 rounded-full"></div>
                                </div>

                                {/* Main Pricing / Info */}
                                <div className="space-y-2">
                                    <p className="text-[20px] font-medium text-white tracking-tight not-italic font-poppins leading-none">
                                        {/* eslint-disable-next-line no-control-regex, no-misleading-character-class */}
                                        {lifetimePromo.priceTag?.replace(/[^\x20-\x7E\u0900-\u097F\u20B9]/g, '')}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.1em] not-italic leading-none">
                                        {/* eslint-disable-next-line no-control-regex, no-misleading-character-class */}
                                        {lifetimePromo.note?.replace(/[^\x20-\x7E\u0900-\u097F\u20B9]/g, '')}
                                    </p>
                                </div>

                                {/* Features List - High Density & Compact */}
                                <div className="grid grid-cols-1 gap-3 pt-1">
                                    {lifetimePromo.features.map((text, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                                <CheckCircle2 size={10} className="text-sky-400" />
                                            </div>
                                            <span className="text-[10.5px] font-medium text-slate-300 uppercase tracking-wide leading-none not-italic">{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* --- Full-Width Dark Gradient Global Footer --- */}
            <footer className="w-full bg-gradient-to-br from-[#050b18] via-[#081f1c] to-[#050b18] pt-10 pb-8 border-t border-white/5 relative overflow-hidden">
                {/* World Map Background Overlay */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                    <img
                        src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2000&auto=format&fit=crop"
                        className="w-full h-full object-cover grayscale invert"
                        alt="World Map"
                    />
                </div>

                <div className="px-6 flex flex-col gap-8 relative z-10">
                    {/* Top Section: Brand & Socials */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 flex items-center justify-center overflow-hidden transition-transform active:scale-95 cursor-pointer">
                                    <img src={LogoImg} className="w-full h-full object-contain brightness-0 invert" alt="Dromoney Logo" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-semibold text-white tracking-tight leading-none uppercase not-italic font-poppins">Dromoney</h2>
                                    <p className="text-[9px] font-medium text-emerald-400 uppercase tracking-widest mt-1.5 not-italic font-poppins">Official Affiliate Partner</p>
                                </div>
                            </div>

                        </div>

                        <p className="text-[12px] font-medium text-slate-400 leading-relaxed max-w-[320px] not-italic font-poppins">
                            India's most trusted affiliate and task-based earning platform. Empowering thousands to earn from home with secure connectivity.
                        </p>
                    </div>

                    {/* Middle Section: Quick Links Grid */}
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-medium text-emerald-500/80 uppercase tracking-[0.2em] not-italic font-poppins">Legal Policies</h4>
                            <div className="flex flex-col gap-3">
                                {footerPolicies.filter(p => p.path !== 'guidelines').map((policy, pIdx) => (
                                    <a
                                        key={pIdx}
                                        href={`/user/info/${policy.path}`}
                                        className="text-[11.5px] font-medium text-slate-300 hover:text-white transition-colors uppercase not-italic font-poppins tracking-wide"
                                    >
                                        {policy.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-medium text-emerald-500/80 uppercase tracking-[0.2em] not-italic font-poppins">Organization</h4>
                            <div className="flex flex-col gap-3">
                                {footerPolicies.filter(p => p.path === 'guidelines').map((policy, pIdx) => (
                                    <a
                                        key={pIdx}
                                        href={`/user/info/${policy.path}`}
                                        className="text-[11.5px] font-medium text-slate-300 hover:text-white transition-colors uppercase not-italic font-poppins tracking-wide"
                                    >
                                        Community Guidelines
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Copyright */}
                    <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest not-italic font-poppins">Network Online</span>
                        </div>
                        <div className="flex items-center justify-between w-full opacity-40">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest not-italic font-poppins">© 2026 Dromoney</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest not-italic font-poppins">All Rights Reserved</p>
                        </div>
                    </div>
                </div>
            </footer>


            <PaymentModal
                isOpen={paymentConfig.isOpen}
                onClose={() => setPaymentConfig({ ...paymentConfig, isOpen: false })}
                plan={paymentConfig.plan}
                amount={paymentConfig.amount}
                type={paymentConfig.type}
                onSuccess={async () => {
                    setPaymentConfig({ ...paymentConfig, isOpen: false });
                    await refreshUserProfile();
                    const successMessage = paymentConfig.type.includes('BOOSTER')
                        ? `${paymentConfig.plan} activated successfully!`
                        : "Platform access granted. Welcome!";
                    addNotification("Success!", successMessage, "success");
                }}
            />

            {/* Video Modal Overlay */}
            {isVideoPlaying && introConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <button
                        onClick={() => setIsVideoPlaying(false)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border border-white/10 transition-all z-[110] active:scale-90"
                    >
                        <X size={24} />
                    </button>
                    <div className="w-full max-w-4xl aspect-video rounded-none overflow-hidden shadow-2xl border border-white/5 bg-slate-900">
                        <UniversalVideoPlayer
                            url={introConfig.videoUrl}
                            className="w-full h-full"
                            autoPlay={true}
                        />
                    </div>
                </div>
            )}

            {/* Season Reset Animation Overlay */}
            {showResetAnimation && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-500">
                    {/* Animated Golden Trophy/Stars */}
                    <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50 animate-bounce">
                            <Trophy size={48} className="text-slate-900 fill-amber-100" />
                        </div>
                        <div className="absolute top-0 -right-2 w-4 h-4 bg-sky-400 rounded-full animate-ping"></div>
                        <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-emerald-400 rounded-full animate-ping delay-300"></div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase font-poppins mb-3 animate-pulse">
                        Fresh Start! 🌟
                    </h2>
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-[0.25em] mb-4">
                        Weekly Season Restarted
                    </p>

                    <div className="max-w-[320px] bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
                        <p className="text-xs text-slate-300 leading-relaxed font-poppins">
                            All Coins and Boosters have been automatically reset to <span className="text-amber-400 font-bold">Zero</span> for the new week. 
                            Start completing tasks to climb the new weekly leaderboard!
                        </p>
                    </div>

                    <button
                        onClick={dismissResetAnimation}
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 px-8 py-3.5 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-amber-500/25 active:scale-95 transition-all w-fit"
                    >
                        Start Earning
                    </button>
                </div>
            )}
        </div>
    );
};

export default Home;
