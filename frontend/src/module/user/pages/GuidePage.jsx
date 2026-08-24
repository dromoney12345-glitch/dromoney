import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, CheckCircle2, ShieldCheck, ListChecks,
    UserPlus, CreditCard, TrendingUp, Sparkles, Zap,
    Trophy, MousePointer2, Building2, Wallet, ArrowRight,
    HelpCircle, Flame, Gift, Compass
} from 'lucide-react';
import { GUIDES } from '../data/guides';
import api from '../../shared/services/api';
import defaultLogo from '../../../assets/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';

const ICON_MAP = {
    ShieldCheck, ListChecks, UserPlus, CreditCard, TrendingUp,
    Sparkles, Zap, Trophy, MousePointer2, Building2, Wallet,
    CheckCircle2, HelpCircle, Flame, Gift, Compass
};

const rewriteInviteCopy = (text) => {
    if (typeof text !== 'string' || !text) return text;
    return text
        .replace(
            /It transfers to your Virtual Wallet once they unlock their withdrawal card\.?/gi,
            'The amount is transferred to your Virtual Wallet in a minimum of 14 days and a maximum of 28 days.'
        )
        .replace(
            /It moves to Virtual Account when they create one\.?/gi,
            'The amount is transferred to your Virtual Wallet in a minimum of 14 days and a maximum of 28 days.'
        )
        .replace(
            /That ₹200 moves to Virtual Account only when they create a Virtual Account\.?/gi,
            'The amount is transferred to your Virtual Wallet in a minimum of 14 days and a maximum of 28 days.'
        );
};

const GuidePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const activeSlug = slug || 'explore-now';
    const fallbackGuide = GUIDES[activeSlug] || GUIDES['explore-now'] || GUIDES.kyc;
    const [guide, setGuide] = useState(fallbackGuide);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGuide = async () => {
            setLoading(true);
            try {
                // 1. Try to fetch specific key for explore-now or slug
                const contentKey = (activeSlug === 'explore-now' || activeSlug === 'explore') ? 'explore_now_guide' : `guide_${activeSlug}`;
                const res = await api.get(`/public/content/${contentKey}`);

                if (res && res.success && res.data) {
                    const d = res.data.data || res.data;
                    const isDummy = d.title === 'Default Title' && d.description === 'Content pending admin setup.';
                    if (d && !isDummy && (d.title || d.content || (Array.isArray(d.points) && d.points.length > 0) || (Array.isArray(d.sections) && d.sections.length > 0))) {
                        const rawPoints = d.points || d.sections || fallbackGuide?.points || [];
                        setGuide({
                            title: d.title || fallbackGuide?.title || 'Guide',
                            subtitle: d.subtitle || d.description || fallbackGuide?.subtitle || '',
                            badge: d.badge || fallbackGuide?.badge || 'YOUR GROWTH OUR GUIDANCE',
                            logoUrl: d.logoUrl || fallbackGuide?.logoUrl || '',
                            content: rewriteInviteCopy(d.content || d.fullContent || (Array.isArray(rawPoints) && typeof rawPoints[0] === 'string' ? rawPoints.join('\n\n') : '')),
                            next: d.nextRoute || d.next || fallbackGuide?.next || '/user/earn',
                            ctaText: d.ctaText || fallbackGuide?.ctaText || 'Start Earning Now',
                            points: rawPoints
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 2. Try fallback
                if (fallbackGuide) {
                    setGuide({
                        ...fallbackGuide,
                        content: fallbackGuide.content || (Array.isArray(fallbackGuide.points) && typeof fallbackGuide.points[0] === 'string' ? fallbackGuide.points.join('\n\n') : '')
                    });
                }
            } catch (err) {
                console.error("Error fetching guide content:", err);
                if (fallbackGuide) setGuide(fallbackGuide);
            } finally {
                setLoading(false);
            }
        };
        fetchGuide();
    }, [activeSlug]);

    const goNext = () => {
        localStorage.setItem(`dromoney_guide_${activeSlug}`, 'seen');
        const targetPath = guide.next || guide.nextRoute || '/user/earn';
        if (activeSlug === 'invite') {
            navigate('/user/marketing', { state: { showReferral: true } });
        } else {
            navigate(targetPath);
        }
    };

    // Helper to render complete guide content as a single continuous document
    const renderCompleteContent = (contentStr) => {
        if (!contentStr || typeof contentStr !== 'string') return null;
        const blocks = contentStr.split(/\n\s*\n/).filter(b => b.trim().length > 0);
        return (
            <div className="space-y-4 text-[#7A5648] font-medium text-[12px] leading-relaxed">
                {blocks.map((block, idx) => {
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
                            <div key={idx} className={`space-y-2 ${idx > 0 ? 'pt-3 border-t border-[#EDE4DC]/50' : ''}`}>
                                <h3 className="text-[14px] font-bold text-[#462211] leading-snug flex items-center gap-1.5">
                                    {headerText.replace(/^#+\s*/, '')}
                                </h3>
                                <div className="space-y-1.5 text-[12px] text-[#7A5648] leading-relaxed">
                                    {bodyLines.map((line, lIdx) => (
                                        <p key={lIdx} className={line.startsWith('•') || line.startsWith('-') ? 'pl-2 text-[#462211] font-semibold flex items-start gap-1.5' : ''}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    const isWarning = block.includes('⚠️') || block.toLowerCase().includes('guarantee') || block.toLowerCase().includes('disclaimer');

                    return (
                        <div
                            key={idx}
                            className={isWarning ? 'p-3 bg-[#FFF8F2] border-l-3 border-[#B3591C] rounded-r-xl text-[11.5px] text-[#644234] leading-relaxed' : 'text-[12px] text-[#7A5648] leading-relaxed whitespace-pre-line'}
                        >
                            {block}
                        </div>
                    );
                })}
            </div>
        );
    };

    const hasFullContent = Boolean(guide.content && guide.content.trim().length > 0);

    return (
        <div className="min-h-full bg-[#FCF8F5] font-poppins pb-12">
            {/* Header section styled with warm app brand theme */}
            <div className="bg-[#F3E8E0] px-4 pt-4 pb-8 rounded-b-[28px] relative overflow-hidden shadow-xs border-b border-[#EDE4DC]">
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-[#EDE4DC] flex items-center justify-center text-[#462211] active:scale-95 transition-all shadow-xs"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="h-9 px-2.5 rounded-xl bg-white/90 shadow-xs border border-[#EDE4DC] flex items-center justify-center gap-1.5">
                        <img
                            src={guide.logoUrl || defaultLogo}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultLogo;
                            }}
                            alt="Dromoney"
                            className="h-6 w-auto object-contain"
                        />
                        <span className="text-[10px] font-bold text-[#462211] uppercase tracking-wider">Guide</span>
                    </div>
                </div>

                <div className="relative z-10">
                    <span className="inline-block text-[9.5px] font-extrabold uppercase tracking-[0.2em] bg-[#462211]/10 text-[#462211] px-3 py-1 rounded-full mb-2.5 border border-[#462211]/15">
                        {guide.badge || 'YOUR GROWTH OUR GUIDANCE'}
                    </span>
                    <h1 className="text-xl font-bold text-[#462211] leading-tight tracking-tight">
                        {guide.title}
                    </h1>
                    {guide.subtitle && (
                        <p className="text-[12px] text-[#7A5648] mt-1.5 font-medium leading-relaxed max-w-[95%]">
                            {guide.subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Unified Content Sheet */}
            <div className="px-4 -mt-4 relative z-20">
                <div className="bg-white rounded-3xl border border-[#EDE4DC] shadow-[0_4px_24px_rgba(70,34,17,0.06)] p-4 sm:p-5">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-[#EDE4DC] border-t-[#B3591C] rounded-full animate-spin"></div>
                            <p className="text-[11px] font-semibold text-[#7A5648] uppercase tracking-widest">Loading Guide...</p>
                        </div>
                    ) : hasFullContent ? (
                        renderCompleteContent(guide.content)
                    ) : (
                        <div className="divide-y divide-[#EDE4DC]/60">
                            {(guide.points || []).map((point, i) => {
                                const isObj = typeof point === 'object' && point !== null;
                                const pTitle = isObj ? point.title : null;
                                const pText = isObj ? (point.text || point.description || point.desc) : point;
                                const IconComponent = (isObj && ICON_MAP[point.icon]) ? ICON_MAP[point.icon] : CheckCircle2;

                                return (
                                    <div key={i} className={`flex gap-3.5 items-start ${i === 0 ? 'pb-4' : i === guide.points.length - 1 ? 'pt-4' : 'py-4'}`}>
                                        <div className="w-8 h-8 rounded-full bg-[#FFF5F0] border border-[#EDE4DC] text-[#B3591C] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                            <IconComponent size={16} strokeWidth={2.2} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {pTitle && (
                                                <h3 className="text-[13px] font-bold text-[#462211] leading-snug mb-1">
                                                    {pTitle}
                                                </h3>
                                            )}
                                            <p className="text-[11.5px] text-[#7A5648] leading-relaxed font-medium whitespace-pre-line">
                                                {pText}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bottom Action buttons */}
                <div className="mt-6 space-y-2.5">
                    <button
                        type="button"
                        onClick={goNext}
                        className="w-full bg-[#462211] hover:bg-[#34180b] text-white py-3.5 rounded-full text-[13px] font-semibold active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(70,34,17,0.25)] flex items-center justify-center gap-2"
                    >
                        <span>{guide.ctaText || 'Start Earning Now'}</span>
                        <ArrowRight size={15} strokeWidth={2.5} />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/user/home')}
                        className="w-full text-[#7A5648] hover:text-[#462211] py-2 text-[12px] font-semibold transition-colors text-center"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;


