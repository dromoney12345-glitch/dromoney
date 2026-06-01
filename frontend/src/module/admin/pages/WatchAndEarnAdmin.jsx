import React, { useState, useEffect } from 'react';
import { MonitorPlay, Plus, Trash2, Clock, Coins, X, Link as LinkIcon, Edit3, Image as ImageIcon, Video, CheckCircle2, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../../shared/services/api';
import { openGallery } from '../../../imageUploadUtils';

const WatchAndEarnAdmin = () => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [adForm, setAdForm] = useState({
        title: '',
        coins: '',
        duration: '',
        thumbnail: '',
        videoUrl: ''
    });
    const [introVideo, setIntroVideo] = useState({
        title: 'Welcome to Drowmoney',
        subtitle: 'Watch our guide to start earning today!',
        videoUrl: '',
        thumbnailUrl: '',
        isActive: true
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('campaigns');

    const handleFileUpload = async (e, type, target) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        setIsUploading(true);
        try {
            const res = await api.post('/admin/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.success) {
                if (type === 'intro') {
                    setIntroVideo(prev => ({ 
                        ...prev, 
                        [target === 'video' ? 'videoUrl' : 'thumbnailUrl']: res.url 
                    }));
                } else {
                    setAdForm(prev => ({ 
                        ...prev, 
                        [target === 'video' ? 'videoUrl' : 'thumbnail']: res.url 
                    }));
                }
            }
        } catch (err) {
            alert("Upload failed: " + (err.message || "Unknown error"));
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        fetchAds();
        fetchIntroVideo();
    }, []);

    const fetchIntroVideo = async () => {
        try {
            const res = await api.get('/public/content/platform_intro_video');
            if (res.success && res.data && res.data.data) {
                const d = res.data.data;
                setIntroVideo({
                    title: d.title || '',
                    subtitle: d.subtitle || '',
                    videoUrl: d.videoUrl || '',
                    thumbnailUrl: d.thumbnailUrl || '',
                    isActive: d.isActive ?? true
                });
            }
        } catch (err) {
            console.error('Error fetching intro video:', err);
        }
    };

    const handleSaveIntro = async () => {
        setIsProcessing(true);
        try {
            const payload = {
                key: 'platform_intro_video',
                title: 'Platform Intro Video',
                data: introVideo
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) alert("Intro Video Updated Successfully!");
        } catch (err) {
            alert("Failed to update intro video.");
        } finally {
            setIsProcessing(false);
        }
    };

    const fetchAds = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/ads');
            if (response.success) {
                const mapped = response.data.map(a => ({
                    id: a._id,
                    title: a.title,
                    coins: a.coinsReward,
                    duration: a.duration,
                    thumbnail: a.thumbnailUrl,
                    videoUrl: a.videoUrl
                }));
                setAds(mapped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this ad?")) {
            try {
                const response = await api.delete(`/admin/ads/${id}`);
                if (response.success) fetchAds();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleEdit = (ad) => {
        setAdForm({
            title: ad.title || '',
            coins: ad.coins || '',
            duration: ad.duration || '',
            thumbnail: ad.thumbnail || '',
            videoUrl: ad.videoUrl || ''
        });
        setEditId(ad.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditId(null);
        setAdForm({ title: '', coins: '', duration: '', thumbnail: '', videoUrl: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Ensure values are not undefined
        const payload = {
            title: adForm.title.trim(),
            thumbnailUrl: adForm.thumbnail,
            videoUrl: adForm.videoUrl,
            coinsReward: Number(adForm.coins) || 0,
            duration: Number(adForm.duration) || 0
        };

        if (!payload.title || !payload.thumbnailUrl || !payload.videoUrl || !payload.coinsReward || !payload.duration) {
            alert("Please fill all fields correctly");
            return;
        }

        if (payload.duration < 30 || payload.duration > 60) {
            alert("Video watch duration must be between 30 and 60 seconds.");
            return;
        }

        try {
            if (editId) {
                await api.put(`/admin/ads/${editId}`, payload);
                alert("Campaign updated successfully!");
            } else {
                await api.post('/admin/ads', payload);
                alert("New campaign published successfully!");
            }
            fetchAds();
            handleCloseModal();
        } catch (err) {
            alert("Action failed: " + (err.response?.data?.message || err.message || "Unknown error"));
        }
    };

    return (
        <div className="p-6 animate-in fade-in duration-500 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <PageHeader 
                    title="Watch & Earn Engine" 
                    subtitle="Manage platform-wide video campaigns and dashboard intro content" 
                />
                
                {/* Custom Tab Switcher */}
                <div className="bg-slate-100 p-1.5 rounded-[22px] flex items-center gap-1 self-start shadow-inner">
                    <button 
                        onClick={() => setActiveTab('campaigns')}
                        className={`px-6 py-3 rounded-[18px] text-[11px] font-medium uppercase tracking-normal transition-all ${activeTab === 'campaigns' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Ad Campaigns
                    </button>
                    <button 
                        onClick={() => setActiveTab('intro')}
                        className={`px-6 py-3 rounded-[18px] text-[11px] font-medium uppercase tracking-normal transition-all ${activeTab === 'intro' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Platform Intro
                    </button>
                </div>
            </div>

            {activeTab === 'intro' ? (
                /* --- Tab 1: Intro Video Settings --- */
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#0F172A] rounded-2xl p-6 shadow-2xl relative overflow-hidden group border border-slate-800">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-16">
                            <div className="space-y-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                                        <MonitorPlay size={32} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-medium text-white tracking-tight uppercase leading-none">Home Dashboard Intro</h3>
                                        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-normal mt-2">Manage the video users see on their home screen</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.25em] ml-1">Card Heading</label>
                                            <input value={introVideo.title} onChange={(e) => setIntroVideo({...introVideo, title: e.target.value})} className="w-full bg-white/5 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.25em] ml-1">Card Subtitle</label>
                                            <input value={introVideo.subtitle} onChange={(e) => setIntroVideo({...introVideo, subtitle: e.target.value})} className="w-full bg-white/5 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all outline-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.25em] ml-1">Direct Video URL (.mp4)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"><LinkIcon size={18} /></div>
                                            <input value={introVideo.videoUrl} onChange={(e) => setIntroVideo({...introVideo, videoUrl: e.target.value})} className="w-full bg-white/5 border border-slate-800 rounded-2xl py-4 pr-4 pl-12 pl-12-override text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all outline-none" placeholder="https://..." />
                                        </div>
                                        <div className="absolute right-2 top-[38px]">
                                             <input 
                                                 type="file" 
                                                 id="intro-video-upload" 
                                                 className="hidden" 
                                                 accept="video/*"
                                                 onChange={(e) => handleFileUpload(e, 'intro', 'video')}
                                             />
                                             <label 
                                                 htmlFor="intro-video-upload"
                                                 className={`h-[44px] px-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-normal cursor-pointer transition-all ${isUploading ? 'bg-slate-800 text-slate-600' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20'}`}
                                             >
                                                 {isUploading ? '...' : <><Video size={14} /> Upload Video</>}
                                             </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.25em] ml-1">Thumbnail Preview URL</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"><ImageIcon size={18} /></div>
                                                <input value={introVideo.thumbnailUrl} onChange={(e) => setIntroVideo({...introVideo, thumbnailUrl: e.target.value})} className="w-full bg-white/5 border border-slate-800 rounded-2xl py-4 pr-4 pl-12 pl-12-override text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all outline-none" placeholder="https://..." />
                                            </div>
                                            <div className="relative">
                                                <div 
                                                    onClick={() => !isUploading && openGallery({
                                                        onSelectFile: (file) => handleFileUpload({ target: { files: [file] } }, 'intro', 'thumbnail')
                                                    })}
                                                    className={`h-[54px] px-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-normal cursor-pointer transition-all ${isUploading ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20 border border-slate-700'}`}
                                                >
                                                    {isUploading ? '...' : <><Plus size={16} /> Upload</>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-[30px] border border-slate-800 mt-4 group/toggle transition-all hover:bg-white/[0.08]">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${introVideo.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                <Video size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-[12px] font-medium text-white uppercase tracking-normal">Dashboard Visibility</h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 max-w-[200px]">When active, this video replaces the Future Fund card on user dashboard.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIntroVideo({...introVideo, isActive: !introVideo.isActive})}
                                            className={`w-16 h-9 rounded-full transition-all relative p-1 ${introVideo.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-md ${introVideo.isActive ? 'translate-x-7' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSaveIntro}
                                        disabled={isProcessing}
                                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white font-medium uppercase tracking-[0.3em] py-3 rounded-[28px] shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 mt-6 text-sm"
                                    >
                                        {isProcessing ? 'Synchronizing...' : <><Save size={22} strokeWidth={2.5} /> Update Platform Config</>}
                                    </button>
                                </div>
                            </div>

                            {/* Preview Side */}
                            <div className="flex flex-col justify-center items-center text-center space-y-8 bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                                <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-[0.6em] animate-pulse">Device Preview</span>
                                <div className="w-[300px] h-[580px] bg-white rounded-[60px] p-5 border-[12px] border-slate-900 shadow-[0_0_80px_rgba(79,70,229,0.15)] relative overflow-hidden flex flex-col group/preview transition-transform hover:rotate-1">
                                    {/* Phone Header Mock */}
                                    <div className="flex justify-between items-center mb-10 px-2 opacity-50">
                                        <div className="flex gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div></div>
                                        <div className="w-16 h-5 rounded-full bg-slate-200"></div>
                                    </div>
                                    
                                    <div className="flex-1 bg-slate-50/50 rounded-[45px] flex flex-col p-5">
                                        {introVideo.isActive ? (
                                            <div className="w-full h-44 bg-slate-900 rounded-2xl relative overflow-hidden shadow-2xl border-4 border-white animate-in zoom-in duration-500">
                                                <img src={introVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80'} className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl shadow-black/20 transform group-hover/preview:scale-110 transition-transform">
                                                        <Video size={28} className="text-slate-900 fill-slate-900/10" />
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-4 left-0 right-0 px-4 text-center">
                                                    <div className="h-2 bg-white/20 w-1/2 mx-auto rounded-full"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-44 bg-slate-200/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 space-y-2 text-center px-4">
                                                <X size={32} className="opacity-20 mb-2" />
                                                <p className="font-medium text-[9px] uppercase tracking-normal opacity-40">Intro Card is Disabled</p>
                                            </div>
                                        )}
                                        
                                        <div className="mt-8 space-y-4 px-2">
                                            <div className="h-4 bg-slate-200 w-full rounded-xl opacity-40"></div>
                                            <div className="h-4 bg-slate-200 w-5/6 rounded-xl opacity-40"></div>
                                            <div className="grid grid-cols-3 gap-3 mt-8">
                                                <div className="aspect-square bg-slate-200 rounded-2xl opacity-40"></div>
                                                <div className="aspect-square bg-slate-200 rounded-2xl opacity-40"></div>
                                                <div className="aspect-square bg-slate-200 rounded-2xl opacity-40"></div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Home Bar */}
                                    <div className="w-24 h-1 bg-slate-200 rounded-full mx-auto mt-6 opacity-40"></div>
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-normal leading-relaxed">Live Mobile Dashboard Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* --- Tab 2: Campaigns Manager --- */
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div>
                            <h3 className="text-xl font-medium text-slate-800 tracking-tight uppercase mb-1">Active Ad Campaigns</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-normal">Total {ads.length} campaigns running globally</p>
                        </div>
                        <button 
                            onClick={() => {
                                setEditId(null);
                                setAdForm({ title: '', coins: '', duration: '', thumbnail: '', videoUrl: '' });
                                setIsModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-slate-900 text-white font-medium px-8 py-4 rounded-[22px] shadow-xl shadow-indigo-100 transition-all flex items-center gap-3 active:scale-95 text-xs uppercase tracking-normal"
                        >
                            <Plus size={20} strokeWidth={3} /> Launch New Ad
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ads.map((ad) => (
                            <div key={ad.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:translate-y-[-4px] transition-all group relative">
                                <div className="h-48 relative">
                                    <img src={ad.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80'} alt={ad.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-[10px] font-medium text-white uppercase tracking-normal w-fit">
                                                {ad.duration} Seconds
                                            </div>
                                            <h3 className="font-medium text-white text-xl uppercase tracking-tight">{ad.title}</h3>
                                        </div>
                                        <div className="bg-amber-500 text-white font-medium px-4 py-2 rounded-2xl text-[13px] flex items-center gap-1.5 shadow-xl shadow-amber-500/20">
                                            <Coins size={16} className="fill-white/20" /> +{ad.coins}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                <Video size={16} />
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500 truncate">{ad.videoUrl}</p>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-normal">Active & Earning</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleEdit(ad)}
                                            className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-medium text-[11px] uppercase tracking-normal py-4 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-200"
                                        >
                                            <Edit3 size={16} /> Configure
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(ad.id)}
                                            className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Ad Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                                    <MonitorPlay size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-slate-800 uppercase tracking-tight leading-none">{editId ? 'Modify Campaign' : 'Initialize Campaign'}</h3>
                                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-normal mt-2">{editId ? 'Update existing ad task' : 'Set coins and watch duration'}</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 bg-white text-slate-400 hover:text-slate-800 hover:shadow-md rounded-2xl transition-all flex items-center justify-center shadow-sm"><X size={30}/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Campaign Title</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="Enter ad campaign name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[22px] p-5 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all outline-none"
                                    value={adForm.title || ''}
                                    onChange={(e) => setAdForm(prev => ({...prev, title: e.target.value}))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Reward (Coins)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500"><Coins size={20}/></div>
                                        <input 
                                            required
                                            type="number"
                                            placeholder="50"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[22px] py-3 pr-5 pl-14 pl-14-override text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                            value={adForm.coins || ''}
                                            onChange={(e) => setAdForm(prev => ({...prev, coins: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Duration (Sec)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500"><Clock size={20}/></div>
                                        <input 
                                            required
                                            type="number"
                                            min="30"
                                            max="60"
                                            placeholder="30"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[22px] py-3 pr-5 pl-14 pl-14-override text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                            value={adForm.duration || ''}
                                            onChange={(e) => setAdForm(prev => ({...prev, duration: e.target.value}))}
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide ml-1">Must be between 30 and 60 seconds</p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start">
                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Thumbnail Overlay</label>
                                        <div className="flex gap-2">
                                            <input 
                                                required
                                                type="url"
                                                placeholder="Paste image link..."
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-[22px] p-5 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all outline-none"
                                                value={adForm.thumbnail || ''}
                                                onChange={(e) => setAdForm(prev => ({...prev, thumbnail: e.target.value}))}
                                            />
                                            <div className="relative">
                                                <div 
                                                    onClick={() => !isUploading && openGallery({
                                                        onSelectFile: (file) => handleFileUpload({ target: { files: [file] } }, 'ad', 'thumbnail')
                                                    })}
                                                    className={`h-[62px] px-5 rounded-[22px] flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-normal cursor-pointer transition-all ${isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'}`}
                                                >
                                                    {isUploading ? '...' : <><ImageIcon size={14} /> Upload</>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Video Source URL (YouTube/Direct Link)</label>
                                        <input 
                                            required
                                            type="url"
                                            placeholder="Paste video link here..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[22px] p-5 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all outline-none"
                                            value={adForm.videoUrl || ''}
                                            onChange={(e) => setAdForm(prev => ({...prev, videoUrl: e.target.value}))}
                                        />
                                    </div>
                                </div>

                                {adForm.thumbnail && (
                                    <div className="w-32 space-y-2 animate-in zoom-in-90 duration-300">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal block text-center">Preview</label>
                                        <div className="aspect-square rounded-[22px] overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50">
                                            <img src={adForm.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center pt-2">
                                <button 
                                    type="submit"
                                    className="px-12 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-indigo-600 hover:to-violet-600 text-white font-medium text-[11px] uppercase tracking-[0.3em] rounded-[22px] shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                                >
                                    {editId ? 'Apply Changes' : 'Launch Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchAndEarnAdmin;
