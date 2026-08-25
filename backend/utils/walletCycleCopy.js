function rewriteWalletCycleCopy(text) {
    if (typeof text !== 'string' || !text) return text;
    return text
        .replace(
            /This earning has no 7[–\-‐]28 day hold\.?/gi,
            'If Virtual Account is not created or is expired, this earning stays in Pending. Pending is cleared every 14 days (14, 28, 42…) until you create or renew a Virtual Account. Old Virtual balance is never deleted.'
        )
        .replace(
            /then to Virtual Wallet in min(?:imum)? 14 and max(?:imum)? 28 days\.?/gi,
            'then to Virtual when they create a Virtual Account.'
        )
        .replace(
            /The amount is transferred to your Virtual Wallet in a minimum of 14 days and a maximum of 28 days\.?/gi,
            'That ₹200 stays in Pending until they create a Virtual Account, then it moves to your Virtual Account.'
        )
        .replace(
            /when they complete KYC and unlock their withdrawal card, instant referral rewards are credited to your matching wallet\.?/gi,
            'when they complete KYC, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account.'
        )
        .replace(
            /जब वे KYC पूरा करके Virtual Account बनाते हैं, तो आपके वॉलेट में रेफरल रिवॉर्ड इंसटेंट ऐड हो जाता है।?/g,
            'जब वे KYC पूरा करते हैं, ₹200 आपके Pending Wallet में जाता है। जब वे Virtual Account बनाते हैं, तब यह Virtual में जाता है। VA न बनाने पर उनका Pending हर 14 दिन (14, 28, 42…) पर clear होता है।'
        );
}

function rewriteContentPayload(payload) {
    if (!payload) return payload;
    const data = payload.data || payload;
    if (data && typeof data === 'object') {
        if (typeof data.content === 'string') data.content = rewriteWalletCycleCopy(data.content);
        if (typeof data.text === 'string') data.text = rewriteWalletCycleCopy(data.text);
        if (Array.isArray(data.points)) {
            data.points = data.points.map((point) => {
                if (typeof point === 'string') return rewriteWalletCycleCopy(point);
                if (point && typeof point === 'object') {
                    return {
                        ...point,
                        text: rewriteWalletCycleCopy(point.text || ''),
                        title: typeof point.title === 'string' ? rewriteWalletCycleCopy(point.title) : point.title,
                    };
                }
                return point;
            });
        }
    }
    return payload;
}

module.exports = { rewriteWalletCycleCopy, rewriteContentPayload };
