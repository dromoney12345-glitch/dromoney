export function defaultAffiliateHowItWorks(amount = 200) {
    return (
        `Share your invite link. After your friend registers, ₹${amount} goes to your Pending Wallet. ` +
        'It moves to Virtual when they create a Virtual Account. ' +
        'If they do not create a Virtual Account, their Pending is cleared every 14 days (14, 28, 42…) until they buy one. ' +
        'After a 6-month Virtual Account expires, the same 14-day Pending cycle runs until they renew. Old Virtual balance is never deleted.'
    );
}

export function rewriteWalletCycleCopy(text) {
    if (typeof text !== 'string' || !text) return text;
    let out = text
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
            'when they register, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account.'
        )
        .replace(
            /when they complete KYC, ₹200 goes to your Pending Wallet\. It moves to Virtual when they create a Virtual Account\.?/gi,
            'when they register, ₹200 goes to your Pending Wallet. It moves to Virtual when they create a Virtual Account.'
        )
        .replace(
            /After your friend completes KYC, ₹(\d+) goes to your Pending Wallet\.?/gi,
            'After your friend registers, ₹$1 goes to your Pending Wallet.'
        )
        .replace(
            /Friend Completes KYC[\s\S]*?(?=\n\n|💰|$)/gi,
            'Friend Registers\nYour invited friend downloads the app from your Play Store invite link and registers.\n\n'
        )
        .replace(
            /After KYC verification, ₹(\d+) appears in your Pending Wallet\.?/gi,
            'Right after they register, ₹$1 appears in your Pending Wallet.'
        )
        .replace(
            /Your invited friend downloads the app and completes their Aadhaar verification\.?/gi,
            'Your invited friend downloads the app from your Play Store invite link and registers.'
        )
        .replace(
            /\d+\.\s*Friend app\s*खोलकर\s*अपनी\s*KYC[^\n]*/gi,
            '3. Friend aapki invite link se app download karke register karta hai.'
        )
        .replace(
            /\d+\.\s*KYC\s*complete\s*होते\s*ही[^\n]*/gi,
            '4. Register hote hi aapke Pending Wallet mein ₹200 aa jata hai. Jab wo Virtual Account banate hain, ye Virtual mein chala jata hai.'
        )
        .replace(
            /⌛?\s*Verification Process\s*\(14[–\-‐]?28\s*Days?\)[\s\S]*?(?=\n\n[🔗📱💰✅]|\n*$)/gi,
            '✅ Virtual Account unlock\nFriend Virtual Account banaye to aapka ₹200 Pending se Virtual mein move hota hai. Bina VA ke unka Pending har 14 din (14, 28, 42…) clear hota hai.'
        )
        .replace(
            /जब आपका friend\s*KYC\s*Complete\s*करता\s*है/gi,
            'जब आपका friend Register करता है'
        )
        .replace(
            /जब वे KYC पूरा करके Virtual Account बनाते हैं, तो आपके वॉलेट में रेफरल रिवॉर्ड इंसटेंट ऐड हो जाता है।?/g,
            'जब वे रजिस्टर करते हैं, ₹200 आपके Pending Wallet में जाता है। जब वे Virtual Account बनाते हैं, तब यह Virtual में जाता है। VA न बनाने पर उनका Pending हर 14 दिन (14, 28, 42…) पर clear होता है।'
        )
        .replace(
            /जब वे KYC पूरा करते हैं, ₹200 आपके Pending Wallet में जाता है।?/g,
            'जब वे रजिस्टर करते हैं, ₹200 आपके Pending Wallet में जाता है।'
        )
        .replace(/KYC\s*\(Aadhaar\s*verification\)/gi, 'registration')
        .replace(/\bKYC\s*Complete\b/gi, 'Register')
        .replace(/\bcompletes?\s+KYC\b/gi, 'registers')
        .replace(/\bKYC\s+verification\b/gi, 'registration')
        .replace(/\bAadhaar\s+verification\b/gi, 'registration');

    // If leftover KYC/Aadhaar copy still dominates invite text, use clean default.
    if (/\bKYC\b|Aadhaar/i.test(out) && /invite|referral|Pending Wallet|₹\s*200/i.test(out)) {
        out = out
            .replace(/\bKYC\b/gi, 'registration')
            .replace(/Aadhaar/gi, 'account');
    }
    return out;
}

/** Prefer rewritten CMS text; fall back if KYC language remains. */
export function sanitizeAffiliateHowItWorks(text, amount = 200) {
    const rewritten = rewriteWalletCycleCopy(String(text || '').trim());
    if (!rewritten || /\bKYC\b|Aadhaar/i.test(rewritten)) {
        return defaultAffiliateHowItWorks(amount);
    }
    return rewritten;
}
