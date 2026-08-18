# Dromoney — Spec vs Implementation Status

**Source spec:** “NEW USER FLOW & UI/UX DEVELOPMENT REQUIREMENTS”  
**Last UI implementation:** 17 Aug 2026 — see `IMPLEMENTATION_LOG.md`

| Area | Spec work | Status |
|---|---|---|
| Frontend user screens (nav, Home, Income, guides, card) | This round | **DONE (visible)** |
| Backend money / wallet / invite / card / FF criteria | Prior + counters | **PARTIAL** |
| Coins / Events leftover | Explicit remove remaining | **PARTIAL** |
| Offerwall vendor | Needs later vendor doc | **NOT DONE** |

---

## 1. Bottom navigation — 4 options

| Spec | Existing app | Status |
|---|---|---|
| Home \| Income \| Business \| Profile | Home \| Income \| Wallet \| Watch \| Profile | **NOT DONE** |

**Files to change:** `frontend/src/module/user/UserLayout.jsx` (`navItems` still has 5 tabs)

---

## 2. Home page

| Spec item | Required change | Existing | Status |
|---|---|---|---|
| Remove Intro Video | Delete Home video card | `Home.jsx` still loads `platform_intro_video` | **NOT DONE** |
| Your Growth, Our Guide | New title section | Missing | **NOT DONE** |
| Guide cards | Small icon cards → open guides | Missing on Home (Help Center is separate) | **NOT DONE** |
| One-page compact scroll | Remove wallet, boosters, tiles clutter | Long Home: season, video, tiles, banners, wallet, boosters, ₹499 promo | **NOT DONE** |
| Logo + bell + 3-dot | Keep placement, update theme | Already in header | **KEEP / theme only** |
| Notification chip on bell | Attached “Zaroori jaankari” message | Only unread red dot | **NOT DONE** |
| Trust line | “100% Trusted Platform” | Footer copy only | **NOT DONE** |
| Footer policies | Privacy, Guidelines, Terms, No Refund — compact | All 4 pages exist, footer is heavy | **PARTIAL** (pages exist, restyle missing) |

**Files:** `frontend/src/module/user/pages/Home.jsx`

### Guide cards required (examples)

- KYC kaise karein  
- Invite kaise karein  
- Withdrawal Card kaise banayein  
- Withdrawal kaise karein  
- ₹500 rozana kaise kamayein  
- Tasks kaise complete karein  
- Business kaise shuru karein  

---

## 3. Income flow

| Spec | Existing | Status |
|---|---|---|
| Income tap → KYC page first | Already redirects to `/user/auth/kyc` if not started | **KEEP** |
| Aadhaar KYC (same system) | `KycSetup.jsx` + admin review | **KEEP** (theme only) |
| KYC complete → **free** Income | After KYC: **₹499 Buy Course & Unlock** | **NOT DONE** |
| Remove onboarding course as Income gate | 3-slide course after pay | **NOT DONE** |

**File still blocking Income:** `frontend/src/module/user/pages/Income.jsx` (₹499 layer + course intercept)

Also still `isPaid`-locked (UnlockModal):
- Marketing / Invite
- Earn / Tasks
- Events
- Watch
- Future Fund
- Business Ideas
- Wallet withdraw

---

## 4. Income page — only 4 options

| # | Spec | Existing Income cards | Status |
|---|---|---|---|
| 1 | Invite & Earn ₹200 | Earn ₹200 Per Referral | **KEEP feature, rename + rules** — UI still old |
| 2 | Future Fund | Future Fund | **KEEP page** — criteria/UI not updated on frontend |
| 3 | Rozana kaam karein aur kamayein | Earn Coins Daily | **NOT DONE** (still coins) |
| 4 | Future & Options | Future and Option | **KEEP** (info page exists) |
| — | Event | Free to Play / Events | **NOT DONE** (still on Income) |
| — | Start Your Journey | Start Your Journey | **NOT DONE** (still on Income, should move to Business tab) |
| — | Coin system | Earn Coins Daily + Watch + Wallet coins | **NOT DONE** |

**Guide before each option** (Guide → Skip → real page): **NOT DONE**  
No `GuidePage.jsx` exists.

**Wallet card inside Income** (Pending \| Virtual + View More): **NOT DONE**

---

## 5. Wallet + Withdrawal Card

| Spec | Backend | Frontend | Status |
|---|---|---|---|
| Pending Wallet + Virtual Wallet | Fields on `User.wallet` + `walletLedger.js` | Wallet still Cash + Coins single balance | **PARTIAL** |
| Wallet moved off Home / off bottom nav | — | Still Home card + Wallet tab | **NOT DONE** |
| Virtual locked until card | `isPaid` reused as unlock; `withdrawalCard.status` | UnlockModal still “Platform Locked ₹499” | **PARTIAL** |
| Create card: auto Name, Number, Today, Expiry | `GET /api/user/data/withdrawal-card` returns preview | No Withdrawal Card screen | **PARTIAL** |
| Next → ₹499 pay → admin approve → unlock | Payment rails exist; admin approve calls `activateVirtualWallet` | Payment still sold as platform / Income access | **PARTIAL** |
| 6-month expiry + Renew | `expiresAt = issued + 6 months`; expired → lock again | No Renew UI | **PARTIAL** |
| Coin system remove | Wallet UI / Earn / Watch still coins; ads still credit `COIN` | **NOT DONE** |

**Backend files (present):**
- `backend/models/User.js` — `pendingBalance`, `virtualBalance`, `withdrawalCard`, `kycApprovedAt`, `lifetimeAdsWatched`, `lifetimeTasksCompleted`
- `backend/utils/walletLedger.js`
- `backend/controllers/userController.js` — `getWithdrawalCard`
- `backend/routes/userDataRoutes.js` — `GET /withdrawal-card`
- `backend/controllers/walletController.js` — withdraw requires active card + virtual balance
- `backend/controllers/adminPaymentController.js` — approve → Virtual unlock

**Frontend files still old:**
- `frontend/src/module/user/pages/Wallet.jsx`
- `frontend/src/module/user/context/UserContext.jsx` (does not map pending/virtual)
- `frontend/src/module/user/components/UnlockModal.jsx`

---

## 6. Invite & Earn ₹200

| Spec rule | Existing / code | Status |
|---|---|---|
| Copy link + Share | `Marketing.jsx` | **KEEP** |
| User B KYC complete → User A +1 invite + ₹200 **Pending** | `creditReferralOnKyc` on admin KYC approve | **PARTIAL (backend)** |
| Not after ₹499 course | Old: KYC **+** `isPaid`. New backend pays on KYC only | **PARTIAL (backend)** |
| ₹200 stays Pending until B unlocks Virtual | `releaseReferralToVirtual` on card/payment | **PARTIAL (backend)** |
| Marketing page requires `isPaid` | Still UnlockModal | **NOT DONE** (will block invite after free KYC) |
| Profile “Referral” → “Invite” | Still “My Referrals” | **NOT DONE** |

### Inactivity cases (User B after KYC)

| Case | Spec | Code | Status |
|---|---|---|---|
| 3 days — card made | ₹100 platform charge, B Virtual ₹399 locked 6 months; A ₹200 → Virtual | Quote `credit: 399` if days ≤ 3; release on unlock | **PARTIAL** |
| 7 days no card | Pay ₹550, B Virtual ₹0, 10% penalty onto A Pending ₹200 | Cron + `applyDay7Penalty`; quote amount 550 | **PARTIAL** |
| 14 days | Wipe B Pending earnings | Cron `wipePendingEarnings` | **PARTIAL** |
| 28 days | B suspended, A invite + ₹200 removed | Cron `isBlocked` + `clawbackInvite` | **PARTIAL** |

**File:** `backend/cron/inviteInactivityCron.js` — registered in `server.js`  
**Missing:** UI copy/guides explaining these rules; lifetime ad/task counters not incremented yet so FF progress won’t move.

---

## 7. Future Fund

| Spec | Existing | Status |
|---|---|---|
| Guide + Skip then main page | No guide | **NOT DONE** |
| Criteria: 10 KYC, 50 ads, 50 tasks | Backend `futureFund.js` uses these | **PARTIAL (backend)** |
| Old criteria: 10 paid sales + 15 min + 7 days | Frontend `FutureFund.jsx` still shows Sales / Minutes / Days | **NOT DONE (frontend)** |
| Watch + Tasks buttons **inside** Fund | Watch and Earn are separate tabs | **NOT DONE** |
| Progress bars | Exist but wrong metrics on UI | **PARTIAL** |
| Small earning animation (no coins) | Coins still awarded on ads/tasks | **NOT DONE** |
| Activate Fund → congratulations → drop criteria bars | Unlock API exists; UI old | **PARTIAL** |
| After active: Watch + Task permanent; ads/task progress only | Active page still shows tasks/ads/events/boosters | **NOT DONE** |
| Daily admin pool → Virtual if unlocked else Pending | Cron still credits `wallet.balance` (old single wallet) | **NOT DONE** |
| `lifetimeAdsWatched` / `lifetimeTasksCompleted` increment | Fields exist; **controllers never increment them** | **NOT DONE** |

**Settings defaults updated:** `futureFundWatchAdTarget: 50`, `futureFundDailyTasksTarget: 50`, `futureFundKycTarget: 10`

---

## 8. Rozana kaam (Daily work)

| Spec | Existing | Status |
|---|---|---|
| Replace Event option | Events still on Income | **NOT DONE** |
| Offerwall / company tasks | First-party tasks → coins | **NOT DONE** |
| Earning → Virtual or Pending, no 7–28 hold | `addCoins` still credits **coins** | **NOT DONE** |

Need later **Task Rules / vendor** document (spec §39).

---

## 9. Future & Options

| Spec | Existing | Status |
|---|---|---|
| Info / announcements only | `/user/info/future-features` | **KEEP** |
| Guide before open | Missing | **NOT DONE** |
| Theme | Old | **NOT DONE** |

---

## 10. Business (bottom nav)

| Spec | Existing | Status |
|---|---|---|
| Move Start Your Journey out of Income | Still Income card 5 | **NOT DONE** |
| Bottom nav → Business | Missing tab | **NOT DONE** |
| Guide then existing ideas system | `BusinessIdeas.jsx` exists, locked by `isPaid` | **KEEP core / NOT DONE placement** |
| Theme | Old | **NOT DONE** |

---

## 11. Profile

| Spec | Existing | Status |
|---|---|---|
| Keep photo, KYC, help, feedback, logout | Present | **KEEP** |
| Referral → Invite | “My Referrals” | **NOT DONE** |
| Theme | Old | **NOT DONE** |

---

## 12. Coin system — remove completely

Still present:
- `User.coins`
- Wallet Coins tab
- Earn coins labels
- Watch ads → `currency: 'COIN'`
- Events join/spend coins
- Admin Coins & Tasks

**Status: NOT DONE**

---

## 13. Policies (footer)

| Page | Route | Status |
|---|---|---|
| Privacy Policy | `/user/info/privacy` | **KEEP** |
| Community Guidelines | `/user/info/guidelines` | **KEEP** |
| Terms & Conditions | `/user/info/terms` | **KEEP** |
| No Refund Policy | `/user/info/refund-policy` | **KEEP** |

Home footer restyle + trust line: **NOT DONE**

---

## 14. Backend files already added / changed

### New files
| File | Role |
|---|---|
| `backend/utils/walletLedger.js` | Pending vs Virtual, card quote, activate VW |
| `backend/cron/inviteInactivityCron.js` | 7 / 14 / 28 day rules |
| `SPEC_CHANGES_STATUS.md` | This document |

### Modified
| File | Change |
|---|---|
| `backend/models/User.js` | pending/virtual, withdrawalCard, kycApprovedAt, inactivity flags, lifetime counters |
| `backend/models/Settings.js` | FF KYC/50/50 defaults |
| `backend/models/ReferralTransaction.js` | default status `Pending` |
| `backend/utils/referralReward.js` | KYC → Pending ₹200; unlock → Virtual; clawback; 7-day penalty |
| `backend/utils/futureFund.js` | Criteria = 10 KYC / 50 ads / 50 tasks (no auto-activate) |
| `backend/controllers/adminUserController.js` | KYC approve → `creditReferralOnKyc` + `kycApprovedAt` |
| `backend/controllers/adminPaymentController.js` | Approve → `activateVirtualWallet` |
| `backend/controllers/userController.js` | `getWithdrawalCard`; unlock activates VW |
| `backend/controllers/walletController.js` | Balance returns pending/virtual; withdraw needs active card |
| `backend/controllers/authController.js` | On `/me`, migrate wallet split + card shape |
| `backend/routes/userDataRoutes.js` | `GET /withdrawal-card` |
| `backend/server.js` | Start inactivity cron |

### Backend still missing to finish spec
- Increment `lifetimeAdsWatched` on ad complete
- Increment `lifetimeTasksCompleted` on task complete
- Credit task/ad/FF INR via `creditEarning` (Virtual vs Pending), stop coins
- Future Fund cron write to pending/virtual not only `wallet.balance`
- Razorpay / Bulkpe paths should all call `activateVirtualWallet` consistently
- UserContext should expose pending/virtual/card to UI

---

## 15. Frontend files still to implement (browser-visible)

| File | Work |
|---|---|
| `UserLayout.jsx` | 4 tabs, Business, notif chip, ping without `isPaid` |
| `Home.jsx` | Remove video/wallet/boosters; add guides + trust + compact footer |
| `Income.jsx` | Drop ₹499 + course gate; 4 cards; wallet card; no Event/Business/coins |
| `GuidePage.jsx` (**new**) | Shared Guide → Skip → target route |
| `WithdrawalCard.jsx` (**new**) | Auto-fill + pay ₹499/₹550 |
| `Wallet.jsx` | Pending + Virtual; hide coins; View More from Income |
| `Marketing.jsx` | Remove `isPaid` lock; Invite copy |
| `FutureFund.jsx` | New criteria, Watch/Tasks inside, animations |
| `Earn.jsx` | Daily work label, INR not coins, no `isPaid` lock |
| `WatchAndEarn.jsx` | Move under Fund; no coins |
| `BusinessIdeas.jsx` | No platform `isPaid` lock; open from Business tab |
| `Profile.jsx` | Invite rename |
| `UnlockModal.jsx` | Become “Create Withdrawal Card” or stop using it as Income gate |
| `App.jsx` | Routes: `/user/guide/:slug`, `/user/business`, `/user/withdrawal-card` |
| `UserContext.jsx` | Map pending/virtual/card |

---

## 16. Spec checklist (same as your document)

### Home
- [ ] Old Intro Video Remove
- [ ] Your Growth, Our Guide Add
- [ ] Guide Cards Add
- [x] Logo/Name retain
- [x] Notification Bell retain
- [ ] Notification indicator chip
- [x] 3-dot menu retain
- [ ] Home compact / one-page scroll
- [ ] Trust line Add
- [ ] Footer compact restyle
- [ ] Theme/UI update

### Income
- [x] KYC first screen (already)
- [ ] ₹499 Income Access Requirement Remove
- [ ] Free Income after KYC
- [ ] Only 4 income options
- [ ] Event / Start Your Journey / Coin System remove from Income
- [ ] Guide page before each option
- [ ] Wallet moved inside Income
- [ ] Pending + Virtual on card
- [ ] Withdrawal Card system (UI)
- [~] ₹499 as card payment (backend helper; UI old)
- [~] Admin approval (backend wired; copy still “platform unlock”)
- [~] 6-month expiry (backend field; no Renew UI)
- [~] Invite ₹200 logic (backend hold; UI still paid-unlock)
- [~] Future Fund criteria (backend; frontend old)
- [ ] Task / offerwall
- [x] Future & Options info page exists

### Business
- [ ] Move out of Income
- [ ] Bottom nav Business
- [ ] Business Guide
- [x] Existing Business system
- [ ] Theme

### Profile
- [x] Existing Profile
- [ ] Referral → Invite
- [ ] Theme

### Coins
- [ ] Remove completely

### Policies
- [x] All 4 policy pages exist

---

## 17. Later documents (spec §39) — do not invent final formulas

Still waiting from product:
- Important Rules  
- Notification List  
- Backend Rules  
- Income Calculation Rules  
- Wallet Rules (7–14 day Pending → Virtual)  
- Invite Rules extras  
- Future Fund daily split formula  
- Task / offerwall vendor  
- Withdrawal Card renewal price  
- Suspension extras  

Core 3/7/14/28 invite cases are sketched in backend cron; exact extras may change when those docs arrive.

---

## 18. Suggested remaining build order

1. Nav 4 tabs + Business route (visible immediately)
2. Income: kill ₹499 + course; 4 cards; drop Event/Business/coins cards
3. Home: kill intro video; guide cards; trust; compact footer
4. Guide → Skip wrapper for Invite / Fund / Daily work / F&O / Business / Wallet
5. Wallet UI Pending/Virtual + Withdrawal Card screen (wire existing API)
6. Remove coins from Earn/Watch/Wallet UI; credit INR in backend
7. Future Fund UI + increment lifetime counters
8. Invite inactivity copy + Profile Invite rename

---

**Summary:** Backend scaffolding for the **new money model** is partly in. The **browser still shows the old product**. Finish frontend (and wire counters / INR credits) to make the spec visible to users.
