import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, BookOpen, AlertCircle, Send, CheckCircle2, Loader2, Sparkles, ChevronDown } from 'lucide-react';
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
        const message = encodeURIComponent("Hello Drowmoney Support, I need assistance.");
        window.open(`https://wa.me/919680947738?text=${message}`, '_blank');
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F1F9F3] pb-20 relative overflow-hidden">
            {/* Ultra-Compact Header Row - Navy Blue Theme */}
            <div className="relative h-20 bg-gradient-to-br from-[#0B1221] to-[#1E293B] rounded-b-3xl shadow-lg overflow-hidden mb-4 flex items-center px-5">
                {/* Decorative Elements */}
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] pointer-events-none">
                    <BookOpen size={120} className="text-white" />
                </div>
                
                {/* Compact Row: Back + Title */}
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

            <div className="flex-1 p-5 space-y-6">
                {/* 1. WhatsApp Support */}
                <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0">
                            <MessageCircle size={24} className="text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-800 leading-tight">WhatsApp Support</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tight leading-tight">Instant Chat with Team</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleWhatsApp}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs py-3.5 rounded-2xl uppercase tracking-[0.15em] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <MessageCircle size={16} fill="currentColor" /> Open WhatsApp
                    </button>
                </div>

                {/* 2. Help Guide */}
                <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shrink-0">
                            <BookOpen size={24} className="text-sky-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-800 leading-tight">Help Guide</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tight leading-tight">Basic platform usage</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                        {loading && <div className="text-center py-4 text-slate-300 animate-pulse">Loading guides...</div>}
                        {guides.map((guide, i) => (
                            <div key={i} className={`rounded-2xl transition-all duration-300 ${activeGuide === i ? 'bg-slate-50/80 p-3 -mx-3' : 'border-b border-slate-50 last:border-0 pb-3 last:pb-0'}`}>
                                <button 
                                    onClick={() => setActiveGuide(activeGuide === i ? null : i)}
                                    className="w-full flex items-center justify-between text-left group py-1"
                                >
                                    <span className={`text-[12px] font-medium transition-colors ${activeGuide === i ? 'text-sky-500' : 'text-slate-600'}`}>{guide.q}</span>
                                    <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${activeGuide === i ? 'rotate-180 text-sky-500' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeGuide === i ? 'max-h-60 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed pl-1 pb-1">{guide.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Report Problem */}
                <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shrink-0">
                            <AlertCircle size={24} className="text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-800 leading-tight">Report Problem</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tight leading-tight">Technical issues & bugs</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <textarea 
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="Describe your issue here..."
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-xs font-medium text-slate-700 focus:bg-white focus:border-rose-400 focus:ring-0 transition-all placeholder:text-slate-400 resize-none h-28"
                        />
                        <button 
                            onClick={handleSendReport}
                            disabled={!problem.trim() || isSending}
                            className={`w-full py-3.5 rounded-2xl text-[11px] font-medium uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95
                                ${!problem.trim() || isSending ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl shadow-slate-200'}`}
                        >
                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {isSending ? 'Sending Report...' : 'Send Problem Report'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
