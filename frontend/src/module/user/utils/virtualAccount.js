const DAY_MS = 24 * 60 * 60 * 1000;

export function getVaView(userData) {
    const fromApi = userData?.virtualAccount;
    if (fromApi && typeof fromApi === 'object' && fromApi.status) {
        return fromApi;
    }

    const card = userData?.withdrawalCard || {};
    const status = String(card.status || 'none');
    const unlocked = !!userData?.isPaid && status === 'active';
    const expired = status === 'expired';
    const exp = card.expiresAt ? new Date(card.expiresAt) : null;
    const now = Date.now();

    let daysUntilExpiry = null;
    if (unlocked && exp && !Number.isNaN(exp.getTime())) {
        daysUntilExpiry = Math.max(0, Math.ceil((exp.getTime() - now) / DAY_MS));
    }

    let daysUntilPendingWipe = null;
    let wipeCycle = 0;
    if (expired && exp && !Number.isNaN(exp.getTime())) {
        const days = Math.max(0, Math.floor((now - exp.getTime()) / DAY_MS));
        const applied = Number(card.pendingWipesApplied) || 0;
        wipeCycle = applied + 1;
        daysUntilPendingWipe = Math.max(0, wipeCycle * 14 - days);
    } else if (!unlocked && !expired && (userData?.createdAt || userData?.kycApprovedAt || userData?.kyc?.approvedAt)) {
        const start = new Date(userData.createdAt || userData.kycApprovedAt || userData.kyc.approvedAt);
        const days = Math.max(0, Math.floor((now - start.getTime()) / DAY_MS));
        const applied = Number(userData?.inviteInactive?.pendingWipesApplied) || 0;
        wipeCycle = applied + 1;
        daysUntilPendingWipe = Math.max(0, wipeCycle * 14 - days);
    }

    return {
        status,
        unlocked,
        expired,
        daysUntilExpiry,
        renewSoon: unlocked && daysUntilExpiry != null && daysUntilExpiry <= 7,
        daysUntilPendingWipe,
        wipeCycle,
        virtualBalance: Number(userData?.wallet?.virtualBalance) || 0,
        pendingBalance: Number(userData?.wallet?.pendingBalance) || 0,
    };
}
