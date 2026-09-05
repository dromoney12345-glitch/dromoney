jest.mock('../../models/Transaction', () => ({
    create: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../models/ReferralTransaction', () => ({
    find: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
}));

const ReferralTransaction = require('../../models/ReferralTransaction');
const {
    getCardQuote,
    applyKycPendingWipeCycles,
    activateVirtualWallet,
    getVirtualAccountView,
    neverCreatedVirtualAccount,
} = require('../../utils/walletLedger');

function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function makeFirstTimeUser({ pending = 150, createdAt } = {}) {
    return {
        _id: 'invitee1',
        isPaid: false,
        name: 'Trisha',
        createdAt,
        inviteInactive: { pendingWipesApplied: 0 },
        wallet: {
            balance: 0,
            pendingBalance: pending,
            virtualBalance: 0,
            lifetimeEarnings: pending,
            todayEarnings: 0,
            referralEarnings: 0,
            walletSplitMigrated: true,
        },
        withdrawalCard: {
            status: 'none',
            lockedReserve: 0,
            quotedCredit: 0,
        },
    };
}

describe('First-time Virtual Account + registration 14-day pending cycle', () => {
    const registeredAt = new Date('2026-01-01T00:00:00.000Z');

    beforeEach(() => {
        ReferralTransaction.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([]),
        });
    });

    test('within 3 days of registration: ₹499 with ₹399 reserve credit', () => {
        const user = makeFirstTimeUser({ createdAt: registeredAt });
        const quote = getCardQuote(user, {}, addDays(registeredAt, 2));
        expect(quote.amount).toBe(499);
        expect(quote.credit).toBe(399);
        expect(quote.isRenewal).toBe(false);
    });

    test('after 3 days: still ₹499 with no ₹550 and no reserve credit', () => {
        const user = makeFirstTimeUser({ createdAt: registeredAt });
        const quote = getCardQuote(user, {}, addDays(registeredAt, 10));
        expect(quote.amount).toBe(499);
        expect(quote.credit).toBe(0);
    });

    test('Pending is not wiped before day 14', async () => {
        const user = makeFirstTimeUser({ pending: 150, createdAt: registeredAt });
        const result = await applyKycPendingWipeCycles(user, addDays(registeredAt, 13));
        expect(result.wiped).toBe(0);
        expect(user.wallet.pendingBalance).toBe(150);
    });

    test('day 14 / 28 / 42 clear Pending until Virtual Account is created', async () => {
        const user = makeFirstTimeUser({ pending: 80, createdAt: registeredAt });

        const d14 = await applyKycPendingWipeCycles(user, addDays(registeredAt, 14));
        expect(d14.wiped).toBe(80);
        expect(user.wallet.pendingBalance).toBe(0);
        expect(user.inviteInactive.pendingWipesApplied).toBe(1);

        user.wallet.pendingBalance = 55;
        const d28 = await applyKycPendingWipeCycles(user, addDays(registeredAt, 28));
        expect(d28.wiped).toBe(55);
        expect(user.inviteInactive.pendingWipesApplied).toBe(2);

        user.wallet.pendingBalance = 40;
        const d42 = await applyKycPendingWipeCycles(user, addDays(registeredAt, 42));
        expect(d42.wiped).toBe(40);
        expect(user.inviteInactive.pendingWipesApplied).toBe(3);
        expect(neverCreatedVirtualAccount(user)).toBe(true);
    });

    test('invite holds stay in Pending when the referrer buys a Virtual Account', async () => {
        ReferralTransaction.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ amount: 200 }]),
        });
        const user = makeFirstTimeUser({ pending: 350, createdAt: registeredAt });
        await activateVirtualWallet(user);
        expect(user.wallet.pendingBalance).toBe(200);
        expect(user.wallet.virtualBalance).toBe(150);
        expect(user.isPaid).toBe(true);
        expect(user.withdrawalCard.status).toBe('active');
    });

    test('view helper reports days until the next first-time Pending wipe', () => {
        const user = makeFirstTimeUser({ pending: 90, createdAt: registeredAt });
        const view = getVirtualAccountView(user, addDays(registeredAt, 5));
        expect(view.expired).toBe(false);
        expect(view.unlocked).toBe(false);
        expect(view.daysUntilPendingWipe).toBe(9);
        expect(view.wipeCycle).toBe(1);
    });
});
