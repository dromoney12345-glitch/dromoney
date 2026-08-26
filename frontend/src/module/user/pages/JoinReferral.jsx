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
        const fromParam =
            searchParams.get('invite') ||
            searchParams.get('ref') ||
            searchParams.get('referral') ||
            searchParams.get('utm_content') ||
            searchParams.get('referrer') ||
            code ||
            '';
        const cleaned =
            extractReferralCode(fromParam) ||
            extractReferralCode(typeof window !== 'undefined' ? window.location.href : '');
        if (cleaned) savePendingReferralCode(cleaned);
        navigate(cleaned ? `/user/auth/register?invite=${encodeURIComponent(cleaned)}` : '/user/auth/register', { replace: true });
    }, [code, searchParams, navigate]);

    return (
        <div className="min-h-screen bg-white" aria-hidden />
    );
};

export default JoinReferral;
