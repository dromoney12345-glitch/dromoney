export const GUIDES = {
    invite: {
        title: 'How to Invite',
        subtitle: 'Invite & Earn ₹200',
        next: '/user/marketing',
        points: [
            'Copy or share your Invite link.',
            'Your friend downloads the app and completes KYC.',
            'After their KYC, ₹200 appears in your Pending Wallet.',
            '₹200 moves to Virtual Wallet only after they create a Withdrawal Card and unlock it.',
            'If the invited user stays inactive for 28 days, the invite and ₹200 can be removed.',
        ],
    },
    fund: {
        title: 'How to open Future Fund',
        subtitle: 'Watch + Tasks to grow your fund',
        next: '/user/future-fund',
        points: [
            'To activate: 10 successful KYC, 50 ads watched, 50 tasks completed.',
            'Watch Advertisement and Complete Tasks stay at the top.',
            'You will see progress and a small earning animation — not coins.',
            'After the fund is active, a daily share goes to Virtual Wallet if it is unlocked, else Pending.',
        ],
    },
    daily: {
        title: 'Daily Work & Earn',
        subtitle: 'Tasks / offer tasks',
        next: '/user/earn',
        points: [
            'This Daily Work system replaces the old Events option.',
            'Open a task, complete it, and earning is credited to the matching wallet.',
            'If Virtual Wallet is unlocked, earning goes there. Otherwise it goes to Pending.',
            'This earning has no 7–28 day hold.',
        ],
    },
    options: {
        title: 'Future & Options',
        subtitle: 'Upcoming earning updates',
        next: '/user/info/future-features',
        points: [
            'This is an information and announcement section only.',
            'New earning options and upcoming features will appear here.',
            'No extra payment is required to open this section.',
        ],
    },
    business: {
        title: 'How to start a business',
        subtitle: 'Business Ideas',
        next: '/user/business-ideas',
        points: [
            'Business is now a direct option in bottom navigation.',
            'Explore ideas and start your business from the existing system.',
            'The core business flow stays the same — only placement and this guide are new.',
        ],
    },
    wallet: {
        title: 'Wallet Guide',
        subtitle: 'Pending + Virtual',
        next: '/user/wallet',
        points: [
            'Pending Wallet holds processing amounts.',
            'Virtual Wallet is withdrawable after the Withdrawal Card is approved.',
            'Card details auto-fill: Name, Number, Today, Expiry (6 months).',
            'Pay ₹499 (or ₹550 after inactivity) → admin approval → Virtual unlock.',
        ],
    },
    kyc: {
        title: 'How to do KYC',
        subtitle: 'Aadhaar verification',
        next: '/user/income',
        points: [
            'Opening Income takes you to KYC first if it is not done.',
            'Enter your 12-digit Aadhaar number and upload the photo.',
            'After admin approval, Income opens for free — no ₹499 access fee.',
            'A separate Withdrawal Card is needed for withdrawals.',
        ],
    },
    card: {
        title: 'How to create a Withdrawal Card',
        subtitle: 'Unlock Virtual Wallet',
        next: '/user/withdrawal-card',
        points: [
            'Name, number and dates are filled automatically.',
            'Tap Next to pay ₹499.',
            'After admin approval, Virtual Wallet unlocks.',
            'The card expires every 6 months — renew when it expires.',
        ],
    },
    withdraw: {
        title: 'How to withdraw',
        subtitle: 'Redeem from Virtual Wallet',
        next: '/user/wallet',
        points: [
            'Withdrawals work only from an unlocked Virtual Wallet.',
            'Enter UPI or bank details to redeem.',
            'The ₹399 3-day reserve cannot be withdrawn immediately.',
        ],
    },
    earn500: {
        title: 'How to earn ₹500 daily',
        subtitle: 'Steady daily work',
        next: '/user/income',
        points: [
            'Use Invite, Future Fund Watch/Tasks, and Daily Work together.',
            'More consistent work means a larger Future Fund share.',
            'This is not a guaranteed salary — earnings depend on your activity.',
        ],
    },
    tasks: {
        title: 'How to complete tasks',
        subtitle: 'Daily work',
        next: '/user/earn',
        points: [
            'Open Income → Daily Work, or Future Fund → Complete Tasks.',
            'Read the instructions and submit proof.',
            'On completion, earning is sent to Virtual or Pending Wallet.',
        ],
    },
};

/** 8 cards — row 1: KYC, Invite, Card, Withdraw · row 2: ₹500, Fund, Tasks, Business */
export const HOME_GUIDE_CARDS = [
    { slug: 'kyc', label: 'How to do KYC?', icon: 'ClipboardCheck', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    { slug: 'invite', label: 'How to Invite?', icon: 'UserPlus', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { slug: 'card', label: 'Create Withdrawal Card', icon: 'CreditCard', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { slug: 'withdraw', label: 'How to Withdraw?', icon: 'Wallet', iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
    { slug: 'earn500', label: 'Earn ₹500 Daily', icon: 'TrendingUp', iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
    { slug: 'fund', label: 'Open Future Fund', icon: 'PiggyBank', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { slug: 'tasks', label: 'Complete Tasks', icon: 'ListChecks', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    { slug: 'business', label: 'Start a Business', icon: 'Building2', iconBg: 'bg-[#FFF5F0]', iconColor: 'text-[#C2520A]' },
];
