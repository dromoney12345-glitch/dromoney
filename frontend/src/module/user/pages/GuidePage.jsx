import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { GUIDES } from '../data/guides';
import api from '../../shared/services/api';

const GuidePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [guide, setGuide] = useState(GUIDES[slug] || GUIDES.kyc);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                const res = await api.get('/public/content/home_guides');
                if (res.success && res.data?.data?.cards?.length) {
                    const match = res.data.data.cards.find(c => c.slug === slug);
                    if (match && match.points?.length) {
                        setGuide(match);
                        return;
                    }
                }
            } catch {}
            if (GUIDES[slug]) setGuide(GUIDES[slug]);
        };
        fetchGuide();
    }, [slug]);

    const goNext = () => {
        localStorage.setItem(`dromoney_guide_${slug}`, 'seen');
        if (slug === 'invite') {
            navigate('/user/marketing', { state: { showReferral: true } });
        } else {
            navigate(guide.next);
        }
    };

    return (
        <div className="min-h-full bg-[#FCF8F5] font-poppins pb-8">
            <div className="bg-[#F3E8E0] px-4 pt-4 pb-8 rounded-b-3xl">
                <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center mb-4 text-[#462211]">
                    <ChevronLeft size={22} />
                </button>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#462211] mb-1">Your Growth Our Guidance</p>
                <h1 className="text-xl font-bold text-[#462211] leading-tight">{guide.title}</h1>
                <p className="text-[12px] text-[#7A5648] mt-1">{guide.subtitle}</p>
            </div>

            <div className="px-4 -mt-4">
                <div className="bg-white rounded-2xl border border-[#EDE4DC] shadow-[0_2px_12px_rgba(70,34,17,0.06)] p-4 space-y-3">
                    {(guide.points || []).map((p, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <CheckCircle2 size={16} className="text-[#B3591C] shrink-0 mt-0.5" />
                            <p className="text-[12px] text-[#7A5648] leading-relaxed">{p}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 space-y-2">
                    <button
                        type="button"
                        onClick={goNext}
                        className="w-full bg-[#462211] text-white py-3.5 rounded-full text-[13px] font-semibold active:scale-[0.98]"
                    >
                        Continue
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        className="w-full text-[#7A5648] py-3 text-[12px] font-medium"
                    >
                        Skip Guide
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
