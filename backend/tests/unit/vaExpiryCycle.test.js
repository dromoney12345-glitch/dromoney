jest.mock('../../models/Transaction', () => ({
    create: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../models/ReferralTransaction', () => ({
    find: jest.fn(() => ({
        select: jest.fn().mockResolvedValue([]),
    })),
    findOne: jest.fn().mockResolvedValue(null),
}));

const {
    isVirtualUnlocked,
    expireVirtualAccountIfDue,
    applyPendingWipeCycles,
    pendingWipeCyclesDue,
    creditEarning,
    activateVirtualWallet,
    withdrawableVirtual,
} = require('../../utils/walletLedger');

function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function makeUser({ virtual = 800, pending = 0, status = 'active', expiresAt } = {}) {
    const issued = new Date('2026-01-01T00:00:00.000Z');
    return {
        _id: 'user1',
        isPaid: status === 'active',
        name: 'Priya',
        phone: '9876543210',
        wallet: {
            balance: virtual,
            pendingBalance: pending,
            virtualBalance: virtual,
            lifetimeEarnings: virtual + pending,
            todayEarnings: 0,
            referralEarnings: 0,
            walletSplitMigrated: true,
        },
        withdrawalCard: {
            status,
            issuedAt: issued,
            expiresAt: expiresAt || addDays(issued, 181),
            lockedReserve: 0,
            pendingWipesApplied: 0,
            quotedCredit: 0,
        },
    };
}

describe('Virtual Account expiry + 14-day pending cycle', () => {
    const expiresAt = new Date('2026-07-01T00:00:00.000Z');

    test('expiry locks the card but does not delete Virtual balance', () => {
        const user = makeUser({ virtual: 800, expiresAt });
        const changed = expireVirtualAccountIfDue(user, expiresAt);
        expect(changed).toBe(true);
        expect(user.isPaid).toBe(false);
        expect(user.withdrawalCard.status).toBe('expired');
        expect(user.wallet.virtualBalance).toBe(800);
        expect(withdrawableVirtual(user, expiresAt)).toBe(0);
        expect(isVirtualUnlocked(user, expiresAt)).toBe(false);
    });

    test('new earnings after expiry go to Pending, not Virtual', async () => {
        const user = makeUser({ virtual: 800, expiresAt });
        expireVirtualAccountIfDue(user, expiresAt);
        const result = await creditEarning(user, 200, { source: 'Invite', createTx: false });
        expect(result.destination).toBe('pending');
        expect(user.wallet.virtualBalance).toBe(800);
        expect(user.wallet.pendingBalance).toBe(200);
    });

    test('Pending is not wiped before day 14', () => {
        const user = makeUser({ virtual: 800, pending: 150, status: 'expired', expiresAt });
        user.isPaid = false;
        const day13 = addDays(expiresAt, 13);
        const result = applyPendingWipeCycles(user, day13);
        expect(pendingWipeCyclesDue(user, day13)).toBe(0);
        expect(result.wiped).toBe(0);
        expect(user.wallet.pendingBalance).toBe(150);
        expect(user.wallet.virtualBalance).toBe(800);
    });

    test('day 14 clears Pending only; Virtual stays', () => {
        const user = makeUser({ virtual: 800, pending: 150, status: 'expired', expiresAt });
        user.isPaid = false;
        const day14 = addDays(expiresAt, 14);
        const result = applyPendingWipeCycles(user, day14);
        expect(result.wiped).toBe(150);
        expect(result.cyclesDue).toBe(1);
        expect(user.wallet.pendingBalance).toBe(0);
        expect(user.wallet.virtualBalance).toBe(800);
    });

    test('14 / 28 / 42 cycles keep wiping only new Pending', () => {
        const user = makeUser({ virtual: 800, pending: 40, status: 'expired', expiresAt });
        user.isPaid = false;

        applyPendingWipeCycles(user, addDays(expiresAt, 14));
        expect(user.wallet.pendingBalance).toBe(0);

        user.wallet.pendingBalance = 55;
        applyPendingWipeCycles(user, addDays(expiresAt, 28));
        expect(user.wallet.pendingBalance).toBe(0);
        expect(user.withdrawalCard.pendingWipesApplied).toBe(2);

        user.wallet.pendingBalance = 70;
        applyPendingWipeCycles(user, addDays(expiresAt, 42));
        expect(user.wallet.pendingBalance).toBe(0);
        expect(user.withdrawalCard.pendingWipesApplied).toBe(3);
        expect(user.wallet.virtualBalance).toBe(800);
    });

    test('renewal unlocks old Virtual and moves current Pending into Virtual', async () => {
        const user = makeUser({ virtual: 800, pending: 120, status: 'expired', expiresAt });
        user.isPaid = false;
        await activateVirtualWallet(user, { isRenewal: true });
        expect(user.isPaid).toBe(true);
        expect(user.withdrawalCard.status).toBe('active');
        expect(user.wallet.pendingBalance).toBe(0);
        expect(user.wallet.virtualBalance).toBe(920);
        expect(isVirtualUnlocked(user)).toBe(true);
        expect(withdrawableVirtual(user)).toBe(920);
    });

    test('view helper reports days until the next Pending wipe', () => {
        const { getVirtualAccountView } = require('../../utils/walletLedger');
        const user = makeUser({ virtual: 800, pending: 90, status: 'expired', expiresAt });
        user.isPaid = false;
        const view = getVirtualAccountView(user, addDays(expiresAt, 5));
        expect(view.expired).toBe(true);
        expect(view.unlocked).toBe(false);
        expect(view.virtualBalance).toBe(800);
        expect(view.pendingBalance).toBe(90);
        expect(view.daysUntilPendingWipe).toBe(9);
        expect(view.wipeCycle).toBe(1);
    });
});
