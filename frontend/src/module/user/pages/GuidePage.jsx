import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { GUIDES } from '../data/guides';

const GuidePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const guide = GUIDES[slug] || GUIDES.kyc;

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
                <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center mb-4 text-slate-800">
                    <ChevronLeft size={22} />
                </button>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#462211] mb-1">Your Growth Our Guidance</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{guide.title}</h1>
                <p className="text-[12px] text-slate-500 mt-1">{guide.subtitle}</p>
            </div>

            <div className="px-4 -mt-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(15,23,42,0.05)] p-4 space-y-3">
                    {guide.points.map((p, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <CheckCircle2 size={16} className="text-[#462211] shrink-0 mt-0.5" />
                            <p className="text-[13px] text-slate-600 leading-relaxed">{p}</p>
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
                        className="w-full text-slate-400 py-3 text-[12px] font-medium"
                    >
                        Skip Guide
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
