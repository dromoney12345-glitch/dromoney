import React, { useState, useEffect } from 'react';
import { 
    Save, Plus, Trash2, Layout, FileText, 
    Shield, ShieldCheck, BookOpen, AlertCircle,
    Award, HelpCircle, Download, Copy, AlertTriangle,
    ChevronRight, ChevronLeft, Link2, Sparkles, Star,
    Loader2, UploadCloud, Compass
} from 'lucide-react';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const LayoutManager = () => {
    const { addNotification } = useAdmin();
    const [activeTab, setActiveTab] = useState('navbar');

    // ── Navbar Content (Sections & Steps) ──
    const [navbarSections, setNavbarSections] = useState([
        {
            id: 1, label: 'Referral System', headline: 'EARN ₹200 REWARD', dbKey: 'menu_layout_refer',
            steps: [
                { title: 'SHARE YOUR LINK', desc: 'अपना referral link दोस्तों के साथ share करें।' },
                { title: 'EARN ₹200 INSTANT', desc: 'हर सफल registration पर आपको ₹200 का instant reward मिलेगा।' },
                { title: 'DIRECT WALLET CREDIT', desc: 'आपका reward amount सीधे आपके wallet में add kar diya jayega।' }
            ]
        },
        {
            id: 2, label: 'Daily Tasks', headline: 'COMPLETE DAILY TASKS', dbKey: 'menu_layout_tasks',
            steps: [
                { title: 'COMPLETE TASKS', desc: 'रोजाना simple tasks को पूरा करें। Tasks पर coin या instant wallet credit नहीं मिलता।' },
                { title: 'WALLET IN RUPEES', desc: 'App में coin system नहीं है। Invite और approved earning rupees में wallet में जाती है।' }
            ]
        },
        {
            id: 3, label: 'Future Fund', headline: 'PASSIVE INCOME SECURITY', dbKey: 'menu_layout_fund',
            steps: [
                { title: 'PLATFORM STAKE', desc: 'एक बार eligible होने पर, आपको platform के profits में हिस्सा मिलेगा।' },
                { title: 'MONTHLY PAYOUTS', desc: 'Profit share har mahine aapke wallet mein auto-credit hoga.' }
            ]
        },
    ]);

    const [footerPolicies, setFooterPolicies] = useState([
        {
            id: 1, label: 'Privacy Policy', path: '/user/info/privacy', dbKey: 'menu_privacy',
            subtitle: '', sections: [], icon: Shield, color: 'text-[#B3591C]'
        },
        {
            id: 3, label: 'Terms & Conditions', path: '/user/info/terms', dbKey: 'menu_terms',
            subtitle: '', sections: [], icon: ShieldCheck, color: 'text-[#B3591C]'
        },
        {
            id: 4, label: 'User Guidelines', path: '/user/info/guidelines', dbKey: 'menu_guidelines',
            subtitle: '', sections: [], icon: BookOpen, color: 'text-[#B3591C]'
        },
        {
            id: 5, label: 'No Refund Policy', path: '/user/info/refund-policy', dbKey: 'menu_refund_policy',
            subtitle: '', sections: [], icon: AlertCircle, color: 'text-[#B3591C]'
        },
        {
            id: 6, label: 'Future and Option', path: '/user/info/future-features', dbKey: 'menu_future_features',
            subtitle: '', sections: [], icon: Sparkles, color: 'text-[#B3591C]'
        },
    ]);



    const fetchNavbarSections = async () => {
        const keys = navbarSections.map(s => s.dbKey).join(',');
        try {
            const res = await api.get(`/public/content/bulk?keys=${keys}`);
            if (res.success && res.data) {
                const data = res.data;
                const updated = navbarSections.map(s => {
                    const item = data[s.dbKey];
                    if (item && item.data) {
                        return {
                            ...s,
                            label: item.title || s.label,
                            headline: item.data.headline || s.headline,
                            steps: item.data.steps || s.steps
                        };
                    }
                    return s;
                });
                setNavbarSections(updated);
            }
        } catch (err) {
            console.error('Error fetching navbar sections bulk:', err);
        }
    };

    const handleUpdateSection = async (section) => {
        try {
            const payload = {
                key: section.dbKey,
                title: section.label,
                description: section.headline,
                data: {
                    headline: section.headline,
                    steps: section.steps
                }
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) {
                addNotification("Success", `${section.label} updated successfully!`, "success");
            }
        } catch (err) {
            console.error('Error updating section:', err);
            addNotification("Error", "Failed to update section.", "error");
        }
    };

    const fetchFooterPolicies = async () => {
        const nf = [...footerPolicies];
        const keys = nf.map(p => p.dbKey).join(',');
        try {
            const res = await api.get(`/public/content/bulk?keys=${keys}`);
            if (res.success && res.data) {
                const data = res.data;
                nf.forEach(policy => {
                    const item = data[policy.dbKey];
                    if (item && item.data) {
                        policy.label = item.data.title || item.title || policy.label;
                        policy.subtitle = item.data.subtitle || '';
                        policy.sections = Array.isArray(item.data.sections) ? item.data.sections : [];
                    }
                });
                setFooterPolicies(nf);
            }
        } catch (err) {
            console.error(`Error fetching footer policies bulk:`, err);
        }
    };

    const handleUpdatePolicy = async (policy) => {
        try {
            const payload = {
                key: policy.dbKey,
                title: policy.label,
                data: {
                    title: policy.label,
                    subtitle: policy.subtitle || '',
                    sections: policy.sections || []
                }
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) {
                addNotification("Success", `${policy.label} updated successfully!`, "success");
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to update policy.", "error");
        }
    };

    const addPolicySection = (policyIdx) => {
        const nf = [...footerPolicies];
        nf[policyIdx].sections.push({ title: '', text: '' });
        setFooterPolicies(nf);
    };

    const deletePolicySection = (policyIdx, sectionIdx) => {
        const nf = [...footerPolicies];
        nf[policyIdx].sections.splice(sectionIdx, 1);
        setFooterPolicies(nf);
    };

    const updatePolicySection = (policyIdx, sectionIdx, field, value) => {
        const nf = [...footerPolicies];
        nf[policyIdx].sections[sectionIdx][field] = value;
        setFooterPolicies(nf);
    };

    const movePolicySection = (policyIdx, sectionIdx, direction) => {
        const nf = [...footerPolicies];
        const sections = nf[policyIdx].sections;
        const newIdx = sectionIdx + direction;
        if (newIdx < 0 || newIdx >= sections.length) return;
        [sections[sectionIdx], sections[newIdx]] = [sections[newIdx], sections[sectionIdx]];
        setFooterPolicies(nf);
    };

    // ── Home Guides ──
    const [homeGuides, setHomeGuides] = useState([]);
    const [guidesLoading, setGuidesLoading] = useState(false);

    const fetchHomeGuides = async () => {
        setGuidesLoading(true);
        try {
            const res = await api.get('/public/content/home_guides');
            if (res.success && res.data && res.data.data && Array.isArray(res.data.data.cards)) {
                setHomeGuides(res.data.data.cards);
            }
        } catch (err) {
            console.error('Error fetching home guides:', err);
        } finally {
            setGuidesLoading(false);
        }
    };

    const handleSaveGuides = async () => {
        try {
            const payload = {
                key: 'home_guides',
                title: 'Home Guide Cards',
                data: { cards: homeGuides }
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) {
                addNotification("Success", "Home guides updated successfully!", "success");
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to update guides.", "error");
        }
    };

    const addGuide = () => {
        setHomeGuides(prev => [...prev, {
            slug: `guide-${Date.now()}`,
            label: 'New Guide',
            icon: 'HelpCircle',
            iconBg: 'bg-[#FFF5F0]',
            iconColor: 'text-[#B3591C]',
            title: 'New Guide',
            subtitle: 'Guide description',
            next: '/user/home',
            points: ['Step 1']
        }]);
    };

    const deleteGuide = (idx) => {
        setHomeGuides(prev => prev.filter((_, i) => i !== idx));
    };

    const updateGuide = (idx, field, value) => {
        setHomeGuides(prev => {
            const n = [...prev];
            n[idx] = { ...n[idx], [field]: value };
            return n;
        });
    };

    const updateGuidePoint = (guideIdx, pointIdx, value) => {
        setHomeGuides(prev => {
            const n = [...prev];
            const pts = [...(n[guideIdx].points || [])];
            pts[pointIdx] = value;
            n[guideIdx] = { ...n[guideIdx], points: pts };
            return n;
        });
    };

    const addGuidePoint = (guideIdx) => {
        setHomeGuides(prev => {
            const n = [...prev];
            n[guideIdx] = { ...n[guideIdx], points: [...(n[guideIdx].points || []), ''] };
            return n;
        });
    };

    const deleteGuidePoint = (guideIdx, pointIdx) => {
        setHomeGuides(prev => {
            const n = [...prev];
            n[guideIdx] = { ...n[guideIdx], points: (n[guideIdx].points || []).filter((_, i) => i !== pointIdx) };
            return n;
        });
    };

    useEffect(() => {
        fetchNavbarSections();
        fetchFooterPolicies();
        fetchHomeGuides();
    }, []);

    const addStep = (sectionIdx) => {
        const ns = [...navbarSections];
        ns[sectionIdx].steps.push({ title: 'New Step', desc: 'Step instructions...' });
        setNavbarSections(ns);
    };

    const deleteStep = (sectionIdx, stepIdx) => {
        const ns = [...navbarSections];
        ns[sectionIdx].steps.splice(stepIdx, 1);
        setNavbarSections(ns);
    };

    return (
        <div className="p-4 lg:p-4 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-12">
                <div className="space-y-1">
                    <h1 className="text-4xl font-medium text-[#462211] tracking-tight uppercase">Layout Manager</h1>
                    <p className="text-[12px] font-medium text-[#7A5648] uppercase tracking-normal flex items-center gap-2">
                        <Layout size={14} className="text-[#B3591C]" /> App layout, home guides, and legal pages
                    </p>
                </div>

                <div className="bg-white p-1.5 rounded-lg border border-[#EDE4DC] shadow-sm flex flex-wrap gap-1">
                    <button 
                        onClick={() => setActiveTab('navbar')}
                        className={`px-6 py-3 rounded-lg text-[10px] font-medium uppercase tracking-normal transition-all ${activeTab === 'navbar' ? 'bg-[#462211] text-white shadow-lg' : 'text-[#7A5648] hover:text-[#462211]'}`}>
                        Section Content
                    </button>
                    <button 
                        onClick={() => setActiveTab('footer')}
                        className={`px-6 py-3 rounded-lg text-[10px] font-medium uppercase tracking-normal transition-all ${activeTab === 'footer' ? 'bg-[#462211] text-white shadow-lg' : 'text-[#7A5648] hover:text-[#462211]'}`}>
                        Footer & Policies
                    </button>
                    <button 
                        onClick={() => setActiveTab('guides')}
                        className={`px-6 py-3 rounded-lg text-[10px] font-medium uppercase tracking-normal transition-all ${activeTab === 'guides' ? 'bg-[#462211] text-white shadow-lg' : 'text-[#7A5648] hover:text-[#462211]'}`}>
                        Home Guides
                    </button>
                </div>
            </div>

            {/* TAB: SECTION CONTENT (NAVBAR) */}
            {activeTab === 'navbar' && (
                <div className="space-y-12 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                    {navbarSections.map((section, sIdx) => (
                        <div key={section.id} className="bg-white rounded-lg border border-[#EDE4DC] shadow-sm p-4 group overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-8 border-b border-[#EDE4DC]/50">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-[#462211] text-[#F5C28A] rounded-lg flex items-center justify-center font-medium text-xl shadow-xl">{section.id}</div>
                                    <div className="space-y-1">
                                        <input type="text" value={section.label} onChange={(e) => {
                                            const ns = [...navbarSections]; ns[sIdx].label = e.target.value; setNavbarSections(ns);
                                        }} className="text-xl font-medium text-[#462211] uppercase tracking-tight bg-transparent border-none p-0 outline-none w-full" />
                                        <input type="text" value={section.headline} onChange={(e) => {
                                            const ns = [...navbarSections]; ns[sIdx].headline = e.target.value; setNavbarSections(ns);
                                        }} className="text-[12px] font-medium text-[#B3591C] uppercase tracking-normal bg-transparent border-none p-0 outline-none w-full" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUpdateSection(section)}
                                    className="flex items-center gap-2 bg-[#462211] text-white px-8 py-4 rounded-lg font-medium text-[11px] uppercase tracking-normal shadow-xl hover:bg-[#5a2d1a] transition-all"
                                >
                                    <Save size={16} /> Update Section
                                </button>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                                {section.steps.map((step, stepIdx) => (
                                    <div key={stepIdx} className="min-w-[340px] bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg p-7 snap-center group/card transition-all hover:bg-white hover:shadow-2xl hover:shadow-[#462211]/5 relative">
                                        <button onClick={() => deleteStep(sIdx, stepIdx)} className="absolute top-6 right-6 w-9 h-9 bg-white text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm border border-[#EDE4DC]">
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-[#7A5648] uppercase tracking-normal ml-1">Step {stepIdx + 1} Title</label>
                                                <input value={step.title} onChange={(e) => {
                                                    const ns = [...navbarSections]; ns[sIdx].steps[stepIdx].title = e.target.value; setNavbarSections(ns);
                                                }} className="w-full bg-white border border-[#EDE4DC] rounded-lg px-5 py-4 text-[12px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C] shadow-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-[#7A5648] uppercase tracking-normal ml-1">Instructions</label>
                                                <textarea value={step.desc} onChange={(e) => {
                                                    const ns = [...navbarSections]; ns[sIdx].steps[stepIdx].desc = e.target.value; setNavbarSections(ns);
                                                }} className="w-full bg-white border border-[#EDE4DC] rounded-lg px-5 py-4 text-[12px] font-medium text-[#7A5648] h-28 outline-none focus:ring-2 focus:ring-[#B3591C] resize-none shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addStep(sIdx)} className="min-w-[200px] bg-[#FFF5F0]/30 border-2 border-dashed border-[#EDE4DC] rounded-lg flex flex-col items-center justify-center gap-3 hover:border-[#B3591C] hover:bg-[#FFF5F0] transition-all text-[#D4C4B8] hover:text-[#B3591C] group/plus">
                                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-lg group-hover/plus:scale-110 transition-transform"><Plus size={24} /></div>
                                    <span className="text-[11px] font-medium uppercase tracking-normal">Add New Step</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB: HOME GUIDES */}
            {activeTab === 'guides' && (
                <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Compass size={20} className="text-[#B3591C]" />
                            <p className="text-[12px] font-medium text-[#7A5648] uppercase tracking-normal">Manage the "How Dromoney Helps" guide cards on the home page</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={addGuide} className="flex items-center gap-1.5 bg-[#FFF5F0] text-[#B3591C] px-4 py-2.5 rounded-lg font-medium text-[10px] uppercase tracking-normal border border-[#EDE4DC] hover:bg-[#F3E8E0] transition-all">
                                <Plus size={14} /> Add Guide
                            </button>
                            <button onClick={handleSaveGuides} className="flex items-center gap-1.5 bg-[#462211] text-white px-6 py-2.5 rounded-lg font-medium text-[10px] uppercase tracking-normal shadow-xl hover:bg-[#5a2d1a] transition-all">
                                <Save size={14} /> Save All Guides
                            </button>
                        </div>
                    </div>

                    {homeGuides.length === 0 && !guidesLoading && (
                        <div className="text-center py-16 bg-white rounded-lg border border-[#EDE4DC]">
                            <Compass size={32} className="text-[#D4C4B8] mx-auto mb-3" />
                            <p className="text-[13px] text-[#7A5648]">No guides configured yet</p>
                            <p className="text-[10px] text-[#A89890] mt-1">Add guides here — they will appear on the home page. Until then, default guides are shown.</p>
                            <button onClick={addGuide} className="mt-4 text-[10px] font-medium text-[#B3591C] uppercase tracking-normal hover:underline">+ Add First Guide</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {homeGuides.map((guide, idx) => (
                            <div key={idx} className="bg-white rounded-lg border border-[#EDE4DC] shadow-sm p-5 relative group">
                                <button onClick={() => deleteGuide(idx)} className="absolute top-4 right-4 w-8 h-8 bg-[#FFF5F0] text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-[#EDE4DC]">
                                    <Trash2 size={14} />
                                </button>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Slug (unique ID)</label>
                                        <input value={guide.slug} onChange={(e) => updateGuide(idx, 'slug', e.target.value)} className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Card Label</label>
                                        <input value={guide.label} onChange={(e) => updateGuide(idx, 'label', e.target.value)} className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Guide Title</label>
                                        <input value={guide.title || ''} onChange={(e) => updateGuide(idx, 'title', e.target.value)} className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Subtitle</label>
                                        <input value={guide.subtitle || ''} onChange={(e) => updateGuide(idx, 'subtitle', e.target.value)} className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Icon Name (Lucide)</label>
                                        <input value={guide.icon || ''} onChange={(e) => updateGuide(idx, 'icon', e.target.value)} placeholder="e.g. UserPlus, Wallet" className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C] placeholder:text-[#C4B5A8]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Navigate To</label>
                                        <input value={guide.next || ''} onChange={(e) => updateGuide(idx, 'next', e.target.value)} placeholder="/user/marketing" className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C] placeholder:text-[#C4B5A8]" />
                                    </div>
                                </div>

                                <div className="space-y-2 mt-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal">Guide Points</label>
                                        <button onClick={() => addGuidePoint(idx)} className="text-[9px] font-medium text-[#B3591C] uppercase tracking-normal hover:underline">+ Add Point</button>
                                    </div>
                                    {(guide.points || []).map((pt, pIdx) => (
                                        <div key={pIdx} className="flex items-center gap-2">
                                            <span className="text-[9px] text-[#7A5648] font-medium w-4 shrink-0">{pIdx + 1}.</span>
                                            <input value={pt} onChange={(e) => updateGuidePoint(idx, pIdx, e.target.value)} className="flex-1 bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-3 py-2 text-[11px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                            <button onClick={() => deleteGuidePoint(idx, pIdx)} className="w-7 h-7 text-rose-400 hover:text-rose-600 flex items-center justify-center shrink-0"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: FOOTER & POLICIES */}
            {activeTab === 'footer' && (
                <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                    {footerPolicies.map((item, idx) => (
                        <div key={item.id} className="bg-white rounded-lg border border-[#EDE4DC] shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-[#EDE4DC] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-[#FFF5F0] ${item.color}`}><item.icon size={24} /></div>
                                    <div>
                                        <h3 className="text-lg font-medium text-[#462211] uppercase tracking-tight">{item.label}</h3>
                                        <p className="text-[10px] text-[#7A5648] font-medium uppercase tracking-normal mt-0.5">Manage sections and content</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUpdatePolicy(item)}
                                    className="flex items-center gap-3 bg-[#462211] text-white px-6 py-3 rounded-lg font-medium text-[11px] uppercase tracking-normal shadow-xl hover:bg-[#5a2d1a] transition-all"
                                >
                                    <Save size={16} /> Save Policy
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-[#7A5648] uppercase tracking-normal ml-1">Policy Title</label>
                                        <input value={item.label} onChange={(e) => {
                                            const nf = [...footerPolicies]; nf[idx].label = e.target.value; setFooterPolicies(nf);
                                        }} className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-4 py-3 text-[13px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C]" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-[#7A5648] uppercase tracking-normal ml-1">Subtitle</label>
                                        <input value={item.subtitle || ''} onChange={(e) => {
                                            const nf = [...footerPolicies]; nf[idx].subtitle = e.target.value; setFooterPolicies(nf);
                                        }} placeholder="e.g. Your Data Privacy & Security" className="w-full bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg px-4 py-3 text-[13px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C] placeholder:text-[#C4B5A8]" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-medium text-[#7A5648] uppercase tracking-normal flex items-center gap-2"><FileText size={14} /> Sections</label>
                                        <button onClick={() => addPolicySection(idx)} className="flex items-center gap-1.5 text-[10px] font-medium text-[#B3591C] uppercase tracking-normal hover:text-[#462211] transition-colors">
                                            <Plus size={14} /> Add Section
                                        </button>
                                    </div>

                                    {(!item.sections || item.sections.length === 0) && (
                                        <div className="text-center py-8 bg-[#FFF5F0] rounded-lg border border-dashed border-[#EDE4DC]">
                                            <FileText size={24} className="text-[#D4C4B8] mx-auto mb-2" />
                                            <p className="text-[11px] text-[#7A5648]">No sections added yet</p>
                                            <button onClick={() => addPolicySection(idx)} className="mt-2 text-[10px] font-medium text-[#B3591C] uppercase tracking-normal hover:underline">+ Add First Section</button>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {(item.sections || []).map((section, sIdx) => (
                                            <div key={sIdx} className="bg-[#FFF5F0] border border-[#EDE4DC] rounded-lg p-4 relative group">
                                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => movePolicySection(idx, sIdx, -1)} disabled={sIdx === 0} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[#7A5648] border border-[#EDE4DC] disabled:opacity-30 hover:text-[#B3591C]">
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <button onClick={() => movePolicySection(idx, sIdx, 1)} disabled={sIdx === item.sections.length - 1} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[#7A5648] border border-[#EDE4DC] disabled:opacity-30 hover:text-[#B3591C]">
                                                        <ChevronRight size={14} />
                                                    </button>
                                                    <button onClick={() => deletePolicySection(idx, sIdx)} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-rose-500 border border-[#EDE4DC] hover:bg-rose-50">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="space-y-3 pr-24">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal ml-0.5">Section {sIdx + 1} Title</label>
                                                        <input value={section.title} onChange={(e) => updatePolicySection(idx, sIdx, 'title', e.target.value)} placeholder="Section heading..." className="w-full bg-white border border-[#EDE4DC] rounded-lg px-4 py-2.5 text-[12px] font-medium text-[#462211] outline-none focus:ring-2 focus:ring-[#B3591C] placeholder:text-[#C4B5A8]" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-medium text-[#7A5648] uppercase tracking-normal ml-0.5">Content</label>
                                                        <textarea value={section.text} onChange={(e) => updatePolicySection(idx, sIdx, 'text', e.target.value)} placeholder="Section content..." className="w-full bg-white border border-[#EDE4DC] rounded-lg px-4 py-2.5 text-[12px] font-medium text-[#7A5648] h-24 outline-none focus:ring-2 focus:ring-[#B3591C] resize-none placeholder:text-[#C4B5A8]" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LayoutManager;

