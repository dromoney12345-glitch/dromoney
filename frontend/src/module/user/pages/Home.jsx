import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck, UserPlus, CreditCard, Wallet, TrendingUp,
    PiggyBank, ListChecks, Building2, ChevronRight, ArrowRight, Shield,
    ShieldCheck, Search, Users, ShieldAlert, FileText
} from 'lucide-react';
import { HOME_GUIDE_CARDS } from '../data/guides';
import api from '../../shared/services/api';

const WhatsAppIcon = ({ size = 18, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.16-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.32.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.45-.61-.46h-.52c-.18 0-.47.07-.71.34-.25.27-.93.91-.93 2.22s.96 2.58 1.09 2.76c.14.18 1.88 2.87 4.56 4.02.64.28 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
        <path d="M12.04 2C6.48 2 2 6.4 2 11.86c0 1.74.46 3.44 1.33 4.95L2 22l5.33-1.4a10.2 10.2 0 0 0 4.71 1.14h.01c5.56 0 10.04-4.4 10.04-9.86C22.09 6.4 17.6 2 12.04 2zm0 17.96h-.01a8.47 8.47 0 0 1-4.31-1.18l-.31-.18-3.16.83.84-3.08-.2-.32a8.25 8.25 0 0 1-1.27-4.4c0-4.56 3.79-8.28 8.44-8.28 4.5 0 8.44 3.72 8.44 8.28 0 4.57-3.94 8.33-8.46 8.33z" />
    </svg>
);

const DOCUMENTS = [
    { label: 'Privacy Policy', path: 'privacy', icon: Search },
    { label: 'Terms & Conditions', path: 'terms', icon: FileText },
    { label: 'Community Guidelines', path: 'guidelines', icon: Users },
    { label: 'No Refund Policy', path: 'refund-policy', icon: ShieldAlert },
];

const DEFAULT_WHATSAPP = '919680947738';

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const ICON_MAP = {
    ClipboardCheck, UserPlus, CreditCard, Wallet, TrendingUp, PiggyBank, ListChecks, Building2,
};

const FALLBACK_BANNER = {
    tag: 'Your Growth',
    title: 'Our Guidance',
    subtitle: 'Dromoney is your trusted platform to learn, grow and earn online with smart opportunities.',
    ctaText: 'Explore Now',
    path: '',
    imageUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=640&q=80',
};

const Home = () => {
    const navigate = useNavigate();
    const helpsRef = useRef(null);
    const [banners, setBanners] = useState([FALLBACK_BANNER]);
    const [active, setActive] = useState(0);
    const [whatsappPhone, setWhatsappPhone] = useState(DEFAULT_WHATSAPP);

    useEffect(() => {
        const load = async () => {
            try {
                const [bannerRes, settingsRes] = await Promise.all([
                    api.get('/public/banners'),
                    api.get('/public/settings').catch(() => null),
                ]);
                if (bannerRes.success && bannerRes.data?.length) {
                    setBanners(bannerRes.data);
                    setActive(0);
                }
                const phone = digitsOnly(settingsRes?.data?.contactPhone);
                if (phone.length >= 10) setWhatsappPhone(phone.length === 10 ? `91${phone}` : phone);
            } catch {
                setBanners([FALLBACK_BANNER]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (banners.length < 2) return undefined;
        const t = setInterval(() => setActive((i) => (i + 1) % banners.length), 5000);
        return () => clearInterval(t);
    }, [banners.length]);

    const banner = banners[active] || FALLBACK_BANNER;

    const handleCta = () => {
        const path = banner.path || '';
        if (!path || path === '/user/home') {
            helpsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (path.startsWith('http')) {
            window.open(path, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(path);
    };

    const openWhatsApp = () => {
        const message = encodeURIComponent('Hello Dromoney Support, I need assistance.');
        window.open(`https://wa.me/${whatsappPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex flex-col min-h-full bg-white font-poppins pb-2">
            {/* Hero banner — admin: tag, title, subtitle, ctaText, imageUrl, path */}
            <section className="mx-2.5 mt-1.5 mb-2.5 bg-[#F8F1E8] rounded-2xl overflow-hidden relative min-h-[132px] shadow-[0_2px_12px_rgba(70,34,17,0.06)]">
                <div className="relative z-10 pl-3.5 pr-0 py-3 flex items-stretch min-h-[132px]">
                    <div className="flex-1 min-w-0 flex flex-col justify-center pr-1">
                        <h1 className="text-[17px] font-bold text-slate-900 leading-[1.15] tracking-tight">
                            {banner.tag || 'Your Growth'}
                        </h1>
                        <h2 className="text-[17px] font-bold text-[#C2520A] leading-[1.15] tracking-tight">
                            {banner.title || 'Our Guidance'}
                        </h2>
                        <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-3 pr-0.5">
                            {banner.subtitle}
                        </p>
                        <button
                            type="button"
                            onClick={handleCta}
                            className="mt-2 inline-flex items-center gap-1 bg-[#C2520A] text-white text-[9px] font-semibold px-3 py-1.5 rounded-full w-fit active:scale-95 shadow-sm"
                        >
                            {banner.ctaText || 'Explore Now'}
                            <ArrowRight size={11} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="w-[42%] max-w-[150px] shrink-0 self-end flex items-end justify-end overflow-hidden">
                        <img
                            src={banner.imageUrl || FALLBACK_BANNER.imageUrl}
                            alt=""
                            className="h-[118px] w-full object-cover object-top select-none pointer-events-none"
                        />
                    </div>
                </div>
                {banners.length > 1 && (
                    <div className="absolute bottom-1.5 left-3.5 z-20 flex gap-1">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setActive(i)}
                                aria-label={`Banner ${i + 1}`}
                                className={`h-1 rounded-full transition-all ${i === active ? 'w-3.5 bg-[#C2520A]' : 'w-1.5 bg-black/15'}`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* 4 × 2 compact guide grid */}
            <section ref={helpsRef} className="px-2.5 pb-1">
                <div className="text-center mb-2">
                    <h3 className="text-[13px] font-bold text-slate-900 leading-snug">
                        How{' '}
                        <span className="relative inline-block">
                            Dromoney
                            <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#C2520A] rounded-full" />
                        </span>{' '}
                        Helps?
                    </h3>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                    {HOME_GUIDE_CARDS.map((card) => {
                        const Icon = ICON_MAP[card.icon] || ClipboardCheck;
                        return (
                            <button
                                key={card.slug}
                                type="button"
                                onClick={() => navigate(`/user/guide/${card.slug}`)}
                                className="bg-white rounded-xl px-1 py-2 border border-slate-100/80 shadow-[0_1px_6px_rgba(15,23,42,0.05)] active:scale-[0.97] flex flex-col items-center gap-1"
                            >
                                <div className={`w-7 h-7 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                                    <Icon size={14} className={card.iconColor} strokeWidth={2} />
                                </div>
                                <div className="flex items-center justify-center gap-0.5 w-full px-0.5">
                                    <p className="text-[8px] font-semibold text-slate-800 leading-[1.25] text-center min-w-0">
                                        {card.label}
                                    </p>
                                    <ChevronRight size={9} className="text-slate-400 shrink-0" strokeWidth={2.5} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="px-2.5 mt-2.5 space-y-2">
                <div className="relative overflow-hidden bg-white rounded-xl border border-[#EDE4DC] shadow-[0_2px_10px_rgba(70,34,17,0.06)] px-2.5 py-2.5 flex items-center gap-2.5">
                    <Shield className="absolute -right-2 -bottom-3 text-[#462211] opacity-[0.06]" size={64} />
                    <div className="w-9 h-9 rounded-lg bg-[#462211] flex items-center justify-center shrink-0 relative z-10">
                        <ShieldCheck size={18} className="text-white" strokeWidth={2.2} />
                    </div>
                    <div className="relative z-10 min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 leading-tight">100% Secure & Trusted Platform</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">Transparent system, secure payments and lifetime support.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_6px_rgba(15,23,42,0.04)] px-2.5 py-2 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                        <WhatsAppIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 leading-tight">Help Chahiye?</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">WhatsApp se turant support lein.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openWhatsApp}
                        className="shrink-0 inline-flex items-center gap-1 border border-[#25D366] text-[#128C7E] text-[9px] font-semibold px-2 py-1 rounded-lg active:scale-95"
                    >
                        <WhatsAppIcon size={11} />
                        Chat
                    </button>
                </div>
            </section>

            <section className="px-2.5 mt-3">
                <div className="mb-2">
                    <h3 className="text-[12px] font-bold text-slate-900">Important Documents</h3>
                    <div className="mt-0.5 h-[2px] w-10 rounded-full bg-[#C2520A]" />
                </div>
                <div className="space-y-1.5">
                    {DOCUMENTS.map((doc) => {
                        const Icon = doc.icon;
                        return (
                            <button
                                key={doc.path}
                                type="button"
                                onClick={() => navigate(`/user/info/${doc.path}`)}
                                className="w-full bg-white rounded-xl border border-slate-100 shadow-[0_1px_6px_rgba(15,23,42,0.04)] px-2.5 py-2 flex items-center gap-2.5 text-left active:scale-[0.99]"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#FFF5F0] text-[#462211] flex items-center justify-center shrink-0">
                                    <Icon size={14} strokeWidth={2} />
                                </div>
                                <span className="flex-1 text-[11px] font-semibold text-slate-800">{doc.label}</span>
                                <ChevronRight size={14} className="text-slate-300" />
                            </button>
                        );
                    })}
                </div>
            </section>

            <p className="text-center text-[10px] text-slate-400 mt-4 mb-2">From Jangu Group</p>
        </div>
    );
};

export default Home;
