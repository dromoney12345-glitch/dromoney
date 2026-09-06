/** CMS key for login VA purchase popup — editable in Admin → Marketing & Promos → guides */
export const VA_GUIDE_CONTENT_KEY = 'popup_va_guide';

export const DEFAULT_VA_GUIDE = {
    badge: 'Quick guide',
    title: 'How to purchase Virtual Account',
    subtitle: 'Unlock withdrawals and keep your earnings safe.',
    ctaText: 'Buy Virtual Account',
    laterText: 'Maybe later',
    nextRoute: '/user/virtual-account',
    points: [
        {
            icon: 'wallet',
            title: 'Pending → Virtual',
            text: 'Create a Virtual Account so Pending earnings can move to Virtual and stay withdrawable.',
        },
        {
            icon: 'card',
            title: 'Withdraw to UPI / Bank',
            text: 'Withdrawals work only from an active Virtual Account (₹499 for 6 months).',
        },
        {
            icon: 'shield',
            title: 'Early offer',
            text: 'Pay within 3 days of registration: ₹399 stays as a 6-month reserve in Virtual (used at renewal).',
        },
        {
            icon: 'sparkles',
            title: 'Protect your earnings',
            text: 'Without a Virtual Account, Pending is cleared every 14 days (14, 28, 42…).',
        },
    ],
};

export function normalizeVaGuide(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const data = src.data && typeof src.data === 'object' ? src.data : src;
    const points = Array.isArray(data.points)
        ? data.points
            .map((p) => {
                if (typeof p === 'string') {
                    return { icon: 'wallet', title: '', text: p };
                }
                return {
                    icon: String(p?.icon || 'wallet'),
                    title: String(p?.title || '').trim(),
                    text: String(p?.text || p?.desc || '').trim(),
                };
            })
            .filter((p) => p.title || p.text)
        : [];

    return {
        badge: String(data.badge || data.eyebrow || DEFAULT_VA_GUIDE.badge),
        title: String(data.title || DEFAULT_VA_GUIDE.title),
        subtitle: String(data.subtitle || data.description || DEFAULT_VA_GUIDE.subtitle),
        ctaText: String(data.ctaText || DEFAULT_VA_GUIDE.ctaText),
        laterText: String(data.laterText || DEFAULT_VA_GUIDE.laterText),
        nextRoute: String(data.nextRoute || data.next || DEFAULT_VA_GUIDE.nextRoute),
        points: points.length ? points : DEFAULT_VA_GUIDE.points,
    };
}
