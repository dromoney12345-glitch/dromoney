import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { extractReferralCode, savePendingReferralCode } from '../../shared/utils/referral';

/**
 * /join/:code → save invite code and open Sign Up with it prefilled.
 */
const JoinReferral = () => {
    const { code } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fromParam = searchParams.get('invite') || searchParams.get('ref') || searchParams.get('referral') || code || '';
        const cleaned = extractReferralCode(fromParam);
        if (cleaned) savePendingReferralCode(cleaned);
        navigate(cleaned ? `/user/auth/register?invite=${encodeURIComponent(cleaned)}` : '/user/auth/register', { replace: true });
    }, [code, searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCF8F5] font-['Poppins'] px-6">
            <p className="text-[12px] text-[#7A5648] uppercase tracking-widest">Opening sign up…</p>
        </div>
    );
};

export default JoinReferral;
