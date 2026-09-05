import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CreditCard, Wallet, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

const GUIDE_POINTS = [
    {
        icon: Wallet,
        title: 'Pending → Virtual',
        text: 'Create a Virtual Account so Pending earnings can move to Virtual and stay withdrawable.',
    },
    {
        icon: CreditCard,
        title: 'Withdraw to UPI / Bank',
        text: 'Withdrawals work only from an active Virtual Account (₹499 for 6 months).',
    },
    {
        icon: ShieldCheck,
        title: 'Early offer',
        text: 'Pay within 3 days of registration: ₹399 stays as a 6-month reserve in Virtual (used at renewal).',
    },
    {
        icon: Sparkles,
        title: 'Protect your earnings',
        text: 'Without a Virtual Account, Pending is cleared every 14 days (14, 28, 42…).',
    },
];

/**
 * One-shot guide: how to buy Virtual Account + benefits.
 * Parent controls open/close; CTA navigates to /user/virtual-account.
 */
const VaGuidePopup = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev || '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const goBuy = () => {
        onClose();
        navigate('/user/virtual-account');
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
                            Quick guide
                        </p>
                        <h2 className="text-[17px] font-semibold text-[#462211] leading-snug tracking-tight">
                            How to purchase Virtual Account
                        </h2>
                        <p className="text-[12px] text-[#7A5648] mt-1 leading-snug">
                            Unlock withdrawals and keep your earnings safe.
                        </p>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-2.5 max-h-[55vh] overflow-y-auto">
                    {GUIDE_POINTS.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div
                                key={row.title}
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
                        Buy Virtual Account
                        <ArrowRight size={16} strokeWidth={2.4} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-[11px] font-medium uppercase tracking-widest text-[#9A8478] py-2"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VaGuidePopup;
