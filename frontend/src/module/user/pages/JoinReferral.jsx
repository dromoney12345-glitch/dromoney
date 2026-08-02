import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { extractReferralCode, PLAY_STORE_URL, buildPlayStoreReferralLink } from '../../shared/utils/referral';

/**
 * /join/:code → send user to Play Store invite link (no auto-fill on register).
 */
const JoinReferral = () => {
    const { code } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fromParam = searchParams.get('ref') || searchParams.get('referral') || code || '';
        const cleaned = extractReferralCode(fromParam);
        const storeUrl = cleaned
            ? buildPlayStoreReferralLink(cleaned)
            : PLAY_STORE_URL;

        // Always open Play Store share link — register stays empty until user pastes
        window.location.replace(storeUrl);
    }, [code, searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Poppins'] px-6">
            <p className="text-[12px] text-slate-500 uppercase tracking-widest">Opening Play Store…</p>
        </div>
    );
};

export default JoinReferral;
