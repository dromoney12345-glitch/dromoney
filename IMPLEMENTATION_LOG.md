# Implementation log — Dromoney new user flow

**Date:** 17 Aug 2026  
**How to test:** Frontend `http://localhost:5174/` · Backend `http://localhost:5000`

This log is **step-by-step** what was implemented in this round. Refresh the browser (hard refresh) after login.

---

## Step 1 — Bottom navigation (4 tabs)

**Spec:** Home | Income | Business | Profile

**Browser me dikhega**
- Bottom bar par ab **4 options** hain.
- **Wallet** aur **Watch** tabs hata diye.
- **Business** naya tab — pehle guide, phir Business Ideas.
- Bell ke bagal unread notification ho to **chhota chip** (title) dikhega, e.g. “KYC Verified”.

**Files**
- `frontend/src/module/user/UserLayout.jsx`
- `frontend/src/App.jsx` — `/user/business` → guide, `/user/guide/:slug`, `/user/withdrawal-card`

---

## Step 2 — Home page

**Spec:** Intro video hatao. Your Growth, Our Guide + cards + trust + compact policies.

**Browser me dikhega**
- Intro video **nahi** dikhegi.
- Home wallet / boosters / marketplace tiles / ₹499 promo **nahi**.
- Title: **Your Growth, Our Guide**
- 8 small guide cards (KYC, Invite, Card, Withdraw, ₹500, Tasks, Business, Fund)
- Card tap → guide page → Skip / Continue
- Trust line: **100% Trusted Platform**
- Footer: Privacy, Terms, Guidelines, No Refund

**Files**
- `frontend/src/module/user/pages/Home.jsx` (rewritten)
- `frontend/src/module/user/data/guides.js`

---

## Step 3 — Income page (free after KYC)

**Spec:** KYC first. ₹499 Income gate hatao. Sirf 4 options + wallet card.

**Browser me dikhega**
- Income pe pehle KYC (agar pending / not started) — **same**.
- KYC approved ke baad **₹499 Buy Course nahi** — Income seedha khulega.
- Onboarding course intercept **nahi**.
- Sirf **4 options:**
  1. Invite & Earn ₹200
  2. Future Fund
  3. रोज़ाना काम करें और कमाएं
  4. Future & Options
- Event / Start Your Journey / Coins cards **Income se hataye**.
- Upar **Wallet Card:** Pending | Virtual + View More

**Tap flow:** option → **Guide** → Skip/Continue → actual page

**Files**
- `frontend/src/module/user/pages/Income.jsx` (rewritten)

---

## Step 4 — Guide → Skip system

**Browser me dikhega**
Har option / Home card pe ek simple guide:
- Invite, Fund, Daily work, Options, Business, Wallet, KYC, Withdrawal Card, Withdraw, Tasks, ₹500/day

**URL:** `/user/guide/invite` etc.

**Files**
- `frontend/src/module/user/pages/GuidePage.jsx`
- `frontend/src/module/user/data/guides.js`

---

## Step 5 — Wallet + Withdrawal Card (UI)

**Browser me dikhega**
- Income → Wallet Card → Guide → full wallet
- Wallet top par **Pending** aur **Virtual** amounts
- Virtual locked ho to button: **Withdrawal Card बनाएं**
- Card page: Name, Number, Today, Expiry **auto-fill** (edit nahi)
- Next → ₹499 (ya 7-day inactivity ke baad backend ₹550 quote) payment
- Admin approve ke baad Virtual unlock (backend already wired)

**Files**
- `frontend/src/module/user/pages/Wallet.jsx`
- `frontend/src/module/user/pages/WithdrawalCard.jsx` (new)
- `frontend/src/module/user/context/UserContext.jsx` — pending/virtual/card mapping

---

## Step 6 — ₹499 Income unlock gates hataaye

Pehle Invite / Tasks / Watch / Business / Fund **UnlockModal ₹499** dikhate the.

**Ab:** KYC ke baad ye pages **bina platform payment** khulenge.  
Withdraw abhi bhi Virtual Card chahiye.

**Files**
- `Marketing.jsx`, `Earn.jsx`, `WatchAndEarn.jsx`, `BusinessIdeas.jsx`, `FutureFund.jsx`, `Profile.jsx`

---

## Step 7 — Business + Profile labels

**Browser me dikhega**
- Bottom **Business** → Business guide → existing ideas system
- Profile: **My Referrals** → **My Invites**
- 3-dot menu: **Invite** (pehle Refer & Earn)

---

## Step 8 — Future Fund UI criteria

**Browser me dikhega**
- Criteria text: **10 Successful KYC / 50 Ads / 50 Tasks** (backend pehle se)
- **Watch Ads** + **Complete Tasks** buttons Fund page par (locked + active dono)
- Ads/tasks complete par lifetime counters backend par increment

**Files**
- `frontend/src/module/user/pages/FutureFund.jsx`
- `backend/controllers/adController.js` — `lifetimeAdsWatched++`
- `backend/controllers/walletController.js` — `lifetimeTasksCompleted++`

---

## How to click-through (test checklist)

1. Login
2. **Bottom nav = 4 tabs**
3. **Home** — guide cards, no video
4. **Income** — KYC if needed; then 4 cards + wallet card (no ₹499 screen)
5. Invite card → guide → Skip → old invite copy/share page
6. Wallet card → guide → Pending/Virtual; locked ho to **Withdrawal Card**
7. **Business** tab → guide → ideas
8. **Profile** → My Invites
9. Bell unread → yellow chip header par
10. Future Fund → new 3 criteria + Watch/Tasks buttons

---

## Abhi pending (next round)

- Coins tab / Earn “coins” wording / Events games fully remove
- Offerwall vendor (spec: alag document)
- Task/ad complete par **small INR animation** (coins ki jagah)
- Future Fund daily cron Pending vs Virtual destination
- 7–14 day Pending→Virtual transfer (waiting wallet-rules doc)
- UnlockModal copy still “Platform Locked” if kisi leftover path se khule

---

## Related docs

- Full spec vs old app: `SPEC_CHANGES_STATUS.md`
- This session’s work: `IMPLEMENTATION_LOG.md` (this file)
