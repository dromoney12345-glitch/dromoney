import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CreditCard, Wallet, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../shared/services/api';
import { DEFAULT_VA_GUIDE, VA_GUIDE_CONTENT_KEY, normalizeVaGuide } from '../data/vaGuideDefaults';

const ICON_BY_KEY = {
    wallet: Wallet,
    card: CreditCard,
    creditcard: CreditCard,
    shield: ShieldCheck,
    shieldcheck: ShieldCheck,
    sparkles: Sparkles,
    star: Sparkles,
};

/**
 * One-shot guide: how to buy Virtual Account + benefits.
 * Copy is loaded from admin CMS key `popup_va_guide` (Marketing & Promos).
 */
const VaGuidePopup = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [guide, setGuide] = useState(DEFAULT_VA_GUIDE);

    useEffect(() => {
        if (!isOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev || '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/public/content/${VA_GUIDE_CONTENT_KEY}`);
                if (cancelled) return;
                const payload = res?.data?.data || res?.data || res;
                const isDummy =
                    payload?.title === 'Default Title' &&
                    payload?.description === 'Content pending admin setup.';
                if (!isDummy && payload) {
                    setGuide(normalizeVaGuide(payload));
                } else {
                    setGuide(DEFAULT_VA_GUIDE);
                }
            } catch {
                if (!cancelled) setGuide(DEFAULT_VA_GUIDE);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const goBuy = () => {
        onClose();
        navigate(guide.nextRoute || '/user/virtual-account');
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 font-['Poppins']">
            <button
                type="button"
                aria-label="Close overlay"
                className="absolute inset-0 bg-slate-900/55 animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full sm:max-w-sm bg-[#FCF8F5] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-[#EDE4DC]">
                <div className="relative px-4 pt-4 pb-3 bg-white border-b border-[#EDE4DC]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#F3E8E0] text-[#462211] flex items-center justify-center active:scale-95"
                        aria-label="Close"
                    >
                        <X size={18} strokeWidth={2.4} />
                    </button>

                    <div className="pr-10">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A8478] mb-1">
                            {guide.badge || 'Quick guide'}
                        </p>
                        <h2 className="text-[17px] font-semibold text-[#462211] leading-snug tracking-tight">
                            {guide.title}
                        </h2>
                        <p className="text-[12px] text-[#7A5648] mt-1 leading-snug">
                            {guide.subtitle}
                        </p>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-2.5 max-h-[55vh] overflow-y-auto">
                    {(guide.points || []).map((row, idx) => {
                        const Icon = ICON_BY_KEY[String(row.icon || 'wallet').toLowerCase()] || Wallet;
                        return (
                            <div
                                key={`${row.title}-${idx}`}
                                className="flex gap-3 bg-white border border-[#EDE4DC] rounded-2xl px-3 py-2.5"
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#FFF5F0] text-[#462211] flex items-center justify-center shrink-0">
                                    <Icon size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-[#462211] leading-tight">{row.title}</p>
                                    <p className="text-[11px] text-[#7A5648] mt-0.5 leading-snug">{row.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-4 pb-5 pt-1 space-y-2 bg-[#FCF8F5]">
                    <button
                        type="button"
                        onClick={goBuy}
                        className="w-full bg-[#462211] text-white py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        {guide.ctaText || 'Buy Virtual Account'}
                        <ArrowRight size={16} strokeWidth={2.4} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-[11px] font-medium uppercase tracking-widest text-[#9A8478] py-2"
                    >
                        {guide.laterText || 'Maybe later'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VaGuidePopup;
