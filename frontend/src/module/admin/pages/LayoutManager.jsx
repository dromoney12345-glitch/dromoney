import React, { useState, useEffect } from 'react';
import { 
    Save, Plus, Trash2, Layout, FileText, 
    Shield, ShieldCheck, BookOpen, AlertCircle,
    Award, HelpCircle, Download, Copy, AlertTriangle,
    ChevronRight, ChevronLeft, Link2, Sparkles, Star,
    Loader2, UploadCloud
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
            id: 2, label: 'Daily Tasks', headline: 'COLLECT REWARD COINS', dbKey: 'menu_layout_tasks',
            steps: [
                { title: 'COMPLETE TASKS', desc: 'रोजाना simple tasks को पूरा करें और reward coins earn करें।' },
                { title: 'REDEEM FOR CASH', desc: 'इन coins को आप बाद में real cash में convert kar sakte hain।' }
            ]
        },
        {
            id: 3, label: 'Future Fund', headline: 'PASSIVE INCOME SECURITY', dbKey: 'menu_layout_fund',
            steps: [
                { title: 'PLATFORM STAKE', desc: 'एक बार eligible होने पर, आपको platform के profits में हिस्सा मिलेगा।' },
                { title: 'MONTHLY PAYOUTS', desc: 'Profit share har mahine aapke wallet mein auto-credit hoga.' }
            ]
        },
        {
            id: 4, label: 'Events & Contests', headline: 'WIN BIG PRIZES', dbKey: 'menu_layout_events',
            steps: [
                { title: 'WEEKLY CONTESTS', desc: 'Har hafte naye Exciting Events live hote hain, jo limited time ke liye hote hain.' },
                { title: 'MEGA JACKPOTS', desc: 'Contests mein bhag lekar aap ₹500 tak ka instant cash aur exciting prizes jeet sakte hain।' },
                { title: 'LEADERBOARD REWARDS', desc: 'Top earners ko special bonuses aur verification badges diye jaate hain।' }
            ]
        },
    ]);

    const [footerPolicies, setFooterPolicies] = useState([
        {
            id: 1, label: 'Privacy Policy', path: '/user/info/privacy', dbKey: 'menu_privacy',
            content: "", icon: Shield, color: 'text-sky-500'
        },
        {
            id: 3, label: 'Terms & Conditions', path: '/user/info/terms', dbKey: 'menu_terms',
            content: "", icon: ShieldCheck, color: 'text-amber-500'
        },
        {
            id: 4, label: 'User Guidelines', path: '/user/info/guidelines', dbKey: 'menu_guidelines',
            content: "", icon: BookOpen, color: 'text-emerald-500'
        },
        {
            id: 5, label: 'No Refund Policy', path: '/user/info/refund-policy', dbKey: 'menu_refund_policy',
            content: "", icon: AlertCircle, color: 'text-rose-500'
        },
        {
            id: 6, label: 'Future and Option', path: '/user/info/future-features', dbKey: 'menu_future_features',
            content: "", icon: Sparkles, color: 'text-indigo-500'
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
                        const fullText = item.data.sections ? item.data.sections.map(s => `${s.title}: ${s.text}`).join('\n\n') : item.data.content || "";
                        policy.content = fullText;
                        policy.label = item.data.title || policy.label;
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
            const draftSections = policy.content.split('\n\n').map(p => {
                const parts = p.split(': ');
                return {
                    title: parts[0] || 'Detail',
                    text: parts[1] || p
                };
            });

            const payload = {
                key: policy.dbKey,
                title: policy.label,
                data: {
                    title: policy.label,
                    subtitle: 'Legal Policy',
                    sections: draftSections
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

    // ── Onboarding Course CMS Actions ──

    useEffect(() => {
        fetchNavbarSections();
        fetchFooterPolicies();
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
        <div className="p-4 lg:p-4 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-12">
                <div className="space-y-1">
                    <h1 className="text-4xl font-medium text-slate-900 tracking-tight uppercase">Layout Manager</h1>
                    <p className="text-[12px] font-medium text-slate-400 uppercase tracking-normal flex items-center gap-2">
                        <Layout size={14} className="text-sky-500" /> System UI & Onboarding Course CMS
                    </p>
                </div>

                <div className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm flex flex-wrap gap-1">
                    <button 
                        onClick={() => setActiveTab('navbar')}
                        className={`px-6 py-3 rounded-lg text-[10px] font-medium uppercase tracking-normal transition-all ${activeTab === 'navbar' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        Section Content
                    </button>
                    <button 
                        onClick={() => setActiveTab('footer')}
                        className={`px-6 py-3 rounded-lg text-[10px] font-medium uppercase tracking-normal transition-all ${activeTab === 'footer' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        Footer & Policies
                    </button>
                </div>
            </div>

            {/* TAB: SECTION CONTENT (NAVBAR) */}
            {activeTab === 'navbar' && (
                <div className="space-y-12 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                    {navbarSections.map((section, sIdx) => (
                        <div key={section.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 group overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-8 border-b border-slate-50">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-slate-900 text-sky-400 rounded-lg flex items-center justify-center font-medium text-xl shadow-xl">{section.id}</div>
                                    <div className="space-y-1">
                                        <input type="text" value={section.label} onChange={(e) => {
                                            const ns = [...navbarSections]; ns[sIdx].label = e.target.value; setNavbarSections(ns);
                                        }} className="text-xl font-medium text-slate-800 uppercase tracking-tight bg-transparent border-none p-0 outline-none w-full" />
                                        <input type="text" value={section.headline} onChange={(e) => {
                                            const ns = [...navbarSections]; ns[sIdx].headline = e.target.value; setNavbarSections(ns);
                                        }} className="text-[12px] font-medium text-sky-600 uppercase tracking-normal bg-transparent border-none p-0 outline-none w-full" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUpdateSection(section)}
                                    className="flex items-center gap-2 bg-[#0F172A] text-white px-8 py-4 rounded-lg font-medium text-[11px] uppercase tracking-normal shadow-xl hover:bg-black transition-all"
                                >
                                    <Save size={16} /> Update Section
                                </button>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                                {section.steps.map((step, stepIdx) => (
                                    <div key={stepIdx} className="min-w-[340px] bg-slate-50/50 border border-slate-100 rounded-lg p-7 snap-center group/card transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-100 relative">
                                        <button onClick={() => deleteStep(sIdx, stepIdx)} className="absolute top-6 right-6 w-9 h-9 bg-white text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm border border-slate-100">
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Step {stepIdx + 1} Title</label>
                                                <input value={step.title} onChange={(e) => {
                                                    const ns = [...navbarSections]; ns[sIdx].steps[stepIdx].title = e.target.value; setNavbarSections(ns);
                                                }} className="w-full bg-white border border-slate-100 rounded-lg px-5 py-4 text-[12px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500 shadow-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Instructions (Hindi)</label>
                                                <textarea value={step.desc} onChange={(e) => {
                                                    const ns = [...navbarSections]; ns[sIdx].steps[stepIdx].desc = e.target.value; setNavbarSections(ns);
                                                }} className="w-full bg-white border border-slate-100 rounded-lg px-5 py-4 text-[12px] font-medium text-slate-500 h-28 outline-none focus:ring-2 focus:ring-sky-500 resize-none shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addStep(sIdx)} className="min-w-[200px] bg-slate-50/30 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-slate-300 hover:text-sky-500 group/plus">
                                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-lg group-hover/plus:scale-110 transition-transform"><Plus size={24} /></div>
                                    <span className="text-[11px] font-medium uppercase tracking-normal">Add New Step</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB: FOOTER & POLICIES (MERGED) */}
            {activeTab === 'footer' && (
                <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 gap-4">
                        {footerPolicies.map((item, idx) => (
                            <div key={item.id} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden p-4 group">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex-1 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-4 rounded-lg bg-slate-50 ${item.color}`}><item.icon size={28} /></div>
                                            <div>
                                                <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">{item.label}</h3>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-normal mt-0.5">Edit path and page content</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-50 space-y-4">
                                            <div>
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal ml-1 mb-2 block">Link Display Label</label>
                                                <input value={item.label} onChange={(e) => {
                                                    const nf = [...footerPolicies]; nf[idx].label = e.target.value; setFooterPolicies(nf);
                                                }} className="w-full bg-white border border-slate-100 rounded-xl px-5 py-4 text-[13px] font-medium text-slate-800 outline-none shadow-sm focus:ring-2 focus:ring-sky-500" />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleUpdatePolicy(item)}
                                            className="lg:flex items-center gap-3 bg-[#0F172A] text-white px-8 py-4 rounded-lg font-medium text-[11px] uppercase tracking-normal shadow-xl hover:bg-[#1E293B] transition-all w-full justify-center"
                                        >
                                            <Save size={16} /> Update {item.label} Data
                                        </button>
                                    </div>

                                    <div className="flex-[1.5] space-y-3">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal flex items-center gap-2"><FileText size={14} /> Page Content Editor</label>
                                            <span className="text-[10px] font-medium text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-normal">Live Preview</span>
                                        </div>
                                        <textarea
                                            value={item.content}
                                            onChange={(e) => {
                                                const nf = [...footerPolicies]; nf[idx].content = e.target.value; setFooterPolicies(nf);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-4 text-[13px] font-medium text-slate-700 h-[220px] outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all resize-none shadow-inner"
                                            placeholder={`Write full text for ${item.label}...`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LayoutManager;

