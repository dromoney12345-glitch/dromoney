import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
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

    if (loading) {
        return (
            <div className="flex flex-col min-h-full bg-[#FCF8F5] items-center justify-center font-poppins">
                <Loader2 size={24} className="text-[#B3591C] animate-spin" />
                <p className="mt-3 text-[10px] font-medium text-[#7A5648] uppercase tracking-widest animate-pulse">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-[#FCF8F5] font-poppins pb-6">
            <div className="bg-white px-4 py-2.5 flex items-center gap-3 sticky top-0 z-40 border-b border-[#EDE4DC]">
                <button onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 transition-all">
                    <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
                <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">
                    {pageData.title}
                </h1>
            </div>

            <div className="px-4 pt-4">
                {pageData.subtitle && (
                    <p className="text-[11px] font-medium text-[#7A5648] uppercase tracking-widest mb-4">
                        {pageData.subtitle}
                    </p>
                )}

                <div className="bg-white rounded-2xl border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] overflow-hidden">
                    {pageData.sections?.map((section, idx) => (
                        <div key={idx} className={`px-4 py-3.5 ${idx !== (pageData.sections?.length || 0) - 1 ? 'border-b border-[#EDE4DC]/60' : ''}`}>
                            <h4 className="text-[13px] font-semibold text-[#462211] mb-1.5">
                                {section.title}
                            </h4>
                            <p className="text-[11px] text-[#7A5648] leading-relaxed whitespace-pre-line">
                                {section.text}
                            </p>
                        </div>
                    ))}
                </div>

                {pageData.sections?.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-[#EDE4DC]">
                        <p className="text-[12px] text-[#7A5648]">No content available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoPageView;
