import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, MessageCircle, BookOpen, AlertCircle, Send, Loader2, ChevronDown } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';

const HelpCenter = () => {
    const navigate = useNavigate();
    const { addNotification } = useUser();
    
    const [problem, setProblem] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const [activeGuide, setActiveGuide] = useState(null);
    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const fetchGuides = async () => {
        setLoading(true);
        try {
            const res = await api.get('/public/content/menu_help_guides');
            if (res.success && res.data && res.data.data) {
                setGuides(res.data.data.sections || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchGuides();
    }, []);

    const handleSendReport = async () => {
        if (!problem.trim()) return;
        setIsSending(true);
        try {
            const res = await api.post('/user/data/reports', { message: problem });
            if (res.success) {
                setProblem('');
                setIsReportOpen(false);
                addNotification("Problem Reported!", "Our technical team will investigate soon.", "success");
            }
        } catch (err) {
            console.error(err);
            addNotification("Error", "Failed to send report. Try again.", "error");
        } finally {
            setIsSending(false);
        }
    };

    const handleWhatsApp = () => {
        const message = encodeURIComponent("Hello Dromoney Support, I need assistance.");
        window.open(`https://wa.me/919680947738?text=${message}`, '_blank');
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F1F9F3] font-poppins pb-24">
            {/* Ultra-Compact Header Row - Navy Blue Theme */}
            <div className="sticky top-0 z-40 shrink-0 bg-gradient-to-br from-[#0B1221] to-[#1E293B] rounded-b-3xl shadow-lg overflow-hidden flex items-center px-5 py-4 min-h-[72px]">
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none">
                    <BookOpen size={120} className="text-white" />
                </div>
                
                <div className="flex items-center gap-4 relative z-20 w-full">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-9 h-9 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-xl text-white active:scale-90 transition-all border border-white/10"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex flex-col">
                        <p className="text-blue-400 text-[8px] font-medium uppercase tracking-[0.2em] leading-none mb-1">
                            Support System
                        </p>
                        <h1 className="text-lg font-medium text-white tracking-tight leading-none uppercase">
                            Help Center
                        </h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 px-5 pt-8 flex flex-col justify-start gap-3">
                {/* 1. WhatsApp Support Compact Card */}
                <button 
                    onClick={handleWhatsApp}
                    className="w-full bg-white border border-emerald-100 rounded-[20px] p-3.5 shadow-sm flex items-center justify-between active:scale-95 transition-all group overflow-hidden relative shrink-0"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-500">
                            <MessageCircle size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-[13px] font-medium text-slate-800 leading-tight">WhatsApp Support</h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tight leading-tight">Instant Chat with Team</p>
                        </div>
                    </div>
                    <div className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center relative z-10 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                    </div>
                </button>

                {/* 2. Help Guide Compact Card */}
                <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="w-full bg-white border border-sky-100 rounded-[20px] p-3.5 shadow-sm flex items-center justify-between active:scale-95 transition-all group overflow-hidden relative shrink-0"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors text-sky-500">
                            <BookOpen size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-[13px] font-medium text-slate-800 leading-tight">Help Guide</h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tight leading-tight">Basic Platform Usage</p>
                        </div>
                    </div>
                    <div className="w-7 h-7 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center relative z-10 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                    </div>
                </button>

                {/* 3. Report Problem Compact Card */}
                <button 
                    onClick={() => setIsReportOpen(true)}
                    className="w-full bg-white border border-rose-100 rounded-[20px] p-3.5 shadow-sm flex items-center justify-between active:scale-95 transition-all group overflow-hidden relative shrink-0"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors text-rose-500">
                            <AlertCircle size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-[13px] font-medium text-slate-800 leading-tight">Report Problem</h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tight leading-tight">Technical Issues & Bugs</p>
                        </div>
                    </div>
                    <div className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center relative z-10 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                    </div>
                </button>
            </div>

            {/* --- Modals --- */}
            
            {/* Help Guide Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 flex items-end sm:items-center justify-center pb-[80px] sm:pb-0 ${isGuideOpen ? 'visible' : 'invisible'}`}>
                <div onClick={() => setIsGuideOpen(false)} className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isGuideOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className={`relative w-full sm:w-[92%] max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden transition-all duration-300 ease-out flex flex-col max-h-[85vh] ${isGuideOpen ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0'}`}>
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-100 text-sky-500 rounded-xl flex items-center justify-center">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-medium text-slate-800 uppercase tracking-tight leading-none">Help Guides</h2>
                                <p className="text-[10px] text-sky-500 font-medium uppercase mt-1">Platform instructions</p>
                            </div>
                        </div>
                        <button onClick={() => setIsGuideOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-full shadow-sm hover:text-slate-800">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {loading && <div className="text-center py-4 text-slate-300 animate-pulse">Loading guides...</div>}
                        {guides.map((guide, i) => (
                            <div key={i} className={`rounded-2xl transition-all duration-300 border ${activeGuide === i ? 'bg-sky-50/50 border-sky-100 p-4' : 'border-slate-100 p-4'}`}>
                                <button 
                                    onClick={() => setActiveGuide(activeGuide === i ? null : i)}
                                    className="w-full flex items-center justify-between text-left group"
                                >
                                    <span className={`text-[13px] font-medium transition-colors ${activeGuide === i ? 'text-sky-600' : 'text-slate-700'}`}>{guide.q}</span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 shrink-0 ml-4 ${activeGuide === i ? 'rotate-180 text-sky-500' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeGuide === i ? 'max-h-60 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-[12px] font-medium text-slate-500 leading-relaxed pt-3 border-t border-sky-100/50">{guide.a}</p>
                                </div>
                            </div>
                        ))}
                        {guides.length === 0 && !loading && (
                            <p className="text-center text-slate-400 text-xs font-medium py-10 uppercase tracking-normal">No guides available yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Problem Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 flex items-end sm:items-center justify-center pb-[80px] sm:pb-0 ${isReportOpen ? 'visible' : 'invisible'}`}>
                <div onClick={() => setIsReportOpen(false)} className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isReportOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className={`relative w-full sm:w-[92%] max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden transition-all duration-300 ease-out flex flex-col ${isReportOpen ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0'}`}>
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-medium text-slate-800 uppercase tracking-tight leading-none">Report Issue</h2>
                                <p className="text-[10px] text-rose-500 font-medium uppercase mt-1">Technical Support</p>
                            </div>
                        </div>
                        <button onClick={() => setIsReportOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-full shadow-sm hover:text-slate-800">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <textarea 
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="Describe your issue in detail..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-medium text-slate-700 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-400 resize-none h-36 outline-none"
                        />
                        <button 
                            onClick={handleSendReport}
                            disabled={!problem.trim() || isSending}
                            className={`w-full py-4 rounded-[20px] text-[12px] font-medium uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 active:scale-95
                                ${!problem.trim() || isSending ? 'bg-slate-100 text-slate-300' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-200'}`}
                        >
                            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {isSending ? 'Sending...' : 'Submit Report'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default HelpCenter;
