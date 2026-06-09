import React, { useState, useEffect } from 'react';
import { 
    Save, Plus, Trash2, FileText, Award, Download, Copy, AlertTriangle,
    ChevronRight, ChevronLeft, Sparkles, Loader2, UploadCloud, AlertCircle, BookOpen, Image as ImageIcon
} from 'lucide-react';
import api from '../../shared/services/api';
import { useAdmin } from '../context/AdminContext';

const DocumentsCMS = () => {
    const { addNotification } = useAdmin();
    const [activeCoursePage, setActiveCoursePage] = useState(1);
    const [loadingCourse, setLoadingCourse] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [courseData, setCourseData] = useState({
        page1: {
            title: '👉 Dromoney से कमाई कैसे करें',
            intro: 'Dromoney एक ऐसा platform है जहाँ आप सीखकर मात्र 15 मिनट मैं earning कर सकते हैं।\n\nयह कोई guaranteed income platform नहीं है — आपकी कमाई आपकी मेहनत ओर कंसिस्टेंसी पर depend करती है।',
            methodsTitle: '💰 कमाई के तरीके:',
            methods: []
        },
        page2: {
            title: '👉 Affiliate + Promotion Setup',
            steps: [],
            templatesTitle: '💎 Ready Templates (Copy-Paste)',
            templates: [],
            step5Title: '🔥 stap 5 : calling kra 🤳',
            step5Details: '',
            callScriptLink: '',
            logoUrl: ''
        },
        page3: {
            title: '👉 रोज क्या करें',
            dailyPlanTitle: '📅 Daily Plan:',
            dailyPlans: [],
            exampleTitle: '📊 Example:',
            examples: [],
            rulesTitle: '⚠️ Important Rules:',
            rules: []
        }
    });

    const fetchCourseData = async () => {
        setLoadingCourse(true);
        try {
            const res = await api.get('/public/content/onboarding_course');
            if (res.success && res.data && res.data.data) {
                setCourseData(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching onboarding course data:', err);
        } finally {
            setLoadingCourse(false);
        }
    };

    const handleUpdateCourse = async () => {
        try {
            const payload = {
                key: 'onboarding_course',
                title: 'Dromoney Onboarding Course',
                description: 'A 3-page earning system instruction course with templates and downloadable assets.',
                data: courseData
            };
            const res = await api.post('/admin/content', payload);
            if (res.success) {
                addNotification("Success", "Onboarding Course & Documents updated successfully!", "success");
            }
        } catch (err) {
            console.error('Error saving course content:', err);
            addNotification("Error", "Failed to save onboarding course.", "error");
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.success && res.url) {
                const nd = { ...courseData };
                nd.page2.logoUrl = res.url;
                setCourseData(nd);
                addNotification("Success", "Logo uploaded to Cloudinary successfully!", "success");
            } else {
                addNotification("Error", res.message || "Could not retrieve upload URL", "error");
            }
        } catch (err) {
            console.error("Upload error:", err);
            addNotification("Error", "Failed to upload image. Try pasting URL directly.", "error");
        } finally {
            setUploadingLogo(false);
        }
    };

    useEffect(() => {
        fetchCourseData();
    }, []);

    if (loadingCourse) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-sky-500" size={32} />
                <p className="text-[10px] font-medium uppercase tracking-normal text-slate-400">Loading Guidelines & Course Content...</p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-4 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-12">
                <div className="space-y-1">
                    <h1 className="text-4xl font-medium text-slate-900 tracking-tight uppercase">Guidelines & Docs</h1>
                    <p className="text-[12px] font-medium text-slate-400 uppercase tracking-normal flex items-center gap-2">
                        <FileText size={14} className="text-sky-500" /> Onboarding Guides, Templates & Downloadable Assets
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-24">
                {/* Course Editor Panel */}
                <div className="space-y-6">
                    {/* Course Pages Sub-Tabs */}
                    <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg border border-slate-100 shadow-sm w-fit">
                        {[1, 2, 3].map((pNum) => (
                            <button
                                key={pNum}
                                onClick={() => setActiveCoursePage(pNum)}
                                className={`px-5 py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-normal transition-all ${activeCoursePage === pNum ? 'bg-sky-500 text-white shadow-md font-medium scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Page {pNum} Editor
                            </button>
                        ))}
                    </div>

                    {/* Editor Block */}
                    <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center"><Award size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-800 tracking-tight uppercase">Onboarding Course Editor</h3>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-normal">Page {activeCoursePage} Content</p>
                                </div>
                            </div>
                            <button onClick={handleUpdateCourse} className="bg-slate-900 hover:bg-black text-white px-4 py-3.5 rounded-xl text-[10px] font-medium uppercase tracking-normal shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><Save size={14} /> Save Page Changes</button>
                        </div>

                        {/* PAGE 1 CONTENT EDITOR */}
                        {activeCoursePage === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Title (Hindi)</label>
                                    <input value={courseData.page1.title || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.title = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Introductory Text (Hindi)</label>
                                    <textarea value={courseData.page1.intro || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.intro = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-500 h-28 outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Methods Section Heading (Hindi)</label>
                                    <input value={courseData.page1.methodsTitle || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.methodsTitle = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                </div>

                                {/* Earning Methods List */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Earning Methods</label>
                                    {courseData.page1.methods?.map((method, mIdx) => (
                                        <div key={mIdx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative space-y-3">
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.methods.splice(mIdx, 1); setCourseData(nd);
                                            }} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                            
                                            <input value={method.title} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.methods[mIdx].title = e.target.value; setCourseData(nd);
                                            }} className="w-[85%] bg-white border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-700 outline-none rounded-xl" placeholder="Method Title" />
                                            
                                            {/* Bullet points under this method */}
                                            <div className="space-y-2 pl-3">
                                                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-normal">Bullet Points</label>
                                                {method.points?.map((point, pIdx) => (
                                                    <div key={pIdx} className="flex gap-2">
                                                        <input value={point} onChange={(e) => {
                                                            const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.methods[mIdx].points[pIdx] = e.target.value; setCourseData(nd);
                                                        }} className="flex-1 bg-white border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-500 outline-none rounded-lg" />
                                                        <button onClick={() => {
                                                            const nd = JSON.parse(JSON.stringify(courseData)); nd.page1.methods[mIdx].points.splice(pIdx, 1); setCourseData(nd);
                                                        }} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const nd = JSON.parse(JSON.stringify(courseData));
                                                    if (!nd.page1.methods[mIdx].points) nd.page1.methods[mIdx].points = [];
                                                    nd.page1.methods[mIdx].points.push('New Point text...');
                                                    setCourseData(nd);
                                                }} className="text-[10px] text-sky-500 font-medium uppercase tracking-normal">+ Add Point</button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page1.methods) nd.page1.methods = [];
                                        nd.page1.methods.push({ title: 'New Method Title', points: ['Point 1 details...'] });
                                        setCourseData(nd);
                                    }} className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-lg text-[11px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Earning Method</button>
                                </div>
                            </div>
                        )}

                        {/* PAGE 2 CONTENT EDITOR */}
                        {activeCoursePage === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Title (Hindi)</label>
                                    <input value={courseData.page2.title || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.title = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                </div>

                                {/* Download Assets Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-sky-50/40 rounded-xl border border-sky-100/60 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Brand Logo URL</label>
                                            {courseData.page2.logoUrl && (
                                                <a href={courseData.page2.logoUrl} target="_blank" rel="noreferrer" className="text-[9px] font-medium text-sky-500 hover:underline uppercase tracking-tight flex items-center gap-1">
                                                    View Current Logo
                                                </a>
                                            )}
                                        </div>
                                        
                                        <input value={courseData.page2.logoUrl || ''} onChange={(e) => {
                                            const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.logoUrl = e.target.value; setCourseData(nd);
                                        }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[11px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500" placeholder="https://res.cloudinary.com/..." />
                                        
                                        {/* File upload trigger */}
                                        <div 
                                            onClick={() => {
                                                if (!uploadingLogo) {
                                                    document.getElementById('logoInput').click();
                                                }
                                            }}
                                            className={`relative group/upload bg-white rounded-xl border-2 border-dashed border-slate-200 transition-all flex items-center justify-center py-2 px-4 shadow-sm z-10 ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500 cursor-pointer'}`}
                                        >
                                            <input type="file" id="logoInput" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e)} />
                                            <span className="text-[9px] font-medium uppercase tracking-normal text-slate-400 group-hover/upload:text-sky-500 flex items-center gap-1.5">
                                                {uploadingLogo ? (
                                                    <>
                                                        <Loader2 size={12} className="animate-spin text-sky-500" />
                                                        Uploading to Cloud...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud size={12} />
                                                        Upload New Logo File
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Call Script Doc Link</label>
                                        <input value={courseData.page2.callScriptLink || ''} onChange={(e) => {
                                            const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.callScriptLink = e.target.value; setCourseData(nd);
                                        }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[11px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500" placeholder="https://docs.google.com/..." />
                                        <p className="text-[9px] font-medium text-slate-400 leading-normal pl-1">
                                            Enter the full URL (Google Doc, PDF, etc.) that users will be redirected to when they click "View Calling Scripts" in Page 2.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 1 to Step 4 Timeline list */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Steps list (Timeline)</label>
                                    {courseData.page2.steps?.map((step, sIdx) => (
                                        <div key={sIdx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative space-y-3">
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.steps.splice(sIdx, 1); setCourseData(nd);
                                            }} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                <input value={step.stepNum} onChange={(e) => {
                                                    const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.steps[sIdx].stepNum = e.target.value; setCourseData(nd);
                                                }} className="bg-white border border-slate-200 px-3 py-2 text-[12px] font-medium text-orange-600 outline-none rounded-xl" placeholder="Step Num" />
                                                <input value={step.title} onChange={(e) => {
                                                    const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.steps[sIdx].title = e.target.value; setCourseData(nd);
                                                }} className="col-span-2 bg-white border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-800 outline-none rounded-xl" placeholder="Step Title" />
                                            </div>
                                            <textarea value={step.details} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.steps[sIdx].details = e.target.value; setCourseData(nd);
                                            }} className="w-full bg-white border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-500 h-16 outline-none rounded-xl resize-none" placeholder="Step description/Hindi guidelines" />
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page2.steps) nd.page2.steps = [];
                                        nd.page2.steps.push({ stepNum: `🔥 stap ${nd.page2.steps.length + 1}`, title: 'New Promotion Setup Step', details: 'Details...' });
                                        setCourseData(nd);
                                    }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Setup Step</button>
                                </div>

                                {/* Ready templates list */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <input value={courseData.page2.templatesTitle || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.templatesTitle = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500" />
                                    
                                    {courseData.page2.templates?.map((template, tIdx) => (
                                        <div key={tIdx} className="flex gap-2">
                                            <textarea value={template} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.templates[tIdx] = e.target.value; setCourseData(nd);
                                            }} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-600 outline-none focus:ring-2 focus:ring-sky-500 h-24 resize-none" />
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.templates.splice(tIdx, 1); setCourseData(nd);
                                            }} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page2.templates) nd.page2.templates = [];
                                        nd.page2.templates.push('🔥 New Template Description here...\n\nLink: [Your Link]');
                                        setCourseData(nd);
                                    }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Ready Template</button>
                                </div>

                                {/* Calling Step 5 */}
                                <div className="space-y-4 pt-4 border-t border-slate-50 p-4 bg-orange-50/20 rounded-xl border border-orange-100/50">
                                    <label className="text-[10px] font-medium text-orange-600 uppercase tracking-normal ml-1">Step 5: Calling Script block</label>
                                    <input value={courseData.page2.step5Title || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.step5Title = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-white border border-slate-200 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-800 outline-none" />
                                    <textarea value={courseData.page2.step5Details || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page2.step5Details = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-white border border-slate-200 rounded-lg px-5 py-4 text-[12px] font-medium text-slate-500 h-20 outline-none resize-none" />
                                </div>
                            </div>
                        )}

                        {/* PAGE 3 CONTENT EDITOR */}
                        {activeCoursePage === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-normal ml-1">Page Title (Hindi)</label>
                                    <input value={courseData.page3.title || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.title = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[14px] font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none" />
                                </div>

                                {/* Daily Plan List */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <input value={courseData.page3.dailyPlanTitle || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.dailyPlanTitle = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500" />
                                    
                                    {courseData.page3.dailyPlans?.map((plan, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input value={plan} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.dailyPlans[idx] = e.target.value; setCourseData(nd);
                                            }} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-600 outline-none" />
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.dailyPlans.splice(idx, 1); setCourseData(nd);
                                            }} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page3.dailyPlans) nd.page3.dailyPlans = [];
                                        nd.page3.dailyPlans.push('New daily task point...');
                                        setCourseData(nd);
                                    }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Daily Task Point</button>
                                </div>

                                {/* Examples Block */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <input value={courseData.page3.exampleTitle || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.exampleTitle = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-800 outline-none" />
                                    
                                    {courseData.page3.examples?.map((ex, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input value={ex} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.examples[idx] = e.target.value; setCourseData(nd);
                                            }} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-700 outline-none" />
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.examples.splice(idx, 1); setCourseData(nd);
                                            }} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page3.examples) nd.page3.examples = [];
                                        nd.page3.examples.push('➡️New Example equation...');
                                        setCourseData(nd);
                                    }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Example Equation</button>
                                </div>

                                {/* Important Rules */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <input value={courseData.page3.rulesTitle || ''} onChange={(e) => {
                                        const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.rulesTitle = e.target.value; setCourseData(nd);
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-[13px] font-medium text-slate-800 outline-none" />
                                    
                                    {courseData.page3.rules?.map((rule, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input value={rule} onChange={(e) => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.rules[idx] = e.target.value; setCourseData(nd);
                                            }} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium text-slate-600 outline-none" />
                                            <button onClick={() => {
                                                const nd = JSON.parse(JSON.stringify(courseData)); nd.page3.rules.splice(idx, 1); setCourseData(nd);
                                            }} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const nd = JSON.parse(JSON.stringify(courseData));
                                        if (!nd.page3.rules) nd.page3.rules = [];
                                        nd.page3.rules.push('Rule description in Hindi...');
                                        setCourseData(nd);
                                    }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-medium uppercase tracking-normal text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all">+ Add Rule</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* App Preview Simulation Panel */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-normal ml-4 flex items-center gap-2">User Course View Preview <ChevronRight size={12} /></h4>
                    
                    <div className="bg-slate-100 rounded-lg p-4 border-8 border-slate-200 shadow-2xl relative h-[720px] overflow-hidden flex flex-col scale-95 origin-top">
                        {/* Emulated Notch */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-50"></div>
                        
                        <div className="flex-1 bg-white rounded-lg overflow-hidden flex flex-col relative shadow-inner">
                            {/* Header */}
                            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 pt-7">
                                <div>
                                    <span className="text-[8px] font-medium text-sky-400 uppercase tracking-normal">Dromoney Onboarding</span>
                                    <h1 className="text-md font-medium tracking-tight leading-none mt-1">Earning Guide (Page {activeCoursePage}/3)</h1>
                                </div>
                                <div className="text-[10px] font-medium text-white/40 uppercase bg-white/5 border border-white/10 px-2 py-1 rounded-md">
                                    Step {activeCoursePage}
                                </div>
                            </div>

                            {/* Body Content */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-5 bg-slate-50 custom-scrollbar pb-16">
                                {activeCoursePage === 1 && (
                                    <div className="space-y-4">
                                        <h2 className="text-md font-medium text-slate-800 leading-snug">{courseData.page1.title}</h2>
                                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed whitespace-pre-wrap">{courseData.page1.intro}</p>
                                        
                                        <div className="bg-white rounded-lg border border-slate-100 p-4 shadow-sm space-y-4">
                                            <h3 className="text-[11px] font-medium text-slate-700 uppercase tracking-tight">{courseData.page1.methodsTitle}</h3>
                                            {courseData.page1.methods?.map((m, idx) => (
                                                <div key={idx} className="space-y-1 pb-2 border-b border-slate-50 last:border-none">
                                                    <h4 className="text-[11px] font-medium text-sky-600">{m.title}</h4>
                                                    {m.points?.map((p, pIdx) => (
                                                        <p key={pIdx} className="text-[10px] font-medium text-slate-400 pl-2">🔹 {p}</p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeCoursePage === 2 && (
                                    <div className="space-y-4">
                                        <h2 className="text-md font-medium text-slate-800 leading-snug">{courseData.page2.title}</h2>
                                        
                                        {/* Steps list */}
                                        <div className="space-y-3">
                                            {courseData.page2.steps?.map((step, idx) => (
                                                <div key={idx} className="bg-white rounded-lg border border-slate-100 p-3.5 shadow-sm space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-medium text-orange-500 uppercase tracking-normal">{step.stepNum}</span>
                                                        <h3 className="text-[11px] font-medium text-slate-800">{step.title}</h3>
                                                    </div>
                                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed whitespace-pre-wrap">{step.details}</p>
                                                    
                                                    {step.stepNum?.includes('Step 3') && (
                                                        <button className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg font-medium text-[9px] uppercase tracking-tight flex items-center justify-center gap-1">
                                                            <Download size={10} /> Download Logo to Gallery
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Step 5 */}
                                        <div className="bg-amber-50 rounded-lg border border-amber-100 p-4 space-y-2">
                                            <h3 className="text-[11px] font-medium text-amber-800 flex items-center gap-1"><AlertTriangle size={12} /> {courseData.page2.step5Title}</h3>
                                            <p className="text-[10px] font-medium text-slate-600 leading-relaxed">{courseData.page2.step5Details}</p>
                                            <button className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium text-[9px] uppercase tracking-normal flex items-center justify-center gap-1">
                                                <Download size={10} /> Download Call Script
                                            </button>
                                        </div>

                                        {/* Templates */}
                                        <div className="space-y-3">
                                            <h3 className="text-[11px] font-medium text-slate-700 uppercase tracking-normal">{courseData.page2.templatesTitle}</h3>
                                            {courseData.page2.templates?.map((t, idx) => (
                                                <div key={idx} className="bg-slate-100 rounded-xl p-3 border border-slate-200 relative">
                                                    <p className="text-[10px] font-medium text-slate-500 whitespace-pre-wrap">{t}</p>
                                                    <button className="absolute top-2.5 right-2.5 w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sky-500 shadow-sm"><Copy size={10} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeCoursePage === 3 && (
                                    <div className="space-y-4 animate-in fade-in">
                                        <h2 className="text-md font-medium text-slate-800 leading-snug">{courseData.page3.title}</h2>
                                        
                                        {/* Daily Plan */}
                                        <div className="bg-white rounded-lg border border-slate-100 p-4 shadow-sm space-y-2">
                                            <h3 className="text-[11px] font-medium text-slate-700 uppercase tracking-tight">{courseData.page3.dailyPlanTitle}</h3>
                                            {courseData.page3.dailyPlans?.map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500"><BookOpen size={8} /></div>
                                                    <span className="text-[10px] font-medium text-slate-500">{p}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Example */}
                                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-lg p-4 shadow-md text-white space-y-2 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg"></div>
                                            <h3 className="text-[11px] font-medium text-sky-400 uppercase tracking-tight">{courseData.page3.exampleTitle}</h3>
                                            {courseData.page3.examples?.map((ex, idx) => (
                                                <p key={idx} className="text-[11px] font-medium whitespace-pre-wrap">{ex}</p>
                                            ))}
                                        </div>

                                        {/* Rules */}
                                        <div className="bg-rose-50/50 rounded-lg border border-rose-100 p-4 space-y-2">
                                            <h3 className="text-[11px] font-medium text-rose-800 flex items-center gap-1 uppercase tracking-tight"><AlertCircle size={12} /> {courseData.page3.rulesTitle}</h3>
                                            {courseData.page3.rules?.map((rule, idx) => (
                                                <p key={idx} className="text-[10px] font-medium text-slate-600 leading-tight">🛑 {rule}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer buttons simulation */}
                            <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-100 p-3.5 flex justify-between gap-3 z-20">
                                {activeCoursePage > 1 ? (
                                    <button className="flex-1 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 font-medium text-[10px] uppercase tracking-normal rounded-xl flex items-center justify-center gap-1">
                                        <ChevronLeft size={12} /> Prev
                                    </button>
                                ) : (
                                    <div className="flex-1"></div>
                                )}
                                
                                {activeCoursePage < 3 ? (
                                    <button className="flex-1 py-2.5 bg-slate-900 text-white font-medium text-[10px] uppercase tracking-normal rounded-xl flex items-center justify-center gap-1">
                                        Next <ChevronRight size={12} />
                                    </button>
                                ) : (
                                    <button className="flex-1 py-2.5 bg-emerald-500 text-white font-medium text-[10px] uppercase tracking-normal rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-100">
                                        Finish <Sparkles size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsCMS;
