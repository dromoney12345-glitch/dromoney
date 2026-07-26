import React, { useState, useEffect } from 'react';
import {
    Sparkles, Zap, Rocket, Plus, Trash2,
    Save, Layout, Palette, Type,
    ChevronRight, ChevronLeft, Info, CheckCircle2,
    Trophy, Users, Target, MousePointer2, List, FileText, Briefcase
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { contentStorage } from '../../shared/services/contentStorage';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const MarketingManager = () => {
    const { addNotification } = useAdmin();
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('admin_marketing_active_tab') || 'banners';
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
            tag: 'NEW OFFER',
            title: 'New Banner',
            subtitle: 'Click edit to customize this banner.',
            gradient: 'from-slate-500 to-slate-700',
            iconName: 'Sparkles',
            ctaText: 'View More',
            path: '/user/events',
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

    const [boosters, setBoosters] = useState({
        support: { _id: null, title: 'Support Booster', subtitle: 'Boost participation & win more!', price: 11, benefits: [] },
        task: { _id: null, title: 'Task Booster', subtitle: 'Increase coin value 3X now!', price: 49, benefits: [] }
    });

    const fetchBoosters = async () => {
        try {
            const res = await api.get('/admin/boosters');
            if (res.success && res.data) {
                const results = { ...boosters };
                res.data.forEach(item => {
                    if (item.type === 'support' || item.type === 'task') {
                        results[item.type] = item;
                    }
                });
                setBoosters(results);
            }
        } catch (err) {
            console.error('Error fetching boosters:', err);
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
            'menu_boosters', 'menu_future_features'
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

                // 2. Process Boosters - REMOVED, now fetched via fetchBoosters()
                /*
                if (data['menu_boosters'] && data['menu_boosters'].data) {
                    setBoosters(data['menu_boosters'].data);
                }
                */

                // 3. Process Future Features
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

    const handleUpdateBooster = async (type) => {
        const b = boosters[type];
        if (!b._id) return addNotification("Error", "Booster ID not found. Sync from DB first.", "error");

        try {
            const { _id, createdAt, __v, ...payload } = b;
            const res = await api.put(`/admin/boosters/${_id}`, payload);
            if (res.success) addNotification("Success", `${b.title} Updated!`, "success");
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to update booster.", "error");
        }
    };

    useEffect(() => {
        fetchBanners();
        fetchLifetimePromo();
        fetchAllMarketingData();
        fetchBoosters();
    }, []);

    // ── Future Features Data (Image 1 & 2) ──
    const [futureFeatures, setFutureFeatures] = useState([
        { title: 'Dromoney Marketplace', text: 'Buy and sell digital assets directly within our ecosystem using wallet balance.' },
        { title: 'Global Payouts', text: 'Expansion beyond local banking to support international earners through crypto and PayPal.' },
        { title: 'Advanced AI Tools', text: 'Get automated marketing kits generated for your affiliate links for 10x better results.' }
    ]);
    const [futureFeaturesTitle, setFutureFeaturesTitle] = useState("Future and Option");
    const [futureFeaturesSubtitle, setFutureFeaturesSubtitle] = useState("Upcoming earning opportunities");

    // Old Storage effects removed

    return (
        <div className="p-4 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <PageHeader title="Marketing & Promos" subtitle="Manage banners, booster benefits, and visual promotions" />

            {/* Sub-navigation Tabs */}
            <div className="flex gap-2 mb-6 mt-6 bg-white p-2 rounded-lg border border-slate-100 shadow-sm w-fit">
                {[
                    { id: 'menu', label: 'Menu Pages', icon: FileText },
                    { id: 'banners', label: 'Ad Banners', icon: Layout },
                    { id: 'boosters', label: 'Booster Packs', icon: Zap },
                    { id: 'lifetime', label: 'Lifetime Promo', icon: Rocket },
                    { id: 'future', label: 'Future and Option', icon: Sparkles },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-lg font-medium text-[11px] uppercase tracking-normal transition-all ${activeTab === tab.id ? 'bg-[#0F172A] text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">

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
                                            <h3 className="text-[13px] font-medium text-slate-400 uppercase tracking-normal">Banner Config</h3>
                                        </div>
                                        <button onClick={() => handleDeleteBanner(banner._id)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Banner Tag</label>
                                                <input value={banner.tag} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].tag = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Gradient Theme</label>
                                                <select value={banner.gradient} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].gradient = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 outline-none custom-scrollbar">
                                                    <option value="from-sky-500 to-sky-700">Sky Premium (Blue)</option>
                                                    <option value="from-indigo-500 to-indigo-700">Indigo Royal (Dark Blue/Purple)</option>
                                                    <option value="from-emerald-500 to-teal-600">Emerald Growth (Green)</option>
                                                    <option value="from-rose-500 to-orange-600">Orange Spark (Red/Orange)</option>
                                                    <option value="from-violet-600 to-fuchsia-600">Fuchsia Dream (Purple/Pink)</option>
                                                    <option value="from-amber-400 to-orange-500">Amber Glow (Yellow/Orange)</option>
                                                    <option value="from-cyan-400 to-blue-600">Ocean Wave (Cyan/Blue)</option>
                                                    <option value="from-pink-500 to-rose-600">Rose Petal (Pink/Red)</option>
                                                    <option value="from-slate-800 to-slate-950">Midnight Stealth (Dark/Black)</option>
                                                    <option value="from-teal-400 to-emerald-600">Mint Fresh (Teal/Green)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Main Heading</label>
                                            <input value={banner.title} onChange={(e) => {
                                                const newB = [...banners]; newB[idx].title = e.target.value; setBanners(newB);
                                            }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[15px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Subtitle / Description</label>
                                            <textarea value={banner.subtitle} onChange={(e) => {
                                                const newB = [...banners]; newB[idx].subtitle = e.target.value; setBanners(newB);
                                            }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 h-24 outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Button Text (CTA)</label>
                                                <input value={banner.ctaText} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].ctaText = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" placeholder="e.g. Upgrade Now" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Action Link (Path)</label>
                                                <input value={banner.path} onChange={(e) => {
                                                    const newB = [...banners]; newB[idx].path = e.target.value; setBanners(newB);
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" placeholder="e.g. /user/profile" />
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
                                    <div key={banner._id || banner.tag} className={`bg-gradient-to-r ${banner.gradient} rounded-xl p-4 relative overflow-hidden group shadow-lg shadow-black/20 scale-95 opacity-80 hover:scale-100 hover:opacity-100 transition-all duration-300 border border-white/5`}>
                                        <div className="relative z-10 text-white">
                                            <span className="text-[9px] font-medium uppercase tracking-normal bg-white/20 px-3 py-1 rounded-full border border-white/10">{banner.tag}</span>
                                            <h2 className="text-2xl font-medium tracking-tight mt-3">{banner.title}</h2>
                                            <p className="text-[11px] font-medium text-white/70 mt-1 max-w-[80%]">{banner.subtitle}</p>
                                            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl mt-5 text-[10px] font-medium uppercase tracking-normal">Upgrade Now <ChevronRight size={14} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: BOOSTER PACKS ── */}
                {activeTab === 'boosters' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {['support', 'task'].map((type) => {
                            const b = boosters[type];
                            return (
                                <div key={type} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 group">
                                    {/* Card Header */}
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-50">
                                        <div className={`w-9 h-9 ${type === 'support' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'} rounded-xl flex items-center justify-center shrink-0`}><Zap size={18} /></div>
                                        <div>
                                            <h3 className="text-[13px] font-medium text-slate-800 tracking-tight leading-none">{b.title}</h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mt-0.5">Manage Dropdown Benefits</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5">Booster Title</label>
                                                <input value={b.title} onChange={(e) => {
                                                    setBoosters({ ...boosters, [type]: { ...boosters[type], title: e.target.value } });
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5">Booster Price (₹)</label>
                                                <input type="number" min="0" value={b.price} onChange={(e) => {
                                                    const val = Math.max(0, Number(e.target.value));
                                                    setBoosters({ ...boosters, [type]: { ...boosters[type], price: val } });
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-400" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5">Booster Validity (Value)</label>
                                                <input type="number" min="0" value={b.validityValue === undefined ? 30 : b.validityValue} onChange={(e) => {
                                                    const raw = e.target.value === '' ? '' : Number(e.target.value);
                                                    const val = raw === '' ? '' : Math.max(0, raw);
                                                    const unit = b.validityUnit || 'Days';
                                                    setBoosters({
                                                        ...boosters,
                                                        [type]: { ...boosters[type], validityValue: val, validity: `${val || 0} ${unit}` }
                                                    });
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-400" placeholder="e.g. 30" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5">Booster Validity (Unit)</label>
                                                <select value={b.validityUnit || 'Days'} onChange={(e) => {
                                                    const unit = e.target.value;
                                                    const val = b.validityValue || 30;
                                                    setBoosters({ ...boosters, [type]: { ...boosters[type], validityUnit: unit, validity: `${val} ${unit}` } });
                                                }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-400">
                                                    <option value="Days">Days</option>
                                                    <option value="Months">Months</option>
                                                    <option value="Years">Years</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5">Sub-heading Text</label>
                                            <input value={b.subtitle} onChange={(e) => {
                                                setBoosters({ ...boosters, [type]: { ...boosters[type], subtitle: e.target.value } });
                                            }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-400" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5 flex items-center gap-1.5"><Target size={12} /> Applicable Tasks / Events</label>
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                {(type === 'support' 
                                                    ? ['Speed Tapper', 'Standard Quiz', 'Memory Master', 'Lucky Draw'] 
                                                    : ['General Tasks', 'Task Quiz', 'Speed Tapper', 'Standard Quiz', 'Memory Master', 'Lucky Draw', 'Scratch Card', 'Treasure Chest', 'Contests']).map((taskOption) => (
                                                    <label key={taskOption} className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={b.applicableTasks?.includes(taskOption) || false}
                                                            onChange={(e) => {
                                                                const current = b.applicableTasks || [];
                                                                let updated = [];
                                                                if (e.target.checked) {
                                                                    updated = [...current, taskOption];
                                                                } else {
                                                                    updated = current.filter(t => t !== taskOption);
                                                                }
                                                                setBoosters({ ...boosters, [type]: { ...boosters[type], applicableTasks: updated } });
                                                            }}
                                                            className="w-3.5 h-3.5 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                                                        />
                                                        <span className="text-[11px] font-medium text-slate-700">{taskOption}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-0.5 flex items-center gap-1.5"><List size={12} /> Benefit List (Image 1 Dropdown)</label>
                                            {b.benefits.map((text, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input value={text} onChange={(e) => {
                                                        const newBenefits = [...b.benefits];
                                                        newBenefits[idx] = e.target.value;
                                                        setBoosters({ ...boosters, [type]: { ...boosters[type], benefits: newBenefits } });
                                                    }} className="flex-1 bg-white border border-slate-100 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-400 outline-none" />
                                                    <button onClick={() => {
                                                        setBoosters({ ...boosters, [type]: { ...boosters[type], benefits: b.benefits.filter((_, i) => i !== idx) } });
                                                    }} className="w-8 h-8 bg-rose-50 text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shrink-0"><Trash2 size={13} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => {
                                                setBoosters({ ...boosters, [type]: { ...boosters[type], benefits: [...b.benefits, 'New Benefit Point'] } });
                                            }} className="w-full py-2.5 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-medium uppercase text-slate-400 hover:text-sky-500 hover:border-sky-200 transition-all">+ Add New Point</button>
                                        </div>
                                    </div>

                                    <button onClick={() => handleUpdateBooster(type)} className="w-full bg-[#0F172A] text-white py-3 rounded-xl font-medium text-[11px] uppercase tracking-normal flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-95 transition-all">
                                        <Save size={14} /> Update {b.title} Configuration
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TAB 3: LIFETIME PROMO ── */}
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
