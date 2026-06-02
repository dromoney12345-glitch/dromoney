import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, HelpCircle, Sparkles, Headset, Building2, CheckCircle2, Rocket } from 'lucide-react';
import api from '../../shared/services/api';

const InfoPageView = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState({ title: 'Loading...', subtitle: '', sections: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchPageContent = async () => {
            setLoading(true);
            try {
                const dbKey = `menu_${pageId.replace(/-/g, '_')}`;
                const res = await api.get(`/public/content/${dbKey}`);
                if (res.success && res.data && res.data.data) {
                    setPageData({
                        title: res.data.data.title || res.data.title,
                        subtitle: res.data.data.subtitle || res.data.description,
                        sections: res.data.data.sections || []
                    });
                } else {
                    setPageData({ title: 'Page Not Found', subtitle: '', sections: [] });
                }
            } catch (err) {
                console.error(err);
                setPageData({ title: 'Error', subtitle: 'Failed to load content.', sections: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchPageContent();
    }, [pageId]);

    const getIcon = () => {
        const iconProps = { size: 28, strokeWidth: 2 };
        switch(pageId) {
            case 'how-it-works': return <HelpCircle {...iconProps} className="text-blue-500" />;
            case 'benefits': return <Sparkles {...iconProps} className="text-amber-500" />;
            case 'support': return <Headset {...iconProps} className="text-emerald-500" />;
            case 'about': return <Building2 {...iconProps} className="text-indigo-500" />;
            default: return <Info {...iconProps} className="text-slate-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#F8FAFC] items-center justify-center font-poppins">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-medium animate-pulse uppercase tracking-widest text-[10px]">Synchronizing...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-white items-center justify-center font-poppins">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-medium text-[10px] uppercase tracking-[0.2em]">Loading Design...</p>
            </div>
        );
    }

    // Special Layout for "How It Works"
    if (pageId === 'how-it-works') {
        return (
            <div className="flex flex-col min-h-screen bg-white font-poppins pb-24 relative overflow-hidden">
                {/* Curved Hero Section */}
                <div className="relative h-64 bg-gradient-to-br from-red-600 to-red-500 rounded-b-[4rem] shadow-2xl shadow-red-100 overflow-hidden">
                    {/* Decorative Background Icon */}
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <HelpCircle size={220} className="text-white" strokeWidth={1} />
                    </div>
                    
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate(-1)} 
                        className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-xl text-white active:scale-90 transition-all z-20 border border-white/20"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Hero Text */}
                    <div className="absolute bottom-12 left-8 z-10">
                        <h1 className="text-4xl font-medium text-white tracking-tight leading-none mb-2">
                            How It Works
                        </h1>
                        <p className="text-white/80 text-[11px] font-medium uppercase tracking-[0.3em]">
                            Master the Dromoney Platform
                        </p>
                    </div>

                    {/* Subtle Wave Decoration */}
                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/10 to-transparent"></div>
                </div>

                <div className="relative flex flex-col py-12 px-6">
                    {/* Central Connecting Line */}
                    <div className="absolute left-[34px] md:left-1/2 top-4 bottom-10 w-[1px] border-l border-dashed border-slate-200 -translate-x-1/2 z-0"></div>

                    <div className="flex flex-col gap-16 relative z-10">
                        {pageData.sections?.map((section, idx) => {
                            const isEven = idx % 2 === 0;
                            return (
                                <div key={idx} className={`flex flex-col md:flex-row md:items-center gap-6 md:gap-16 w-full ${isEven ? '' : 'md:flex-row-reverse'}`}>
                                    
                                    {/* Step Bubble Section */}
                                    <div className="flex flex-col items-center shrink-0 w-14 md:w-20">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Step</p>
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-2 border-slate-100 shadow-xl rounded-full flex items-center justify-center text-slate-900 font-medium text-lg md:text-2xl relative">
                                            0{idx + 1}
                                            <div className="absolute -inset-1 border border-slate-50 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Illustration Side */}
                                    <div className="flex justify-center md:flex-1">
                                        <div className="w-full max-w-[280px] aspect-square rounded-full bg-red-500/5 flex items-center justify-center relative p-8 group">
                                            <div className="w-full h-full rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-200 relative overflow-hidden">
                                                {/* Card-like decorative pattern inside circle */}
                                                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                                                    <div className="absolute top-4 right-4 w-12 h-8 border border-white rounded-sm"></div>
                                                    <div className="absolute bottom-4 left-4 w-20 h-1 bg-white rounded-full"></div>
                                                </div>
                                                <div className="scale-125 md:scale-[1.5] text-white">
                                                    {getIcon()}
                                                </div>
                                            </div>
                                            {/* Floating Badge */}
                                            <div className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 border border-slate-50">
                                                <Sparkles size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text Content Side */}
                                    <div className={`flex flex-col gap-3 md:flex-1 ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                                        <h3 className="text-xl md:text-2xl font-medium text-red-500 tracking-tight">
                                            {section.title}
                                        </h3>
                                        <p className="text-[13px] font-normal text-slate-500 leading-relaxed">
                                            {section.text}
                                        </p>
                                        <div className={`flex items-center gap-2 mt-4 text-[11px] font-medium text-slate-300 uppercase tracking-widest ${isEven ? 'justify-start' : 'justify-end'}`}>
                                            {[...Array(8)].map((_, i) => <div key={i} className="w-1 h-1 bg-slate-200 rounded-full"></div>)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Final CTA Card */}
                <div className="px-6 mt-8">
                    <div className="bg-[#0B1221] p-8 rounded-none text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl"></div>
                        <h4 className="text-white font-medium text-lg mb-2">Ready to Start?</h4>
                        <p className="text-white/40 text-[11px] font-normal uppercase tracking-[0.2em] mb-6">Join the ecosystem of digital earners</p>
                        <button className="w-full py-4 bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium uppercase tracking-widest transition-all active:scale-95">
                            Get Started Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default Layout for other pages (Support, Benefits, About)
    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-poppins relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-100/40 blur-[100px] rounded-full"></div>
            <div className="absolute top-[20%] right-[-5%] w-[40%] h-[30%] bg-emerald-100/40 blur-[100px] rounded-full"></div>

            {/* Sticky Header */}
            <header className="p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center gap-4 sticky top-0 z-50">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-lg text-slate-600 active:scale-95 transition-transform border border-slate-100"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-[15px] font-medium text-slate-900 tracking-tight uppercase">
                    {pageData.title}
                </h1>
            </header>

            <div className="relative z-10 flex flex-col p-5 pb-24 gap-8">
                {/* Intro Hero Section */}
                <div className="flex flex-col items-center text-center py-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-slate-200/50 border border-slate-100">
                        {getIcon()}
                    </div>
                    <h2 className="text-2xl font-medium text-slate-900 tracking-tight leading-tight px-4">
                        {pageData.title}
                    </h2>
                    <div className="mt-3 inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium uppercase tracking-[0.15em] border border-blue-100/50">
                        {pageData.subtitle}
                    </div>
                </div>
                
                {/* Content Sections as Clean Cards */}
                <div className="grid gap-4">
                    {pageData.sections?.map((section, idx) => (
                        <div key={idx} className="bg-white p-5 border border-slate-100 shadow-sm rounded-lg group hover:border-blue-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                    <CheckCircle2 size={16} className="text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-medium text-slate-900 mb-1.5 uppercase tracking-wide">
                                        {section.title}
                                    </h4>
                                    <p className="text-[12px] font-normal text-slate-500 leading-relaxed">
                                        {section.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Tip */}
                <div className="bg-slate-900 rounded-xl p-6 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                    <p className="text-white/60 text-[11px] font-normal uppercase tracking-widest leading-relaxed relative z-10">
                        Need more help? Our experts are just a click away in the support section.
                    </p>
                    <button className="mt-4 px-6 py-2 bg-white text-slate-900 text-[11px] font-medium uppercase tracking-widest rounded-lg active:scale-95 transition-transform">
                        Contact Us
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoPageView;
