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
 * /referral?code=XXX and /join/:code — save invite, then Play Store (Android) or Sign Up.
 */
const JoinReferral = () => {
    const { code } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            const fromParam =
                searchParams.get('code') ||
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

            // Chrome/Android browser: Play Store with Install Referrer.
            // WhatsApp / Flutter WebView: keep code and open Sign Up.
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
