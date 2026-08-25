import React, { useState, useEffect } from 'react';
import {
    Sparkles, Rocket, Plus, Trash2,
    Save, Layout, Palette, Type,
    ChevronRight, ChevronLeft, Info, CheckCircle2,
    Trophy, Users, MousePointer2, FileText, Briefcase, Upload, Compass,
    ArrowUp, ArrowDown, RefreshCw, ShieldCheck, ListChecks,
    UserPlus, CreditCard, TrendingUp, Zap, Building2, Wallet,
    HelpCircle, Flame, Gift, ArrowRight, X, ClipboardList
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { contentStorage } from '../../shared/services/contentStorage';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const ICON_MAP = {
    ShieldCheck, ListChecks, UserPlus, CreditCard, TrendingUp,
    Sparkles, Zap, Trophy, MousePointer2, Building2, Wallet,
    CheckCircle2, HelpCircle, Flame, Gift, Compass
};

const DEFAULT_EXPLORE_GUIDE = {
    badge: 'YOUR GROWTH OUR GUIDANCE',
    title: 'Complete Platform Guide & Growth Steps',
    subtitle: 'Learn how to maximize your daily income, unlock wallets, and build steady earnings with Dromoney.',
    logoUrl: 'https://res.cloudinary.com/dncw1hfix/image/upload/v1776323215/dromoney/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png',
    ctaText: 'Start Earning Now',
    nextRoute: '/user/earn',
    points: [
        {
            title: '🚀 Dromoney कैसे काम करता है?',
            text: '❇️ Dromoney में आपका स्वागत है! Dromoney एक Learning, Part-Time Opportunity, Business Guidance और Support Platform है। यहाँ यूजर नई चीज़ें सीख सकता है, Part-Time Opportunities को समझ सकता है, Business Ideas देख सकता है, SHME Ecosystem के माध्यम से अपना बिज़नेस शुरू करने की जानकारी प्राप्त कर सकता है और Community Activities में भाग ले सकता है。\n\n⚠️ Dromoney किसी भी प्रकार की निश्चित कमाई (Guaranteed Income), निश्चित लाभ (Guaranteed Profit) या व्यवसाय में सफलता की गारंटी नहीं देता। परिणाम प्रत्येक यूजर की मेहनत, कौशल, भागीदारी और परिस्थितियों पर निर्भर करते हैं।',
            icon: 'Sparkles'
        },
        {
            title: '📱 1. Account बनाएं & KYC करें',
            text: 'Dromoney इस्तेमाल करने के लिए सबसे पहले Account बनाना होता है। आप Mobile Number और OTP से Login कर सकते हैं। इसके बाद अपना 1-Step Aadhaar Verification पूरा करके सभी इनकम प्रोजेक्ट्स का फ्री एक्सेस अनलॉक करें।',
            icon: 'ShieldCheck'
        },
        {
            title: '🏠 2. Home Page & Opportunities',
            text: 'Login करने के बाद Home Page दिखाई देता है। यहाँ आपको मिलता है:\n• 🎯 Part-Time Income Modules & Daily Tasks\n• 💼 Business Content & Exclusive Ideas\n• 🚀 Future Fund & Growth Boosters\n• 🎁 Daily Quizzes, Video Watching & Rewards',
            icon: 'ListChecks'
        },
        {
            title: '👥 3. Invite Friends & Referrals',
            text: 'अपना पर्सनल रेफरल लिंक दोस्तों के साथ शेयर करें। जब वे KYC पूरा करते हैं, ₹200 आपके Pending Wallet में जाता है। जब वे Virtual Account बनाते हैं, तब यह Virtual में जाता है। VA न बनाने पर उनका Pending हर 14 दिन (14, 28, 42…) पर clear होता है।',
            icon: 'UserPlus'
        },
        {
            title: '💳 4. Withdrawal & Security',
            text: 'कमाई हुई राशि को आप अपने Bank Account या UPI में आसानी से विड्रॉ कर सकते हैं। Virtual Account बनाकर डायरेक्ट पेआउट्स प्राप्त करें।',
            icon: 'CreditCard'
        }
    ]
};

const MarketingManager = () => {
    const { addNotification } = useAdmin();
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('admin_marketing_active_tab') || 'banners';
        return saved === 'boosters' ? 'banners' : saved;
    });

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        localStorage.setItem('admin_marketing_active_tab', tabId);
    };

    // ── Banners Data ──
    const [banners, setBanners] = useState([]);
    const [loadingBanners, setLoadingBanners] = useState(false);

    const fetchBanners = async () => {
        setLoadingBanners(true);
        try {
            const res = await api.get('/admin/banners');
            if (res.success) setBanners(res.data);
        } catch (err) {
            console.error('Error fetching banners:', err);
        } finally {
            setLoadingBanners(false);
        }
    };

    const handleAddBanner = async () => {
        const dummy = {
            tag: 'Your Growth',
            title: 'Our Guidance',
            subtitle: 'Dromoney is your trusted platform to learn, grow and earn online with smart opportunities.',
            gradient: 'from-amber-400 to-orange-500',
            iconName: 'Sparkles',
            ctaText: 'Explore Now',
            path: '/user/guide/explore-now',
            imageUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=640&q=80',
            isActive: true
        };
        try {
            const res = await api.post('/admin/banners', dummy);
            if (res.success) setBanners([res.data, ...banners]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSyncBanner = async (bannerData) => {
        const { _id, createdAt, __v, ...payload } = bannerData;
        try {
            await api.put(`/admin/banners/${_id}`, payload);
            addNotification("Success", "Banner Sync Successful!", "success");
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to sync banner.", "error");
        }
    };

    const handleDeleteBanner = async (id) => {
        if (!window.confirm("Delete this banner?")) return;
        try {
            await api.delete(`/admin/banners/${id}`);
            setBanners(banners.filter(b => b._id !== id));
            addNotification("Success", "Banner deleted.", "success");
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to delete.", "error");
        }
    };

    // ── Lifetime Access Data (Image 2) ──
    const [lifetime, setLifetime] = useState({
        title: 'Lifetime Access',
        priceTag: '',
        note: '',
        features: []
    });

    const fetchLifetimePromo = async () => {
        try {
            const res = await api.get('/public/content/lifetime_promo');
            if (res.success && res.data && res.data.data) {
                setLifetime(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching lifetime promo:', err);
        }
    };

    const handleDeployLifetimePromo = async () => {
        try {
            const payload = {
                key: 'lifetime_promo',
                title: 'Lifetime Promotion Data',
                data: lifetime
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) addNotification("Success", "Lifetime Promotion Deployed Successfully!", "success");
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to deploy promotion.", "error");
        }
    };

    // ── Info Pages Data (Dynamic CMS) ──
    const [infoPages, setInfoPages] = useState({
        'menu_how_it_works': { title: '', subtitle: '', sections: [] },
        'menu_benefits': { title: '', subtitle: '', sections: [] },
        'menu_support': { title: '', subtitle: '', sections: [] },
        'menu_about': { title: '', subtitle: '', sections: [] },
        'menu_contact': { title: '', subtitle: '', sections: [] }
    });
    const [selectedPage, setSelectedPage] = useState('menu_how_it_works');

    const fetchAllMarketingData = async () => {
        const keys = [
            'menu_how_it_works', 'menu_benefits', 'menu_support', 'menu_about', 'menu_contact',
            'menu_future_features'
        ];
        try {
            const res = await api.get(`/public/content/bulk?keys=${keys.join(',')}`);
            if (res.success && res.data) {
                const results = {};
                const data = res.data;

                // 1. Process Info Pages
                const infoKeys = ['menu_how_it_works', 'menu_benefits', 'menu_support', 'menu_about', 'menu_contact'];
                infoKeys.forEach(key => {
                    const item = data[key];
                    if (item && item.data) {
                        results[key] = {
                            title: item.data.title || item.title,
                            subtitle: item.data.subtitle || item.description,
                            sections: item.data.sections || []
                        };
                    }
                });
                if (Object.keys(results).length > 0) setInfoPages(prev => ({ ...prev, ...results }));

                // Process Future Features
                const fData = data['menu_future_features']?.data;
                if (fData) {
                    if (Array.isArray(fData)) {
                        setFutureFeatures(fData);
                        setFutureFeaturesTitle("Future and Option");
                        setFutureFeaturesSubtitle("Upcoming earning opportunities");
                    } else {
                        setFutureFeatures(fData.sections || []);
                        setFutureFeaturesTitle(fData.title || "Future and Option");
                        setFutureFeaturesSubtitle(fData.subtitle || "Upcoming earning opportunities");
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching bulk marketing data:', err);
        }
    };

    const handleUpdateMarketingKey = async (key, data, label) => {
        try {
            const payload = {
                key: key,
                title: label,
                data: data
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) addNotification("Success", `${label} Updated!`, "success");
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to update.", "error");
        }
    };

    // ── All User Guides List & CMS ──
    const ALL_GUIDES_LIST = [
        { id: 'explore-now', label: 'Explore Now Guide', dbKey: 'explore_now_guide', icon: Compass },
        { id: 'kyc', label: 'How to do KYC?', dbKey: 'guide_kyc', icon: ShieldCheck },
        { id: 'invite', label: 'How to Invite?', dbKey: 'guide_invite', icon: UserPlus },
        { id: 'card', label: 'Create Virtual Account', dbKey: 'guide_card', icon: CreditCard },
        { id: 'withdraw', label: 'How to Withdraw?', dbKey: 'guide_withdraw', icon: Wallet },
        { id: 'earn500', label: 'Earn ₹500 Daily', dbKey: 'guide_earn500', icon: TrendingUp },
        { id: 'fund', label: 'Open Future Fund', dbKey: 'guide_fund', icon: Sparkles },
        { id: 'tasks', label: 'Complete Tasks', dbKey: 'guide_tasks', icon: ListChecks },
        { id: 'daily', label: 'Daily Work & Earn', dbKey: 'guide_daily', icon: ClipboardList },
        { id: 'wallet', label: 'Wallet Guide', dbKey: 'guide_wallet', icon: Wallet },
        { id: 'business', label: 'Start a Business', dbKey: 'guide_business', icon: Building2 },
        { id: 'affiliate-how', label: 'Affiliate How it works', dbKey: 'page_affiliate_how_it_works', icon: Users },
    ];

    const [selectedGuideId, setSelectedGuideId] = useState('explore-now');
    const [exploreGuide, setExploreGuide] = useState(DEFAULT_EXPLORE_GUIDE);
    const [isSavingGuide, setIsSavingGuide] = useState(false);

    const fetchGuideData = async (guideId) => {
        const guideMeta = ALL_GUIDES_LIST.find(g => g.id === guideId) || ALL_GUIDES_LIST[0];
        try {
            const res = await api.get(`/public/content/${guideMeta.dbKey}`);
            if (res && res.success && res.data) {
                const guideContent = res.data.data || res.data;
                const isDummy = guideContent.title === 'Default Title' && guideContent.description === 'Content pending admin setup.';
                if (guideContent && typeof guideContent === 'object' && !isDummy && (guideContent.title || guideContent.content)) {
                    setExploreGuide({
                        badge: guideContent.badge || 'YOUR GROWTH OUR GUIDANCE',
                        title: guideContent.title || guideMeta.label,
                        subtitle: guideContent.subtitle || guideContent.description || '',
                        logoUrl: guideContent.logoUrl || '',
                        ctaText: guideContent.ctaText || 'Start Earning Now',
                        nextRoute: guideContent.nextRoute || guideContent.next || '/user/earn',
                        content: guideContent.content || (Array.isArray(guideContent.points) ? guideContent.points.map(p => typeof p === 'string' ? p : `${p.title}\n${p.text}`).join('\n\n') : ''),
                        points: Array.isArray(guideContent.points) ? guideContent.points : []
                    });
                    return;
                }
            }
        } catch (err) {
            console.error('Error fetching guide:', err);
        }
        // Fallback default
        if (guideId === 'explore-now') {
            setExploreGuide(DEFAULT_EXPLORE_GUIDE);
        } else if (guideId === 'affiliate-how') {
            setExploreGuide({
                badge: 'AFFILIATE CENTER',
                title: 'How it works',
                subtitle: 'Invite, Pending wallet, and 14-day cycle',
                logoUrl: '',
                ctaText: 'Invite Friends',
                nextRoute: '/user/marketing',
                content:
                    'Share your invite link. After your friend completes KYC, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account. If they do not create a Virtual Account, their Pending is cleared every 14 days (14, 28, 42…) until they buy one. After a 6-month Virtual Account expires, the same 14-day Pending cycle runs until they renew. Old Virtual balance is never deleted.',
                points: [],
            });
        } else if (guideId === 'daily') {
            setExploreGuide({
                badge: 'DAILY WORK',
                title: 'Daily Work & Earn',
                subtitle: 'Tasks / offer tasks',
                logoUrl: '',
                ctaText: 'Start Earning Now',
                nextRoute: '/user/earn',
                content:
                    'This Daily Work system replaces the old Events option.\n\nOpen a task, complete it, and earning is credited to the matching wallet.\n\nIf Virtual Account is created and active, earning goes there. Otherwise it goes to Pending.\n\nIf Virtual Account is not created or is expired, Pending is cleared every 14 days (14, 28, 42…) until you create or renew it. Old Virtual balance is never deleted.',
                points: [],
            });
        } else {
            setExploreGuide({
                badge: 'YOUR GROWTH OUR GUIDANCE',
                title: guideMeta.label,
                subtitle: `Learn all steps about ${guideMeta.label}`,
                logoUrl: '',
                ctaText: 'Continue',
                nextRoute: '/user/earn',
                content: `🚀 ${guideMeta.label}\nDetailed guidance and step-by-step instructions for ${guideMeta.label}.`,
                points: []
            });
        }
    };

    const handleSelectGuide = (guideId) => {
        setSelectedGuideId(guideId);
        fetchGuideData(guideId);
    };

    const handleSaveExploreGuide = async () => {
        setIsSavingGuide(true);
        const guideMeta = ALL_GUIDES_LIST.find(g => g.id === selectedGuideId) || ALL_GUIDES_LIST[0];
        try {
            const payload = {
                key: guideMeta.dbKey,
                title: exploreGuide.title || guideMeta.label,
                description: exploreGuide.subtitle || 'User Guide Content',
                data: exploreGuide
            };
            const res = await api.post('/admin/content', payload);
            if (res && res.success) {
                addNotification("Success", `"${guideMeta.label}" Published Successfully!`, "success");
                fetchGuideData(selectedGuideId);
            } else {
                addNotification("Error", res?.message || "Failed to save guide.", "error");
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to save guide.", "error");
        } finally {
            setIsSavingGuide(false);
        }
    };

    const handleLoadDefaultTemplate = () => {
        if (window.confirm("Reset this guide to recommended default template?")) {
            fetchGuideData(selectedGuideId);
            addNotification("Info", "Default template loaded. Click 'Save Guide' to publish.", "info");
        }
    };

    const movePoint = (index, direction) => {
        const points = [...(exploreGuide.points || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= points.length) return;
        const temp = points[index];
        points[index] = points[targetIndex];
        points[targetIndex] = temp;
        setExploreGuide({ ...exploreGuide, points });
    };

    useEffect(() => {
        fetchBanners();
        fetchLifetimePromo();
        fetchAllMarketingData();
        fetchGuideData(selectedGuideId);
    }, []);

    // ── Future Features Data (Image 1 & 2) ──
    const [futureFeatures, setFutureFeatures] = useState([
        { title: 'Dromoney Marketplace', text: 'Buy and sell digital assets directly within our ecosystem using wallet balance.' },
        { title: 'Global Payouts', text: 'Expansion beyond local banking to support international earners through crypto and PayPal.' },
        { title: 'Advanced AI Tools', text: 'Get automated marketing kits generated for your affiliate links for 10x better results.' }
    ]);
    const [futureFeaturesTitle, setFutureFeaturesTitle] = useState("Future and Option");
    const [futureFeaturesSubtitle, setFutureFeaturesSubtitle] = useState("Upcoming earning opportunities");

    return (
        <div className="p-3.5 animate-in fade-in duration-500 bg-slate-50 min-h-screen font-poppins">
            {/* Compact Top Header & Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/70 shadow-xs">
                <div>
                    <h1 className="text-[16px] font-semibold text-slate-900 leading-tight">Marketing & Guides</h1>
                    <p className="text-[11px] text-slate-500">Manage home banner and all user learning guides</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                    {[
                        { id: 'banners', label: 'Home Banners', icon: Layout },
                        { id: 'explore_guide', label: 'User Guides', icon: Compass },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium text-[11.5px] transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                            <tab.icon size={13} /> {tab.label}
                    </button>
                ))}
                </div>
            </div>

            <div className="pb-12">
                {/* ── USER GUIDES CMS ── */}
                {activeTab === 'explore_guide' && (
                    <div className="space-y-3">
                        {/* Compact Guide Selector Bar */}
                        <div className="bg-white rounded-xl border border-slate-200/70 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
                            {ALL_GUIDES_LIST.map((g) => {
                                const Icon = g.icon;
                                const isSelected = selectedGuideId === g.id;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => handleSelectGuide(g.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all ${isSelected ? 'bg-slate-900 text-white font-medium shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-100 font-normal'}`}
                                    >
                                        <Icon size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                                        <span>{g.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                            {/* Editor Side */}
                            <div className="space-y-3">
                                <div className="bg-white rounded-xl border border-slate-200/70 shadow-xs p-4 space-y-3.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
                                                <Compass size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-semibold text-slate-900">
                                                    {ALL_GUIDES_LIST.find(g => g.id === selectedGuideId)?.label || 'Guide Editor'}
                                                </h3>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    Key: {ALL_GUIDES_LIST.find(g => g.id === selectedGuideId)?.dbKey}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isSavingGuide}
                                            onClick={handleSaveExploreGuide}
                                            className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-lg text-[11.5px] font-medium shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Save size={12} /> {isSavingGuide ? 'Saving...' : 'Save Guide'}
                                        </button>
                                    </div>

                                    <div className="space-y-3 text-[11.5px]">
                                        {/* Header Logo & Target Route */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600">Header Logo Image</label>
                                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg p-1">
                                                    {exploreGuide.logoUrl ? (
                                                        <div className="relative shrink-0">
                                                            <img src={exploreGuide.logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded border border-slate-200 bg-white p-0.5" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setExploreGuide({ ...exploreGuide, logoUrl: '' })}
                                                                className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[7px]"
                                                                title="Remove logo"
                                                            >
                                                                <X size={7} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-7 h-7 rounded bg-slate-200/50 flex items-center justify-center text-slate-400 shrink-0">
                                                            <Upload size={11} />
                                                        </div>
                                                    )}
                                                    <input
                                                        value={exploreGuide.logoUrl || ''}
                                                        onChange={(e) => setExploreGuide({ ...exploreGuide, logoUrl: e.target.value })}
                                                        placeholder="Paste image URL..."
                                                        className="w-full bg-transparent text-[11px] text-slate-800 outline-none min-w-0 px-1 font-normal"
                                                    />
                                                    <label className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2 py-1 rounded text-[10px] font-medium cursor-pointer shrink-0 transition-colors shadow-2xs">
                                                        <Upload size={10} /> Upload
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                try {
                                                                    const form = new FormData();
                                                                    form.append('file', file);
                                                                    const res = await api.post('/admin/upload', form, {
                                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                                    });
                                                                    if (res.success && res.url) {
                                                                        setExploreGuide({ ...exploreGuide, logoUrl: res.url });
                                                                        addNotification('Success', 'Logo uploaded successfully!', 'success');
                                                                    }
                                                                } catch {
                                                                    addNotification('Error', 'Upload failed.', 'error');
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600">Button Target Route</label>
                                                <input
                                                    value={exploreGuide.nextRoute || ''}
                                                    onChange={(e) => setExploreGuide({ ...exploreGuide, nextRoute: e.target.value })}
                                                    placeholder="e.g. /user/earn"
                                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11.5px] font-normal text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Top Badge & CTA Button Text */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600">Top Badge Tag</label>
                                                <input
                                                    value={exploreGuide.badge || ''}
                                                    onChange={(e) => setExploreGuide({ ...exploreGuide, badge: e.target.value })}
                                                    placeholder="e.g. YOUR GROWTH OUR GUIDANCE"
                                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11.5px] font-normal text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600">Button Text</label>
                                                <input
                                                    value={exploreGuide.ctaText || ''}
                                                    onChange={(e) => setExploreGuide({ ...exploreGuide, ctaText: e.target.value })}
                                                    placeholder="e.g. Start Earning Now"
                                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11.5px] font-normal text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Main Title & Subtitle */}
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-medium text-slate-600">Guide Title</label>
                                            <input
                                                value={exploreGuide.title || ''}
                                                onChange={(e) => setExploreGuide({ ...exploreGuide, title: e.target.value })}
                                                placeholder="e.g. Complete Platform Guide & Growth Steps"
                                                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-colors"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-medium text-slate-600">Guide Subtitle</label>
                                            <textarea
                                                value={exploreGuide.subtitle || ''}
                                                onChange={(e) => setExploreGuide({ ...exploreGuide, subtitle: e.target.value })}
                                                placeholder="Brief summary of the guide..."
                                                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11.5px] font-normal text-slate-700 h-12 outline-none focus:bg-white focus:border-slate-400 transition-colors resize-none leading-relaxed"
                                            />
                                        </div>

                                        {/* Complete Guide Content */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-medium text-slate-700">Guide Content (Hindi / English)</label>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const hindiTemplate = `🚀 Dromoney कैसे काम करता है?\n❇️ Dromoney में आपका स्वागत है! Dromoney एक Learning, Part-Time Opportunity, Business Guidance और Support Platform है। यहाँ यूजर नई चीज़ें सीख सकता है, Part-Time Opportunities को समझ सकता है, Business Ideas देख सकता है, SHME Ecosystem के माध्यम से अपना बिज़नेस शुरू करने की जानकारी प्राप्त कर सकता है और Community Activities में भाग ले सकता है।\n\n⚠️ Dromoney किसी भी प्रकार की निश्चित कमाई (Guaranteed Income), निश्चित लाभ (Guaranteed Profit) या व्यवसाय में सफलता की गारंटी नहीं देता। परिणाम प्रत्येक यूजर की मेहनत, कौशल, भागीदारी और परिस्थितियों पर निर्भर करते हैं।\n\n📱 1. Account बनाएं & KYC करें\nDromoney इस्तेमाल करने के लिए सबसे पहले Account बनाना होता है। आप Mobile Number और OTP से Login कर सकते हैं। इसके बाद अपना 1-Step Aadhaar Verification पूरा करके सभी इनकम प्रोजेक्ट्स का फ्री एक्सेस अनलॉक करें।\n\n🏠 2. Home Page & Opportunities\nLogin करने के बाद Home Page दिखाई देता है। यहाँ आपको मिलता है:\n• 🎯 Part-Time Income Modules & Daily Tasks\n• 💼 Business Content & Exclusive Ideas\n• 🚀 Future Fund & Growth Boosters\n• 🎁 Daily Quizzes, Video Watching & Rewards\n• 👥 Community Guidelines & Help Desk\n\n👥 3. Invite Friends & Referrals\nअपना पर्सनल रेफरल लिंक दोस्तों के साथ शेयर करें। जब वे KYC पूरा करके विड्रॉल कार्ड बनाते हैं, तो आपके वॉलेट में रेफरल रिवॉर्ड इंसटेंट ऐड हो जाता है।\n\n💼 4. Part-Time Income & Business Guidance\nDromoney Users को अलग-अलग प्रकार की Opportunities को Explore करने का मौका देता है। आप Daily Tasks, Video Watching, Quizzes, Brand Promotion और Refer & Earn के माध्यम से Rewards Earn कर सकते हैं।\n\n💳 5. Withdrawal & Security\nकमाई हुई राशि को आप अपने Bank Account या UPI में आसानी से विड्रॉ कर सकते हैं। लाइफटाइम विड्रॉल कार्ड अनलॉक करके डायरेक्ट पेआउट्स प्राप्त करें। Withdrawal के लिए KYC Verification और Security Protocol का पालन करना अनिवार्य है।`;
                                                            setExploreGuide({ ...exploreGuide, content: hindiTemplate });
                                                        }}
                                                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                                                    >
                                                        🇮🇳 Hindi
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const englishTemplate = `🚀 How Dromoney Works\nWelcome to Dromoney! Dromoney is a comprehensive Learning, Part-Time Opportunity, Business Guidance, and Support Platform. Here you can explore smart part-time earning opportunities, access exclusive business ideas, and participate in community rewards.\n\n⚠️ Disclaimer: Dromoney does not guarantee fixed income or profits. Earnings depend entirely on your effort, skills, and active participation.\n\n📱 1. Create Account & Complete KYC\nGetting started is quick and easy. Sign up using your mobile number and OTP. Complete your simple 1-Step Aadhaar verification to unlock instant access to high-paying income projects.\n\n🏠 2. Explore Home Dashboard\nOnce logged in, explore top earning opportunities:\n• 🎯 Part-Time Income Modules & Daily Tasks\n• 💼 Exclusive Business Ideas & Guidance\n• 🚀 Future Fund Profit Share & Multiplier Boosters\n• 🎁 Daily Quizzes, Video Ads & Extra Rewards\n\n👥 3. Refer Friends & Earn Rewards\nShare your unique referral invite link with friends. When they complete KYC and unlock their withdrawal card, instant referral rewards are credited to your matching wallet.\n\n💳 4. Instant Withdrawals & Security\nWithdraw your verified earnings directly to your UPI ID or Bank Account with 100% transparency and end-to-end encryption.`;
                                                            setExploreGuide({ ...exploreGuide, content: englishTemplate });
                                                        }}
                                                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                                                    >
                                                        🌐 English
                                                    </button>
                                                </div>
                                            </div>

                                            <textarea
                                                value={exploreGuide.content || (exploreGuide.points?.length ? exploreGuide.points.map(p => `${p.title}\n${p.text}`).join('\n\n') : '')}
                                                onChange={(e) => setExploreGuide({ ...exploreGuide, content: e.target.value })}
                                                placeholder="Write or paste your guide content here..."
                                                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-[11.5px] font-normal text-slate-800 h-56 outline-none focus:bg-white focus:border-slate-400 transition-colors resize-y leading-relaxed font-sans"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            disabled={isSavingGuide}
                                            onClick={handleSaveExploreGuide}
                                            className="w-full mt-1 bg-slate-900 hover:bg-black text-white py-2.5 rounded-lg text-[11.5px] font-medium shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
                                        >
                                            <Save size={13} /> {isSavingGuide ? 'Saving...' : 'Save & Publish Guide'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* App Live Preview Side */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1">
                                    <span>Mobile App Live Preview</span>
                                    <span className="text-[10px] text-slate-400">Live Render</span>
                                </div>
                                <div className="bg-[#FCF8F5] rounded-2xl border-4 border-slate-800 shadow-md p-3 min-h-[520px] max-h-[600px] flex flex-col font-poppins relative overflow-hidden">
                                    {/* Mobile Header */}
                                    <div className="bg-[#F3E8E0] -mx-3 -mt-3 p-3 rounded-b-xl mb-2.5 border-b border-[#EDE4DC]">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="w-6 h-6 rounded-full bg-white/90 border border-[#EDE4DC] flex items-center justify-center text-[#462211]">
                                                <ChevronLeft size={14} />
                                            </div>
                                            {exploreGuide.logoUrl && (
                                                <div className="h-6 px-1.5 rounded bg-white/90 border border-[#EDE4DC] flex items-center gap-1">
                                                    <img src={exploreGuide.logoUrl} alt="" className="h-3.5 w-auto object-contain" />
                                                    <span className="text-[8px] font-semibold text-[#462211]">Guide</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[7.5px] font-semibold uppercase tracking-wider bg-[#462211]/10 text-[#462211] px-1.5 py-0.5 rounded inline-block mb-0.5">
                                            {exploreGuide.badge || 'YOUR GROWTH OUR GUIDANCE'}
                                        </span>
                                        <h2 className="text-[13px] font-semibold text-[#462211] leading-tight">
                                            {exploreGuide.title || 'Guide Title'}
                                        </h2>
                                        {exploreGuide.subtitle && (
                                            <p className="text-[9.5px] text-[#7A5648] mt-0.5 font-normal leading-relaxed">
                                                {exploreGuide.subtitle}
                                            </p>
                                        )}
                                    </div>

                                    {/* Single Sheet Content */}
                                    <div className="flex-1 overflow-y-auto pr-1 -mt-1 custom-scrollbar">
                                        <div className="bg-white rounded-xl border border-[#EDE4DC] shadow-2xs p-2.5 space-y-2.5 text-[9.5px] text-[#7A5648] leading-relaxed">
                                            {(() => {
                                                const contentStr = exploreGuide.content || (exploreGuide.points?.length ? exploreGuide.points.map(p => `${p.title}\n${p.text}`).join('\n\n') : '');
                                                if (!contentStr) {
                                                    return <p className="text-center text-slate-400 text-xs py-6">No content added yet</p>;
                                                }
                                                const blocks = contentStr.split(/\n\s*\n/).filter(b => b.trim().length > 0);
                                                return blocks.map((block, idx) => {
                                                    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
                                                    const firstLine = lines[0] || '';
                                                    const isHeading = lines.length > 1 && (
                                                        /^(\u{1F300}-\u{1FAFF}|[#•\d]|\*|\s*🎯|\s*🚀|\s*📱|\s*🏠|\s*💼|\s*💳|\s*👥|\s*⚠️|\s*❇️|\s*🎁)/u.test(firstLine) ||
                                                        firstLine.length < 60
                                                    );

                                                    if (isHeading) {
                                                        const headerText = lines[0];
                                                        const bodyLines = lines.slice(1);
                                                        return (
                                                            <div key={idx} className={`space-y-0.5 ${idx > 0 ? 'pt-1.5 border-t border-[#EDE4DC]/40' : ''}`}>
                                                                <h5 className="text-[10px] font-semibold text-[#462211] leading-tight">{headerText.replace(/^#+\s*/, '')}</h5>
                                                                <div className="space-y-0.5 text-[9px] text-[#7A5648] font-normal leading-relaxed">
                                                                    {bodyLines.map((line, lIdx) => (
                                                                        <p key={lIdx} className={line.startsWith('•') || line.startsWith('-') ? 'pl-1 text-[#462211] font-medium' : ''}>{line}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    const isWarning = block.includes('⚠️') || block.toLowerCase().includes('guarantee');

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={isWarning ? 'p-1.5 bg-[#FFF8F2] border-l-2 border-[#B3591C] rounded-r text-[9px] text-[#644234] font-normal' : 'text-[9.5px] text-[#7A5648] font-normal whitespace-pre-line'}
                                                        >
                                                            {block}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Simulated CTA */}
                                    <div className="mt-2 pt-1.5 border-t border-[#EDE4DC] space-y-0.5">
                                        <div className="w-full bg-[#462211] text-white py-2 rounded-full text-center text-[10px] font-semibold flex items-center justify-center gap-1 shadow-xs">
                                            <span>{exploreGuide.ctaText || 'Start Earning Now'}</span>
                                            <ArrowRight size={11} />
                                        </div>
                                        <div className="w-full text-center text-[9px] font-medium text-[#7A5648]">
                                            Back to Home
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NEW: INFO PAGES CMS ── */}
                {activeTab === 'menu' && infoPages && infoPages[selectedPage] && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Editor Side */}
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {Object.keys(infoPages).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPage(key)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-medium uppercase tracking-normal transition-all ${selectedPage === key ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        {key.replace('menu_', '').replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center"><FileText size={24} /></div>
                                        <div>
                                            <h3 className="text-lg font-medium text-slate-800 tracking-tight uppercase">Menu Content Editor</h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Editing: {selectedPage.replace('menu_', '').replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Title</label>
                                        <input value={infoPages[selectedPage].title} onChange={(e) => {
                                            const np = { ...infoPages }; np[selectedPage].title = e.target.value; setInfoPages(np);
                                        }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Subtitle</label>
                                        <input value={infoPages[selectedPage].subtitle} onChange={(e) => {
                                            const np = { ...infoPages }; np[selectedPage].subtitle = e.target.value; setInfoPages(np);
                                        }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 focus:ring-2 focus:ring-sky-500 outline-none" />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Content Sections (Bullets)</label>
                                        {infoPages[selectedPage].sections?.map((section, i) => (
                                            <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative group">
                                                <button onClick={() => {
                                                    const np = { ...infoPages }; np[selectedPage].sections.splice(i, 1); setInfoPages(np);
                                                }} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                                <input value={section.title} onChange={(e) => {
                                                    const np = { ...infoPages }; np[selectedPage].sections[i].title = e.target.value; setInfoPages(np);
                                                }} className="w-[85%] bg-white border-b border-slate-100 px-3 py-2 text-[13px] font-medium text-slate-700 outline-none mb-2 rounded-t-xl" placeholder="Section Title" />
                                                <textarea value={section.text} onChange={(e) => {
                                                    const np = { ...infoPages }; np[selectedPage].sections[i].text = e.target.value; setInfoPages(np);
                                                }} className="w-full bg-white px-3 py-2 text-[12px] font-medium text-slate-500 h-16 outline-none resize-none rounded-b-xl" placeholder="Section Description..." />
                                            </div>
                                        ))}
                                        <button onClick={() => {
                                            const np = { ...infoPages };
                                            if (!np[selectedPage].sections) np[selectedPage].sections = [];
                                            np[selectedPage].sections.push({ title: 'New Section', text: 'Enter details...' });
                                            setInfoPages(np);
                                        }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-lg text-[11px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Section</button>
                                    </div>
                                    <button onClick={() => {
                                        const page = infoPages[selectedPage];
                                        handleUpdateMarketingKey(selectedPage, {
                                            title: page.title,
                                            subtitle: page.subtitle,
                                            sections: page.sections
                                        }, page.title);
                                    }} className="w-full mt-6 bg-[#0F172A] text-white py-4 rounded-lg font-medium text-[12px] uppercase tracking-normal shadow-xl flex items-center justify-center gap-2">
                                        <Save size={16} /> Update Page Content
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Side */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal ml-4 flex items-center gap-2">Live App Preview <ChevronRight size={12} /></h4>
                            <div className="bg-slate-100 rounded-lg p-4 border-8 border-slate-200 shadow-2xl relative h-[700px] overflow-hidden flex flex-col scale-95 origin-top">
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-50"></div>
                                {/* Emulated Mobile App View */}
                                <div className="flex-1 bg-white rounded-lg overflow-hidden flex flex-col relative">
                                    <div className="p-4 bg-slate-900 text-white">
                                        <h1 className="text-2xl font-medium tracking-tight mt-6">{infoPages[selectedPage].title}</h1>
                                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-normal mt-1">{infoPages[selectedPage].subtitle}</p>
                                    </div>
                                    <div className="flex-1 bg-white p-4 overflow-y-auto space-y-6 rounded-t-3xl -mt-4 relative z-10 custom-scrollbar">
                                        {infoPages[selectedPage].sections?.map((section, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="mt-1"><CheckCircle2 size={20} className="text-sky-500" /></div>
                                                <div>
                                                    <h3 className="text-sm font-medium text-slate-800 mb-1">{section.title}</h3>
                                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">{section.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NEW: FUTURE FEATURES CMS ── */}
                {activeTab === 'future' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Editor Side */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center"><Sparkles size={24} /></div>
                                        <div>
                                            <h3 className="text-lg font-medium text-slate-800 tracking-tight uppercase">Upcoming Features List</h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Add features seen in the DISCOVER page</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleUpdateMarketingKey('menu_future_features', { title: futureFeaturesTitle, subtitle: futureFeaturesSubtitle, sections: futureFeatures }, 'Future and Option')} className="bg-slate-900 text-white px-4 py-3 rounded-xl text-[10px] font-medium uppercase tracking-normal shadow-xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"><Save size={14} /> Global Sync</button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Title</label>
                                        <input value={futureFeaturesTitle} onChange={(e) => setFutureFeaturesTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Subtitle / Description</label>
                                        <input value={futureFeaturesSubtitle} onChange={(e) => setFutureFeaturesSubtitle(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 focus:ring-2 focus:ring-sky-500 outline-none" />
                                    </div>

                                    {futureFeatures.map((feat, i) => (
                                        <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4 relative group hover:bg-white hover:shadow-xl transition-all">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Opportunity Item 0{i + 1}</span>
                                                <button onClick={() => setFutureFeatures(futureFeatures.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-1">Feature Title</label>
                                                    <input value={feat.title} onChange={(e) => {
                                                        const nf = [...futureFeatures]; nf[i].title = e.target.value; setFutureFeatures(nf);
                                                    }} className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-1">Description / Subtext</label>
                                                    <textarea value={feat.text} onChange={(e) => {
                                                        const nf = [...futureFeatures]; nf[i].text = e.target.value; setFutureFeatures(nf);
                                                    }} className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-500 h-20 outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setFutureFeatures([...futureFeatures, { title: 'New Feature Header', text: 'Describe the upcoming opportunity here...' }])} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-medium text-[11px] uppercase tracking-normal hover:border-sky-400 hover:text-sky-500 transition-all flex flex-col items-center gap-3">
                                        <Plus size={24} /> Add Future Feature Point
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Side */}
                        <div className="space-y-12">
                            {/* Card 1: Income Page UI Replica (Image 1) */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal ml-4 flex items-center gap-2">Income Center Card Preview <ChevronRight size={12} /></h4>
                                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-inner flex justify-center">
                                    <div className="w-[280px] bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
                                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-6 shadow-sm border border-black/[0.03]">
                                            <Sparkles size={32} className="text-slate-800" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center mb-6">
                                            <h3 className="text-[16px] font-medium text-slate-800 leading-tight mb-2 uppercase tracking-tight">{futureFeaturesTitle}</h3>
                                            <p className="text-[11px] font-medium text-slate-400 leading-tight uppercase tracking-[0.1em]">{futureFeaturesSubtitle}</p>
                                        </div>
                                        <button className="w-full bg-slate-900 text-white text-[12px] font-medium py-4 rounded-lg uppercase tracking-normal shadow-xl shadow-slate-200">
                                            Discover
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Future Features Details UI (Image 2) */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal ml-4 flex items-center gap-2">Details Page Preview <ChevronRight size={12} /></h4>
                                <div className="bg-slate-900 rounded-lg p-4 relative overflow-hidden shadow-2xl scale-[0.98]">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="absolute -left-10 top-0 opacity-10">
                                        <Rocket size={180} className="text-white" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><ChevronLeft size={24} /></div>
                                        </div>
                                        <h2 className="text-2xl font-medium text-white tracking-tight uppercase mt-6 leading-none">{futureFeaturesTitle}</h2>
                                        <p className="text-[11px] font-medium text-sky-400 uppercase tracking-[0.25em] mt-2 mb-6">{futureFeaturesSubtitle}</p>

                                        <div className="bg-white rounded-lg p-4 space-y-8 shadow-2xl min-h-[400px]">
                                            {futureFeatures.map((f, i) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="mt-1">
                                                        <CheckCircle2 size={24} className="text-sky-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[15px] font-medium text-slate-800 mb-1">{f.title}</h3>
                                                        <p className="text-[12px] font-medium text-slate-400 leading-relaxed">{f.text}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-center opacity-70">
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal leading-relaxed">
                                                    Need more help? Our experts are just a click away in the support section.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── TAB 1: AD BANNERS ── */}
                {activeTab === 'banners' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="space-y-6">
                            {banners.map((banner, idx) => (
                                <div key={banner._id || idx} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 group relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 text-sky-400 rounded-xl flex items-center justify-center font-medium">0{idx + 1}</div>
                                            <h3 className="text-[13px] font-medium text-slate-400 uppercase tracking-normal">Home Banner</h3>
                                        </div>
                                        <button onClick={() => handleDeleteBanner(banner._id)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Line 1 (dark text)</label>
                                                <input value={banner.tag} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].tag = e.target.value; setBanners(newB);
                                                }} placeholder="e.g. Your Growth" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Line 2 (orange heading)</label>
                                            <input value={banner.title} onChange={(e) => {
                                                const newB = [...banners]; newB[idx].title = e.target.value; setBanners(newB);
                                                }} placeholder="e.g. Our Guidance" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Subtitle / Description</label>
                                            <textarea value={banner.subtitle} onChange={(e) => {
                                                const newB = [...banners]; newB[idx].subtitle = e.target.value; setBanners(newB);
                                            }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 h-24 outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 -mt-2">Home hero: Line 1 + Line 2 + subtitle + CTA + right-side image. Toggle Active to show on /user/home.</p>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Hero Image</label>
                                            <div className="flex gap-3 items-center">
                                                {banner.imageUrl ? (
                                                    <img src={banner.imageUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-dashed border-slate-200 shrink-0" />
                                                )}
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        value={banner.imageUrl || ''}
                                                        onChange={(e) => {
                                                            const newB = [...banners]; newB[idx].imageUrl = e.target.value; setBanners(newB);
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-[12px] text-slate-800 outline-none"
                                                        placeholder="Image URL"
                                                    />
                                                    <label className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-sky-600 cursor-pointer">
                                                        <Upload size={12} /> Upload
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                try {
                                                                    const form = new FormData();
                                                                    form.append('file', file);
                                                                    const res = await api.post('/admin/upload', form, {
                                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                                    });
                                                                    if (res.success && res.url) {
                                                                        const newB = [...banners];
                                                                        newB[idx].imageUrl = res.url;
                                                                        setBanners(newB);
                                                                        addNotification('Success', 'Image uploaded. Click Sync Banner to save.', 'success');
                                                                    } else {
                                                                        addNotification('Error', 'Could not retrieve upload URL.', 'error');
                                                                    }
                                                                } catch (err) {
                                                                    addNotification('Error', 'Image upload failed.', 'error');
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Show on Home</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newB = [...banners];
                                                    newB[idx].isActive = !newB[idx].isActive;
                                                    setBanners(newB);
                                                }}
                                                className={`w-11 h-6 rounded-full relative transition-colors ${banner.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${banner.isActive ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Button Text (CTA)</label>
                                                <input value={banner.ctaText} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].ctaText = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" placeholder="e.g. Upgrade Now" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Action Link (Path)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newB = [...banners];
                                                            newB[idx].path = '/user/guide/explore-now';
                                                            setBanners(newB);
                                                        }}
                                                        className="text-[9.5px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wide underline"
                                                    >
                                                        Set Explore Guide Path
                                                    </button>
                                                </div>
                                                <input value={banner.path || ''} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].path = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" placeholder="e.g. /user/guide/explore-now" />
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={() => handleSyncBanner(banner)} className="w-full mt-5 bg-[#0F172A] text-white py-4 rounded-lg font-medium text-[12px] uppercase tracking-normal shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                                        <Save size={16} /> Sync Banner
                                    </button>
                                </div>
                            ))}
                            <button onClick={handleAddBanner} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-medium text-[12px] uppercase tracking-normal hover:border-sky-500 hover:text-sky-500 transition-all flex flex-col items-center gap-2">
                                <Plus size={24} /> Add New Promotional Banner
                            </button>
                        </div>

                        {/* Banner Preview Section */}
                        <div className="sticky top-6 max-h-[90vh] overflow-y-auto bg-[#0F172A] rounded-lg shadow-2xl shadow-slate-200 custom-scrollbar">
                            <div className="flex items-center gap-3 sticky top-0 bg-[#0F172A] z-50 p-4 pb-6">
                                <div className="p-3 bg-white/5 rounded-lg text-sky-400"><MousePointer2 size={24} /></div>
                                <h3 className="text-xl font-medium text-white tracking-tight">User Dashboard Preview</h3>
                            </div>

                            <div className="space-y-6 px-10 pb-10">
                                {banners.map((banner) => (
                                    <div key={banner._id || banner.tag} className="bg-[#F8F1E8] rounded-2xl p-3.5 relative overflow-hidden shadow-lg min-h-[132px]">
                                        <div className={`absolute top-2.5 right-2.5 text-[8px] font-bold uppercase px-2 py-0.5 rounded-full z-20 ${banner.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                            {banner.isActive ? 'Live' : 'Hidden'}
                                        </div>
                                        <div className="relative z-10 flex items-stretch min-h-[112px]">
                                            <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                                                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">{banner.tag || 'Your Growth'}</h2>
                                                <h3 className="text-[15px] font-bold text-[#C2520A] leading-tight">{banner.title || 'Our Guidance'}</h3>
                                                <p className="text-[9px] font-medium text-slate-500 mt-1 line-clamp-3">{banner.subtitle}</p>
                                                <div className="inline-flex items-center gap-1 bg-[#C2520A] text-white px-2.5 py-1 rounded-full mt-2 text-[9px] font-semibold w-fit">
                                                    {banner.ctaText || 'Explore Now'} <ChevronRight size={10} />
                                    </div>
                            </div>
                                            {banner.imageUrl && (
                                                <img src={banner.imageUrl} alt="" className="w-[42%] max-w-[120px] h-[108px] object-cover object-top shrink-0 self-end" />
                                            )}
                                        </div>
                                    </div>
                                                ))}
                                            </div>
                                        </div>
                    </div>
                )}

                {/* ── TAB: LIFETIME PROMO ── */}
                {activeTab === 'lifetime' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Rocket size={32} /></div>
                                <div>
                                    <h3 className="text-2xl font-medium text-slate-800 tracking-tight">Lifetime Access CMS</h3>
                                    <p className="text-[12px] font-medium text-slate-400 uppercase tracking-normal mt-1">Manage the core platform offer</p>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Main Headline</label>
                                    <input value={lifetime.title} onChange={(e) => setLifetime({ ...lifetime, title: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[16px] font-medium text-slate-800 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Price Tag (Offer Text)</label>
                                    <input value={lifetime.priceTag} onChange={(e) => setLifetime({ ...lifetime, priceTag: e.target.value })} className="w-full bg-sky-50 border border-sky-100 rounded-lg px-5 py-4 text-[14px] font-medium text-sky-600 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Subtitle Note (Hindi)</label>
                                    <input value={lifetime.note} onChange={(e) => setLifetime({ ...lifetime, note: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 outline-none" />
                                </div>

                                <div className="space-y-3 pt-4">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Feature List (Checkpoints)</label>
                                    {lifetime.features.map((item, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <input value={item} onChange={(e) => {
                                                const nf = [...lifetime.features]; nf[idx] = e.target.value; setLifetime({ ...lifetime, features: nf });
                                            }} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-[13px] font-medium text-slate-800 shadow-sm outline-none" />
                                            <button onClick={() => {
                                                const nf = lifetime.features.filter((_, i) => i !== idx); setLifetime({ ...lifetime, features: nf });
                                            }} className="w-12 h-12 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setLifetime({ ...lifetime, features: [...lifetime.features, 'New Platform Feature'] })} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-lg text-[11px] font-medium uppercase text-slate-400 hover:text-indigo-500 transition-all">+ Add New Checkpoint</button>
                                </div>
                            </div>

                            <button onClick={handleDeployLifetimePromo} className="w-full mt-4 bg-[#0F172A] text-white py-3 rounded-lg font-medium text-[12px] uppercase tracking-normal shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3">
                                <Save size={20} /> Deploy Lifetime Promotion
                            </button>
                        </div>

                        {/* Real-time Preview Card (Image 2 Replica) */}
                        <div className="flex flex-col justify-center">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner">
                                <p className="text-[10px] font-medium text-slate-300 uppercase tracking-[0.3em] mb-6 text-center">Live Preview in App</p>
                                <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 rounded-lg p-4 shadow-2xl relative overflow-hidden ring-8 ring-white">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10 text-sky-400">
                                                <Rocket size={24} />
                                            </div>
                                            <h3 className="text-xl font-medium text-white tracking-tight uppercase">{lifetime.title}</h3>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                                            <p className="text-[15px] font-medium text-sky-400 leading-none">{lifetime.priceTag}</p>
                                            <p className="text-[12px] font-medium text-white/70 mt-2 leading-tight">{lifetime.note}</p>
                                        </div>
                                        <div className="space-y-4 pl-1">
                                            <p className="text-[10px] font-medium text-white/30 uppercase tracking-normal">Platform Access Benefits:</p>
                                            {lifetime.features.map((f, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-6 h-6 bg-sky-500/20 rounded-full flex items-center justify-center border border-sky-500/30 text-sky-400"><CheckCircle2 size={12} /></div>
                                                    <span className="text-[13px] font-medium text-white/90">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketingManager;
