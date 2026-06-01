import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, X, 
    Save, Image as ImageIcon,
    TrendingUp, Loader2, Upload,
    CheckCircle2, Video, Settings as SettingsIcon,
    PlusCircle, MinusCircle, Layout,
    MessageSquare, Users, Zap, ShieldCheck, ChevronRight
} from 'lucide-react';
import api from '../../shared/services/api';
import { openGallery } from '../../../../imageUploadUtils';

const BusinessContent = () => {
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showEcoModal, setShowEcoModal] = useState(false);
    const [ecoData, setEcoData] = useState({ ideaId: null, ideaTitle: '', cards: [] });
    const [submitting, setSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState(null);
    const [activePlanIdx, setActivePlanIdx] = useState(0);
    
    // Idea Form Data
    const [formData, setFormData] = useState({
        title: '',
        hindiTitle: '',
        bannerImage: '',
        potentialEarnings: '',
        desc: '',
        badges: ['Trending'],
        videoUrl: '',
        meetingLink: ''
    });

    // Subscription Settings Data (Multiple Plans)
    const [settingsData, setSettingsData] = useState({
        businessPlans: []
    });

    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchIdeas();
        fetchSettings();
    }, []);

    const fetchIdeas = async () => {
        try {
            const res = await api.get('/admin/business-ideas');
            if (res.success) setIdeas(res.data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            if (res.success) {
                setSettingsData({
                    businessPlans: res.data.businessPlans || []
                });
            }
        } catch (err) {
            console.error("Settings fetch error:", err);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const uploadData = new FormData();
        uploadData.append('file', file);
        setIsUploading(true);
        setUploadType(type);
        try {
            const res = await api.post('/admin/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.success) {
                setFormData(prev => ({ 
                    ...prev, 
                    [type === 'image' ? 'bannerImage' : 'videoUrl']: res.url 
                }));
            }
        } catch (err) {
            alert("Upload failed: " + (err.message || "Unknown error"));
        } finally {
            setIsUploading(false);
            setUploadType(null);
        }
    };

    const handleSaveIdea = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingId ? `/admin/business-ideas/${editingId}` : '/admin/business-ideas';
            const method = editingId ? 'put' : 'post';
            const payload = { ...formData, potentialEarnings: String(formData.potentialEarnings) };
            const res = await api[method](url, payload);
            if (res.success) {
                fetchIdeas();
                setShowModal(false);
                resetForm();
            }
        } catch (err) {
            alert("Error saving strategy: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveSettings = async () => {
        setSubmitting(true);
        try {
            // Filter out empty benefits to keep data clean
            const cleanedData = {
                ...settingsData,
                businessPlans: settingsData.businessPlans.map(plan => ({
                    ...plan,
                    benefits: plan.benefits.filter(b => b.title.trim() !== '')
                }))
            };
            const res = await api.put('/admin/settings', cleanedData);
            if (res.success) {
                alert("Subscription settings updated!");
                fetchSettings();
                setShowSettingsModal(false);
            }
        } catch (err) {
            alert("Failed to update settings: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveEco = async () => {
        setSubmitting(true);
        try {
            const res = await api.put(`/admin/business-ideas/${ecoData.ideaId}`, {
                ecosystemCards: ecoData.cards
            });
            if (res.success) {
                alert('Ecosystem content saved!');
                fetchIdeas();
                setShowEcoModal(false);
            }
        } catch (err) {
            alert('Failed to save ecosystem content');
        } finally {
            setSubmitting(false);
        }
    };

    const openEcoEditor = (idea) => {
        const defaultCards = [
            { id: 'daily-plan',    title: 'डेली प्लान',        description: '' },
            { id: 'new-updates',   title: 'न्यू अपडेट्स',       description: '' },
            { id: 'tools-contact', title: 'टूल्स एंड कांटेक्ट', description: '' },
            { id: 'calculation',   title: 'कैलकुलेशन',          description: '' }
        ];
        const cards = defaultCards.map(dc => {
            const existing = (idea.ecosystemCards || []).find(c => c.id === dc.id);
            return existing ? { ...dc, ...existing } : dc;
        });
        setEcoData({ ideaId: idea._id, ideaTitle: idea.title, cards });
        setShowEcoModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this strategy card?")) return;
        try {
            const res = await api.delete(`/admin/business-ideas/${id}`);
            if (res.success) fetchIdeas();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            hindiTitle: '',
            bannerImage: '',
            potentialEarnings: '',
            desc: '',
            badges: ['Trending'],
            videoUrl: '',
            meetingLink: ''
        });
        setEditingId(null);
    };

    const toggleBadge = (badge) => {
        setFormData(prev => ({
            ...prev,
            badges: prev.badges.includes(badge) 
                ? prev.badges.filter(b => b !== badge)
                : [...prev.badges, badge]
        }));
    };

    // Plan Management
    const addNewPlan = () => {
        const newPlan = {
            title: 'New Membership',
            subtitle: 'Plan description here...',
            price: 499,
            duration: '/ Monthly',
            durationInDays: 30,
            benefits: [{ title: '24/7 Support', subtitle: 'Premium Benefit unlocked', iconType: 'support', colorType: 'emerald' }]
        };
        setSettingsData(prev => ({
            ...prev,
            businessPlans: [...prev.businessPlans, newPlan]
        }));
        setActivePlanIdx(settingsData.businessPlans.length);
    };

    const updatePlanField = (idx, field, value) => {
        const newPlans = [...settingsData.businessPlans];
        newPlans[idx][field] = value;
        setSettingsData({ ...settingsData, businessPlans: newPlans });
    };

    const removePlan = (idx) => {
        if (!window.confirm("Delete this entire plan?")) return;
        const newPlans = settingsData.businessPlans.filter((_, i) => i !== idx);
        setSettingsData({ ...settingsData, businessPlans: newPlans });
        setActivePlanIdx(0);
    };

    // Benefit Management for active plan
    const addBenefit = (planIdx) => {
        const newPlans = [...settingsData.businessPlans];
        newPlans[planIdx].benefits = [
            ...newPlans[planIdx].benefits, 
            { title: '', subtitle: 'Premium Benefit unlocked', iconType: 'support', colorType: 'emerald' }
        ];
        setSettingsData({ ...settingsData, businessPlans: newPlans });
    };

    const updateBenefit = (planIdx, benefitIdx, field, value) => {
        const newPlans = [...settingsData.businessPlans];
        newPlans[planIdx].benefits[benefitIdx][field] = value;
        setSettingsData({ ...settingsData, businessPlans: newPlans });
    };

    const openEdit = (idea) => {
        setFormData({
            title: idea.title || '',
            hindiTitle: idea.hindiTitle || '',
            bannerImage: idea.bannerImage || '',
            potentialEarnings: idea.potentialEarnings || '',
            desc: idea.desc || '',
            badges: idea.badges && idea.badges.length > 0 ? idea.badges : ['Trending'],
            videoUrl: idea.videoUrl || '',
            meetingLink: idea.meetingLink || '',
            howItWorks: idea.howItWorks || '',
            investmentDetails: idea.investmentDetails || '',
            profitDetails: idea.profitDetails || ''
        });
        setEditingId(idea._id);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-inter">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-medium text-slate-900 tracking-tight">Business Hub Manager</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-normal mt-1">Manage Strategies & Plan Control</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowSettingsModal(true)}
                        className="bg-white text-slate-600 border border-slate-200 px-4 py-3 rounded-2xl font-medium text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Layout size={20} /> PLAN SETTINGS
                    </button>
                    <button 
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="bg-[#5D38F0] text-white px-4 py-3 rounded-2xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-[#4C2CD9] transition-all active:scale-95"
                    >
                        <Plus size={20} /> CREATE NEW CARD
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={40} className="text-[#5D38F0] animate-spin" />
                        <p className="font-medium text-slate-400 uppercase tracking-normal text-xs">Loading Hub Cards...</p>
                    </div>
                ) : (
                    ideas.map((idea) => (
                        <div key={idea._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {idea.bannerImage ? <img src={idea.bannerImage} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-200" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {(idea.badges || ['Trending']).map((b, i) => (
                                            <span key={i} className="text-[7px] font-medium bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded-full uppercase">{b}</span>
                                        ))}
                                    </div>
                                    <h3 className="font-medium text-slate-900 truncate leading-tight">{idea.title}</h3>
                                    <p className="text-[10px] font-medium text-indigo-600 uppercase mt-0.5">₹{idea.potentialEarnings}+ Monthly</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 line-clamp-2 leading-relaxed mb-6">{idea.desc}</p>
                            
                            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                <button onClick={() => openEdit(idea)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-medium text-[10px] uppercase tracking-normal hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"><Edit2 size={14} /> EDIT</button>
                                <button onClick={() => openEcoEditor(idea)} className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-xl font-medium text-[10px] uppercase tracking-normal hover:bg-amber-100 transition-all flex items-center justify-center gap-2"><Layout size={14} /> ECOSYSTEM</button>
                                <button onClick={() => handleDelete(idea._id)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-all"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Ecosystem Content Modal */}
            {showEcoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div>
                                <h2 className="text-xl font-medium text-slate-900 uppercase tracking-tight">Ecosystem Content</h2>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-normal mt-0.5">{ecoData.ideaTitle}</p>
                            </div>
                            <button onClick={() => setShowEcoModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {ecoData.cards.map((card, idx) => (
                                <div key={card.id} className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-medium text-[10px]">0{idx+1}</span>
                                        <input
                                            type="text"
                                            value={card.title}
                                            onChange={e => {
                                                const updated = [...ecoData.cards];
                                                updated[idx] = { ...updated[idx], title: e.target.value };
                                                setEcoData({ ...ecoData, cards: updated });
                                            }}
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Card Title"
                                        />
                                    </div>
                                    <textarea
                                        value={card.description}
                                        onChange={e => {
                                            const updated = [...ecoData.cards];
                                            updated[idx] = { ...updated[idx], description: e.target.value };
                                            setEcoData({ ...ecoData, cards: updated });
                                        }}
                                        rows={5}
                                        placeholder={`Full description for '${card.title}'...`}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                                    />
                                </div>
                            ))}
                            <button onClick={handleSaveEco} disabled={submitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SAVE ECOSYSTEM CONTENT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex h-[85vh]">
                        {/* Sidebar: Plan List */}
                        <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="mb-2">
                                <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Available Plans</h3>
                            </div>
                            {settingsData.businessPlans.map((plan, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setActivePlanIdx(idx)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${activePlanIdx === idx ? 'bg-white shadow-md border border-slate-100 ring-2 ring-indigo-500/20' : 'hover:bg-slate-100'}`}
                                >
                                    <div className="min-w-0">
                                        <p className={`font-medium text-xs truncate ${activePlanIdx === idx ? 'text-indigo-600' : 'text-slate-600'}`}>{plan.title || 'Untitled'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">₹{plan.price}{plan.duration}</p>
                                    </div>
                                    <ChevronRight size={14} className={activePlanIdx === idx ? 'text-indigo-500' : 'text-slate-300'} />
                                </button>
                            ))}
                            <button 
                                onClick={addNewPlan}
                                className="w-full mt-2 bg-indigo-50 text-indigo-600 p-4 rounded-2xl font-medium text-[10px] uppercase flex items-center justify-center gap-2 border border-indigo-100 border-dashed hover:bg-indigo-100 transition-all"
                            >
                                <Plus size={16} /> ADD NEW PLAN
                            </button>
                        </div>

                        {/* Content: Active Plan Settings */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                                <div>
                                    <h2 className="text-xl font-medium text-slate-900 uppercase tracking-tight">Customize Membership</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-normal mt-0.5">Edit title, price & duration</p>
                                </div>
                                <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><X size={20} /></button>
                            </div>

                            {settingsData.businessPlans.length > 0 ? (
                                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Plan Title</label>
                                            <input type="text" value={settingsData.businessPlans[activePlanIdx].title} onChange={(e) => updatePlanField(activePlanIdx, 'title', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Price (₹)</label>
                                            <input type="number" value={settingsData.businessPlans[activePlanIdx].price} onChange={(e) => updatePlanField(activePlanIdx, 'price', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-indigo-500 uppercase ml-1">Plan Duration</label>
                                            <input type="text" value={settingsData.businessPlans[activePlanIdx].duration} onChange={(e) => updatePlanField(activePlanIdx, 'duration', e.target.value)} placeholder="e.g. / Yearly" className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-indigo-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-emerald-500 uppercase ml-1">Duration (Days)</label>
                                            <input type="number" value={settingsData.businessPlans[activePlanIdx].durationInDays || 30} onChange={(e) => updatePlanField(activePlanIdx, 'durationInDays', parseInt(e.target.value))} className="w-full bg-emerald-50/30 border border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-600" />
                                        </div>
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Subheading</label>
                                            <textarea value={settingsData.businessPlans[activePlanIdx].subtitle} onChange={(e) => updatePlanField(activePlanIdx, 'subtitle', e.target.value)} rows="2" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Benefit Cards</label>
                                            <button onClick={() => addBenefit(activePlanIdx)} className="text-indigo-600 font-medium text-[10px] uppercase flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"><PlusCircle size={14} /> Add Benefit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {settingsData.businessPlans[activePlanIdx].benefits.map((benefit, bIdx) => (
                                                <div key={bIdx} className="bg-slate-50/50 border border-slate-100 p-5 rounded-xl space-y-3 relative group hover:bg-white hover:shadow-lg transition-all border-dashed">
                                                    <button onClick={() => {
                                                        const newBenefits = settingsData.businessPlans[activePlanIdx].benefits.filter((_, i) => i !== bIdx);
                                                        const newPlans = [...settingsData.businessPlans];
                                                        newPlans[activePlanIdx].benefits = newBenefits;
                                                        setSettingsData({ ...settingsData, businessPlans: newPlans });
                                                    }} className="absolute top-3 right-3 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><MinusCircle size={18} /></button>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="col-span-2 space-y-1">
                                                            <label className="text-[8px] font-medium text-slate-300 uppercase ml-1">Heading</label>
                                                            <input type="text" value={benefit.title} onChange={(e) => updateBenefit(activePlanIdx, bIdx, 'title', e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-medium text-slate-300 uppercase ml-1">Icon</label>
                                                            <select value={benefit.iconType || 'support'} onChange={(e) => updateBenefit(activePlanIdx, bIdx, 'iconType', e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-bold outline-none">
                                                                <option value="support">Chat</option>
                                                                <option value="meeting">Users</option>
                                                                <option value="zap">Zap</option>
                                                                <option value="shield">Shield</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-medium text-slate-300 uppercase ml-1">Color</label>
                                                            <select value={benefit.colorType || 'emerald'} onChange={(e) => updateBenefit(activePlanIdx, bIdx, 'colorType', e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-bold outline-none">
                                                                <option value="emerald">Emerald</option>
                                                                <option value="indigo">Indigo</option>
                                                                <option value="amber">Amber</option>
                                                                <option value="rose">Rose</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2 space-y-1">
                                                            <label className="text-[8px] font-medium text-slate-300 uppercase ml-1">Subheading</label>
                                                            <input type="text" value={benefit.subtitle} onChange={(e) => updateBenefit(activePlanIdx, bIdx, 'subtitle', e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-bold text-slate-400 outline-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-between gap-4">
                                        <button onClick={() => removePlan(activePlanIdx)} className="bg-rose-50 text-rose-500 px-4 py-4 rounded-2xl font-medium text-[10px] uppercase tracking-normal hover:bg-rose-100 transition-all flex items-center gap-2"><Trash2 size={16} /> DELETE PLAN</button>
                                        <button onClick={handleSaveSettings} disabled={submitting} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SAVE ALL CHANGES
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Layout size={40} className="opacity-20" />
                                    <p className="font-medium text-xs uppercase tracking-normal">No plans created yet</p>
                                    <button onClick={addNewPlan} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium text-[10px] uppercase">Create Your First Plan</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div>
                                <h2 className="text-xl font-medium text-slate-900 uppercase tracking-tight">{editingId ? 'Update Strategy' : 'Create Strategy'}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-normal mt-0.5">Configure card & support video</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveIdea} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Card Banner</label>
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-slate-50 border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                            {formData.bannerImage ? <img src={formData.bannerImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200" />}
                                        </div>
                                        <div 
                                            onClick={() => openGallery({
                                                onSelectFile: (file) => handleFileUpload({ target: { files: [file] } }, 'image')
                                            })}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 rounded-xl font-medium text-[9px] uppercase cursor-pointer hover:bg-slate-100 transition-all border border-slate-100"
                                        >
                                            {isUploading && uploadType === 'image' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} UPLOAD IMAGE
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-rose-500 uppercase tracking-normal ml-1">Support Video (YouTube URL)</label>
                                    <input
                                        type="url"
                                        value={formData.videoUrl}
                                        onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full bg-rose-50/30 border border-rose-100 rounded-xl px-4 py-3 text-sm font-bold outline-none text-rose-600 placeholder:text-rose-300 focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Heading</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Monthly Profit</label>
                                    <input type="text" value={formData.potentialEarnings} onChange={(e) => setFormData({...formData, potentialEarnings: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Description</label>
                                    <textarea value={formData.desc} onChange={(e) => setFormData({...formData, desc: e.target.value})} rows="2" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none" required />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Select Badges</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Trending', 'High Profit', 'New', 'Hot Deal', 'Low Budget'].map((badge) => (
                                            <button key={badge} type="button" onClick={() => toggleBadge(badge)} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-normal transition-all ${formData.badges.includes(badge) ? 'bg-[#5D38F0] text-white' : 'bg-slate-50 text-slate-400'}`}>{badge}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-medium text-indigo-500 uppercase tracking-normal ml-1">🔗 Meeting Link</label>
                                    <input
                                        type="url"
                                        value={formData.meetingLink}
                                        onChange={(e) => setFormData({...formData, meetingLink: e.target.value})}
                                        placeholder="https://meet.google.com/xxx-yyy-zzz"
                                        className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold outline-none text-indigo-600 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                                    <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-normal mb-2">Business Card Details</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-emerald-500 uppercase ml-1">How it Works (कैसे करें)</label>
                                            <textarea value={formData.howItWorks} onChange={(e) => setFormData({...formData, howItWorks: e.target.value})} rows="4" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none" placeholder="Explain the process step-by-step..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-amber-500 uppercase ml-1">Investment Details (इन्वेस्टमेंट)</label>
                                            <textarea value={formData.investmentDetails} onChange={(e) => setFormData({...formData, investmentDetails: e.target.value})} rows="4" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/10 resize-none" placeholder="Break down the costs..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-indigo-500 uppercase ml-1">Profit Details (प्रॉफ़िट)</label>
                                            <textarea value={formData.profitDetails} onChange={(e) => setFormData({...formData, profitDetails: e.target.value})} rows="4" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none" placeholder="Explain the potential earnings..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting || isUploading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-medium text-[12px] uppercase tracking-normal shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SAVE STRATEGY
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessContent;
