# DROMONEY — Backend Logic PDF vs Codebase Audit

> Generated: Aug 18, 2026
> Source: `Backend logic .pdf` (7 pages)
> Compared against: Full backend + frontend codebase

---

## OVERALL SUMMARY

| # | Feature | Backend | Frontend | Priority |
|---|---------|---------|----------|----------|
| 1 | Invite & Earn ₹200 | **DONE** | **PARTIAL** | Medium |
| 2 | 28-Day Timer (3/7/14/28) | **DONE** | **MISSING** | High |
| 3 | Withdrawal Card (₹499) | **DONE** | **DONE** | Low |
| 4 | Pending vs Virtual Wallet | **DONE** | **DONE** | Low |
| 5 | ₹399 Non-Withdrawable | **DONE** | **MISSING** | Medium |
| 6 | Future Fund (3 criteria) | **PARTIAL** | **DONE** | High |
| 7 | Ad/Task → Fund Pool | **MISSING** | **PARTIAL** | High |
| 8 | Offerwall / Daily Task | **PARTIAL** | **PARTIAL** | Medium |
| 9 | Business Subscription | **DONE** | **DONE** | Low |

---

## DETAILED FEATURE ANALYSIS

---

### 1. INVITE & EARN ₹200

**PDF Spec:**
- User A invites User B → User B KYC complete → ₹200 goes to User A's **Pending Wallet**
- ₹200 releases to Virtual Wallet only when User B creates Withdrawal Card
- If User B is suspended (28 days no card) → ₹200 permanently removed

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| ₹200 credit to Pending on KYC | `referralReward.js` → `creditReferralOnKyc()` | Done |
| Release to Virtual on card creation | `referralReward.js` → `releaseReferralToVirtual()` | Done |
| Clawback on 28-day suspension | `inviteInactivityCron.js` → `clawbackInvite()` | Done |
| ReferralTransaction model (Pending/Completed/Failed) | `ReferralTransaction.js` | Done |
| Configurable commission via Settings | `Settings.referralCommission` | Done |
| Self-referral blocked | `authController.register` | Done |

**Frontend Status: PARTIAL**
| What | File | Status |
|------|------|--------|
| Shows ₹200 invite reward amount | `Income.jsx` | Done |
| Shows pending balance | `Income.jsx`, `Wallet.jsx` | Done |
| Per-invite status (which invite pending/released) | — | **MISSING** |
| Release conditions explanation | — | **MISSING** |

**Remaining Work:**
- [ ] Frontend: Show per-invite breakdown (name, KYC date, card status, timer)
- [ ] Frontend: Show release conditions ("₹200 releases when invitee creates card")

---

### 2. 28-DAY TIMER PER INVITE (3/7/14/28 milestones)

**PDF Spec:**
- Each invite has **independent** 28-day timer starting from invitee's KYC date
- Day 3: Early card creation incentive
- Day 7: 10% penalty on referrer's pending
- Day 14: Pending earnings set to ₹0
- Day 28: Account permanently suspended, ₹200 removed, invite removed

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Day 7 penalty (10% of ₹200) | `inviteInactivityCron.js` → `applyDay7Penalty()` | Done |
| Day 14 pending wipe | `inviteInactivityCron.js` → `wipePendingEarnings()` | Done |
| Day 28 suspension + clawback | `inviteInactivityCron.js` → `clawbackInvite()` | Done |
| Per-user flags (day7Applied, day14Applied) | `User.inviteInactive` | Done |
| Cron runs every 6 hours | `server.js` | Done |
| Day 3 pricing incentive (₹399 credit) | `walletLedger.js` → `getCardQuote()` | Done |

**Frontend Status: MISSING**
| What | Status |
|------|--------|
| Per-invite countdown timer | **MISSING** |
| Penalty warning at Day 7 | **MISSING** |
| Pending wipe notice at Day 14 | **MISSING** |
| Suspension warning at Day 28 | **MISSING** |
| Milestone progress indicators | **MISSING** |

**Remaining Work:**
- [ ] Frontend: Add per-invite timer UI in Wallet/Income page
- [ ] Frontend: Push notification warnings at 3/7/14 days (backend cron exists)
- [ ] Frontend: Show penalty/wipe status in invite list

---

### 3. WITHDRAWAL CARD

**PDF Spec:**
- Card fee: ₹499
- ₹399 credited to Virtual Wallet (non-withdrawable)
- Card unlocks Virtual Wallet
- 6-month validity → renewal required
- Renewal price shown as ₹199 (₹699 crossed, ₹399 from wallet used)

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| ₹499 fee calculation | `walletLedger.js` → `getCardQuote()` | Done |
| ₹399 virtual credit (within 3 days) | `walletLedger.js` → `activateVirtualWallet()` | Done |
| 6-month expiry | `walletLedger.js` → `expiresAt` | Done |
| Auto-expire check | `walletLedger.js` → `ensureWithdrawalCardShape()` | Done |
| 10% penalty after 7 days (₹550) | `walletLedger.js` → `getCardQuote()` | Done |

| What | Status |
|------|--------|
| Dedicated renewal endpoint | **MISSING** (re-purchase works) |
| Renewal pricing display (₹699 → ₹199) | **MISSING** |

**Frontend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Card creation flow | `WithdrawalCard.jsx` | Done |
| Payment via PaymentModal | `PaymentModal.jsx` | Done |
| Card preview (name, dates) | `WithdrawalCard.jsx` | Done |
| Renewal flow (expired state) | `WithdrawalCard.jsx` | Done |
| ₹399 credit display after creation | — | **MISSING** |

**Remaining Work:**
- [ ] Backend: Add dedicated renewal endpoint with ₹199 pricing logic
- [ ] Frontend: Show ₹399 credited message after card activation
- [ ] Frontend: Show renewal pricing breakdown (₹699 → ₹199)

---

### 4. PENDING WALLET vs VIRTUAL WALLET

**PDF Spec:**
- Pending: only for display, cannot withdraw/use
- Virtual: withdrawable (with conditions)
- Flow: Pending → Condition Complete → Virtual → Withdrawal

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Dual wallet fields | `User.wallet` | Done |
| Credit routing (pending vs virtual) | `walletLedger.js` → `creditEarning()` | Done |
| Transfer pending → virtual | `walletLedger.js` → `transferPendingToVirtual()` | Done |
| Withdrawable calculation | `walletLedger.js` → `withdrawableVirtual()` | Done |
| Migration from old single wallet | `walletLedger.js` → `migrateWalletSplits()` | Done |

**Frontend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Dual pane (Pending/Virtual toggle) | `Wallet.jsx` | Done |
| Both balances displayed | `Wallet.jsx`, `Income.jsx` | Done |
| Transaction history per wallet | `Wallet.jsx` | Done |
| Filter by type (Invite/Task/Transferred) | `Wallet.jsx` | Done |

**Remaining Work:** None — fully implemented.

---

### 5. ₹399 NON-WITHDRAWABLE AMOUNT

**PDF Spec:**
- ₹399 shown in Virtual Wallet but CANNOT be withdrawn
- Acts as "Card renewal reserve"
- User sees it as balance but withdrawal blocked for this amount

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| ₹399 added to `lockedReserve` | `walletLedger.js` → `activateVirtualWallet()` | Done |
| Withdrawable = virtualBalance - lockedReserve | `walletLedger.js` → `withdrawableVirtual()` | Done |
| Withdrawal checks withdrawable amount | `walletController.requestWithdrawal` | Done |

**Frontend Status: MISSING**
| What | Status |
|------|--------|
| Show "₹399 reserved (non-withdrawable)" label | **MISSING** |
| Show withdrawable vs total virtual | **MISSING** |
| Explain ₹399 purpose in UI | **MISSING** |

**Remaining Work:**
- [ ] Frontend: Show `Withdrawable: ₹X` and `Reserved: ₹399` in Virtual Wallet
- [ ] Frontend: Add info tooltip explaining ₹399 is for card renewal

---

### 6. FUTURE FUND

**PDF Spec:**
- 3 criteria: 10 KYC, 50 Ads, 50 Tasks
- Revenue from other users' ads/tasks goes into Fund Pool
- Pool distributed daily to active Fund users
- Admin configures distribution

**Backend Status: PARTIAL**
| What | File | Status |
|------|------|--------|
| 3 criteria sync | `futureFund.js` → `syncFutureFundCriteria()` | Done |
| Configurable targets | `Settings` (futureFundKycTarget etc.) | Done |
| Activity tracking | `futureFund.js` → `addFutureFundActivity()` | Done |
| Fund estimation endpoint | `userController.getFutureFundEstimation` | Done |
| **Actual pool accumulation** | — | **MISSING** |
| **Real revenue → pool routing** | — | **MISSING** |
| **Daily distribution payout** | — | **MISSING** |

**Frontend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| 3-criteria progress bars | `FutureFund.jsx` | Done |
| Activate Fund button | `FutureFund.jsx` | Done |
| Today/Lifetime earnings | `FutureFund.jsx` | Done |
| Daily ad/task progress | `FutureFund.jsx` | Done |

**Remaining Work:**
- [ ] Backend: Create `FutureFundPool` model to track real revenue
- [ ] Backend: Route percentage of ad/task revenue into pool
- [ ] Backend: Daily distribution cron to split pool among active users
- [ ] Backend: Admin endpoint to configure/trigger distribution

---

### 7. AD + TASK REVENUE → FUTURE FUND POOL

**PDF Spec:**
- Users watch ads, complete tasks → platform gets revenue
- Eligible portion of revenue goes to Future Fund pool
- Pool distributed to active Fund users

**Backend Status: MISSING**
| What | Status |
|------|--------|
| Ad reward → coins (no INR routing) | Exists but no pool routing |
| Task reward → coins (no INR routing) | Exists but no pool routing |
| Revenue tracking per ad/task | **MISSING** |
| Fund pool accumulation | **MISSING** |
| Revenue → pool percentage config | **MISSING** |

**Frontend Status: PARTIAL**
| What | Status |
|------|--------|
| WatchAndEarn rewards coins | Done |
| Earn/TaskRunner rewards coins | Done |
| "Earnings credited to pending wallet" messaging | **MISSING** |

**Remaining Work:**
- [ ] Backend: Add revenue tracking per ad view / task completion
- [ ] Backend: Configure % of revenue allocated to Fund Pool
- [ ] Backend: Accumulate into FutureFundPool daily
- [ ] Frontend: Show wallet destination messaging for earnings

---

### 8. OFFERWALL / DAILY TASK

**PDF Spec:**
- Company pays platform (e.g., ₹30)
- Platform keeps commission
- User gets remainder (e.g., ₹20) → Virtual Wallet (or Pending if Virtual not active)

**Backend Status: PARTIAL**
| What | File | Status |
|------|------|--------|
| Coin rewards for tasks | `walletController.addCoins` | Done |
| Coin rewards for ads | `adController.rewardUserForAd` | Done |
| Daily limits, cooldowns | Both controllers | Done |
| Task Booster multiplier | `walletController` | Done |
| **Company payout → commission split** | — | **MISSING** |
| **Coins → INR conversion** | — | **MISSING** |
| **Third-party offerwall integration** | — | **MISSING** |

**Frontend Status: PARTIAL**
| What | Status |
|------|--------|
| Task completion UI | Done |
| Ad watching UI | Done |
| Coin balance display | Done |
| INR earning from tasks | **MISSING** |

**Remaining Work:**
- [ ] Backend: Implement company payout → platform commission → user earning split
- [ ] Backend: Coin-to-INR conversion mechanism (or direct INR crediting)
- [ ] Backend: Offerwall postback handler for third-party integrations
- [ ] Frontend: Show INR earnings from tasks (not just coins)

---

### 9. BUSINESS IDEA / SUBSCRIPTION

**PDF Spec:**
- User selects Business Idea
- Monthly subscription payment
- Payment → Business Service active
- Separate from Invite/Fund calculations

**Backend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Business plan payment approval | `adminPaymentController` | Done |
| Support expiry setting | `adminPaymentController` | Done |
| Configurable plans | `Settings.businessPlans[]` | Done |
| Idea unlock tracking | `User.unlockedIdeas` | Done |
| **Auto-expiry cron** | — | **MISSING** |
| **Recurring billing** | — | **MISSING** |

**Frontend Status: IMPLEMENTED**
| What | File | Status |
|------|------|--------|
| Multi-step flow (Intro → Listing → Details → Subscribe → Hub) | `BusinessIdeas.jsx` | Done |
| Plan selection + payment | `BusinessIdeas.jsx` + `PaymentModal.jsx` | Done |
| Subscription gate (supportExpiry check) | `BusinessIdeas.jsx` | Done |
| Active plan display | `BusinessIdeas.jsx` | Done |

**Remaining Work:**
- [ ] Backend: Add business plan auto-expiry cron
- [ ] Backend: Optional recurring billing integration

---

## PRIORITY ACTION ITEMS

### HIGH PRIORITY (Core money flow gaps)
1. **Future Fund Pool** — No real pool exists. Need `FutureFundPool` model, revenue routing, daily distribution cron
2. **Ad/Task → Pool Revenue** — Currently rewards coins only, no revenue tracking or pool allocation
3. **28-Day Timer Frontend** — Backend cron works but user sees NO warnings or timers

### MEDIUM PRIORITY (UX gaps)
4. **₹399 Reserve Display** — Backend enforces it, but frontend doesn't show reserved vs withdrawable
5. **Per-Invite Tracking** — No UI for invite status breakdown (pending/released/failed per invite)
6. **Coin → INR** — Tasks/Ads give coins but PDF says earnings should go to wallets
7. **Renewal Pricing** — Card renewal shows full price, not ₹199 as PDF describes

### LOW PRIORITY (Polish)
8. **Business Plan Auto-Expiry** — Currently client-side only
9. **Offerwall Integration** — Third-party SDK/postback not yet needed (future scope)
10. **Recurring Billing** — Not critical now (manual admin approval works)

---

## FILES REFERENCE

### Backend Files Reviewed
| File | Role |
|------|------|
| `controllers/walletController.js` | Coin awards, withdrawal requests |
| `controllers/userController.js` | KYC, unlock, Future Fund, withdrawal card |
| `controllers/authController.js` | Register (referral link), login, wallet migration |
| `controllers/adController.js` | Ad watching, coin rewards |
| `controllers/adminPaymentController.js` | Payment approval, wallet activation |
| `utils/referralReward.js` | ₹200 hold/release/clawback |
| `utils/futureFund.js` | 3-criteria sync, activity tracking |
| `utils/walletLedger.js` | Pending/Virtual split, card quote, reserve |
| `cron/inviteInactivityCron.js` | 7/14/28-day penalties |
| `models/User.js` | Full schema |
| `models/Settings.js` | Configurable targets/fees |
| `models/Transaction.js` | Ledger |
| `models/ReferralTransaction.js` | Invite tracking |
| `server.js` | Cron registration |

### Frontend Files Reviewed
| File | Role |
|------|------|
| `pages/Income.jsx` | Income options, wallet preview |
| `pages/Wallet.jsx` | Dual wallet pane, history |
| `pages/FutureFund.jsx` | 3-criteria, earnings |
| `pages/WatchAndEarn.jsx` | Ad watching |
| `pages/Earn.jsx` | Task completion |
| `pages/BusinessIdeas.jsx` | Business subscription flow |
| `pages/WithdrawalCard.jsx` | Card creation/renewal |
| `components/PaymentModal.jsx` | UPI payment flow |
| `context/UserContext.jsx` | User state management |
