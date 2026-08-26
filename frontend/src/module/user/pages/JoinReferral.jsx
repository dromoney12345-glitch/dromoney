import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../shared/services/api';
import { isFlutterApp } from '../../shared/utils/flutterAds';
import {
    extractReferralCode,
    savePendingReferralCode,
    saveReferralClickId,
    buildPlayStoreReferralLink,
} from '../../shared/utils/referral';

/**
 * /join/:code — record the invite, then send Android browsers to Play Store
 * so a Play Store download can still be attributed to the referrer.
 */
const JoinReferral = () => {
    const { code } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
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

            if (cleaned) {
                savePendingReferralCode(cleaned);
                try {
                    const res = await api.post('/public/referral-click', { referralCode: cleaned });
                    if (res?.clickId) saveReferralClickId(res.clickId);
                } catch {
                    /* still continue to Play Store / signup */
                }
            }

            if (cancelled) return;

            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            const android = /android/i.test(ua);
            const inAppWebView = isFlutterApp()
                || (typeof window !== 'undefined' && !!(window.Android || window.flutter_inappwebview))
                || /; wv\)/i.test(ua);

            // Chrome/Android browser: send them to Play Store with the invite referrer.
            // In-app browsers (WhatsApp / Flutter) stay on Sign Up so the code is not lost.
            if (cleaned && android && !inAppWebView) {
                window.location.replace(buildPlayStoreReferralLink(cleaned));
                return;
            }

            navigate(
                cleaned ? `/user/auth/register?invite=${encodeURIComponent(cleaned)}` : '/user/auth/register',
                { replace: true }
            );
        };

        run();
        return () => { cancelled = true; };
    }, [code, searchParams, navigate]);

    return <div className="min-h-screen bg-white" aria-hidden />;
};

export default JoinReferral;
