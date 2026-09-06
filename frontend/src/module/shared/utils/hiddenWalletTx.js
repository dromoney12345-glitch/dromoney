/** Legacy ad INR credits — ads no longer pay; keep history clean. */
const HIDDEN_WALLET_SOURCE =
    /ad\s*earning|reward\s*ad|watched\s*reward|ad\s*reward|admob|ad\s*view\s*conversion|watch(?:ed)?\s*(?:&|and)?\s*earn/i;

export function isHiddenWalletTransaction(tx) {
    if (!tx) return false;
    const source = `${tx.source || ''} ${tx.title || ''}`;
    return HIDDEN_WALLET_SOURCE.test(source);
}
