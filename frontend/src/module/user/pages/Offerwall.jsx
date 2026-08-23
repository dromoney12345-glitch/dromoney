import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Loader2, Gift } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';
import { isFlutterApp } from '../../shared/utils/flutterAds';

const Offerwall = () => {
    const navigate = useNavigate();
    const { userData, loading: userLoading } = useUser();
    const status = String(userData?.kycStatus || 'Not Started').toLowerCase();

    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [wallUrl, setWallUrl] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (userLoading) return;
        if (status === 'pending' || status === 'rejected') navigate('/user/auth/pending');
        else if (status === 'not started') navigate('/user/auth/kyc');
    }, [status, navigate, userLoading]);

    useEffect(() => {
        if (userLoading) return;
        if (status === 'pending' || status === 'rejected' || status === 'not started') return;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get('/user/data/offerwall');
                if (res.success && res.data) {
                    setEnabled(!!res.data.enabled);
                    setWallUrl(res.data.wallUrl || '');
                } else {
                    setEnabled(false);
                }
            } catch (err) {
                setError(err.message || 'Could not load offers');
                setEnabled(false);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userLoading, status]);

    const openInBrowser = () => {
        if (!wallUrl) return;
        window.open(wallUrl, '_blank', 'noopener,noreferrer');
    };

    if (userLoading || status === 'pending' || status === 'rejected' || status === 'not started') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FCF8F5] font-poppins">
                <Loader2 className="animate-spin text-[#462211]" size={28} />
                <p className="text-[10px] uppercase tracking-widest text-[#9A8478]">Verifying KYC...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-[#FCF8F5] font-poppins">
            <div className="bg-white px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-40 border-b border-[#EDE4DC]">
                <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={() => navigate(-1)} className="text-[#462211] active:scale-95 shrink-0">
                        <ChevronLeft size={22} strokeWidth={2.2} />
                    </button>
                    <h1 className="text-[17px] font-semibold text-[#462211] tracking-tight">Offers</h1>
                </div>
                {enabled && wallUrl && (
                    <button
                        type="button"
                        onClick={openInBrowser}
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[#B3591C] flex items-center gap-1"
                    >
                        <ExternalLink size={13} /> Browser
                    </button>
                )}
            </div>

            <p className="px-4 py-2 text-[10px] text-[#7A5648] leading-relaxed">
                Complete an offer to earn. Reward is added after the partner confirms — this can take a few minutes. Reversed offers can be deducted.
            </p>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 className="animate-spin text-[#462211]" size={28} />
                    <p className="text-[10px] uppercase tracking-widest text-[#9A8478]">Loading offers...</p>
                </div>
            ) : error ? (
                <div className="px-4 py-10 text-center">
                    <p className="text-[13px] font-medium text-[#462211]">{error}</p>
                </div>
            ) : !enabled || !wallUrl ? (
                <div className="px-4 py-16 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF5F0] border border-[#EDE4DC] flex items-center justify-center">
                        <Gift size={26} className="text-[#462211]" />
                    </div>
                    <p className="text-[15px] font-semibold text-[#462211]">Offers coming soon</p>
                    <p className="text-[11px] text-[#7A5648] max-w-[260px] leading-relaxed">
                        Partner offers will appear here once they are approved. Check back shortly.
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col px-2 pb-3">
                    {isFlutterApp() && (
                        <button
                            type="button"
                            onClick={openInBrowser}
                            className="mx-2 mb-2 bg-[#462211] text-white text-[11px] font-semibold uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            <ExternalLink size={14} /> Open in browser
                        </button>
                    )}
                    <iframe
                        title="AyeT Offers"
                        src={wallUrl}
                        className="w-full flex-1 min-h-[70vh] rounded-xl border border-[#EDE4DC] bg-white"
                        allow="clipboard-write"
                    />
                </div>
            )}
        </div>
    );
};

export default Offerwall;
