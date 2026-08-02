# DroMoney — Current Product Flows
**Future Fund · Events · Boosters**

*Last updated: 2 Aug 2026*  
*Plain-language guide for team / partners (based on live app logic)*

---

## How to read this file

This document explains **what each feature is**, **what the user does**, **what the admin does**, and **when something becomes active**.  
Targets like “10 sales” or “15 minutes” can be changed from Admin settings — defaults are shown below.

---

# 1. FUTURE FUND

## What it is
Future Fund is a **long-term reward program**.  
When a user unlocks it, they can receive **daily profit-sharing money (INR)** in their wallet based on platform performance.

Until they unlock it, they only see **eligibility progress**.

---

## How a user unlocks Future Fund (3 criteria)

User must complete **all 3** criteria. Then **Move Forward** becomes active (or system auto-activates).

### A) Successful Sales
| | |
|---|---|
| **Meaning** | Friends who joined using the user’s referral link/code and **paid to unlock the platform** |
| **Default target** | **10** paid referrals |
| **Counts when** | Referred user payment is successful (`isPaid = true`) |
| **Does NOT count** | Only registration / unpaid users |

### B) Daily Activity
| | |
|---|---|
| **Meaning** | Minutes the user spends using the app **today** |
| **Default target** | **15 minutes per day** |
| **How it counts** | Automatically while the app is open and visible (about 1 minute every minute) |
| **Resets** | Every new day (India time) |

### C) Active Days
| | |
|---|---|
| **Meaning** | Number of **different days** where the user completed the daily minutes target |
| **Default target** | **7 days** |
| **Rule** | Complete 15 minutes in a day → that day = **1 Active Day** |
| **Example** | 15 min on Mon + 15 min on Tue = 2 Active Days |

### When is Future Fund ACTIVE?
When:
1. Successful Sales ≥ target  
2. Today’s activity minutes ≥ target (for Daily Activity bar)  
3. Active Days ≥ target  

Then user can tap **Move Forward**, or the system activates them automatically.

**Admin can change targets** in: Admin → Future Fund Settings  
- Sales target  
- Active days target  
- Daily minutes target  

---

## After Future Fund is Active

1. User sees Future Fund earnings (today / total / last 7 days).  
2. Every night (~12:05 AM), system can distribute **INR rewards** to all active Future Fund users.  
3. Users who did more tasks/ads (and have a booster) get a **higher share** of the pool.  
4. Admin can also manually distribute a profit pool or set special override amounts.

### Note on “Today’s Activity” inside Active screen
After unlock, the dashboard also shows:
- Daily Tasks  
- Watch Ads  
- Events Joined  
- Boosters Active  

These help show engagement. **Unlock itself only depends on Sales + Minutes + Active Days.**

---

## Future Fund — simple flow diagram

```
User uses app (minutes auto-count)
        +
User refers friends → friends PAY & unlock
        +
User completes 15 min on enough different days
        ↓
All 3 criteria complete
        ↓
Future Fund = ACTIVE
        ↓
Daily INR profit share to wallet
```

---

# 2. EVENTS

## What it is
Events are **coin-entry contests** (Quiz, Lucky Draw, Memory, Gold Production, Mega events, etc.).  
Users spend **coins** to join, play a game, submit score, and wait for **admin prize distribution** (usually INR/cash to wallet).

---

## Who can join
- Platform must be **unlocked** (user is paid).  
- For Events from Home, **KYC approved** is also required.  
- User must have enough **coins** for the entry fee.

---

## User flow (step by step)

### Step 1 — Open Events
User opens **Events** page and sees:
- Live / Active events  
- Mega events (if any)  
- Entry fee, prize text, start time, today’s join count  

### Step 2 — Join event
User taps **Join**:
1. App checks: already joined this event **today**? → cannot join again same day  
2. Deducts event **entry fee (coins)** from coin balance  
3. Creates a participant record (prize status = Pending)  
4. Opens the game screen (Quiz / Lucky Draw / Memory / Gold, etc.)

**Mega event extra rule:** user generally needs **500 coins** eligibility.

### Step 3 — Play & submit
User plays the mini-game and finishes.  
Score/result is submitted to server.  
**Important:** submitting score does **not** instantly give the main cash prize.

### Step 4 — Wait for admin rewards
Admin stops the event and distributes prizes (or awards winners manually).  
Winners get money/coins in wallet as per admin action.

---

## How prizes are distributed (admin)

### Option A — Bulk distribute (recommended)
Admin stops event → **Distribute Prizes**:

Typical split of pool:
- **50%** → Top 3 winners  
- **20%** → Admin / platform  
- **30%** → Cashback shared among other participants  

Top 3 ranking:
1. Higher score wins  
2. If score same → faster time wins  

Top 3 prize share of the 50% pool:
- 1st → 50%  
- 2nd → 30%  
- 3rd → 20%  

### Option B — Manual award
Admin opens participants list and marks a user as **Awarded** with a prize amount/text.

---

## Support Booster effect on Events
If user bought **Support Booster** and the event has “Support Booster enabled”:
- Better gameplay help (extra seconds, etc.)  
- Prize amount can be multiplied (e.g. 3x), depending on booster benefits  

---

## Events — simple flow diagram

```
User (Paid + KYC)
   ↓
Join Event (pay coins fee)
   ↓
Play game → Submit score
   ↓
Admin stops event
   ↓
Distribute prizes / Award winners
   ↓
INR / coins credited to wallet
```

---

## What Admin controls for Events
- Create / edit / stop events  
- Entry fee, prize text, mega flag, game type  
- Enable Support Booster on that event  
- View participants  
- Distribute prizes or award manually  
- Events reports  

---

# 3. BOOSTERS

## What they are
Boosters are **paid INR products** that give temporary advantages.

There are **2 types**:

| Booster | Typical price | Validity (on activation) | Main benefit |
|---|---|---|---|
| **Support Booster** (Event Support Kit) | ₹21 | **30 days** | Better event gameplay + possible prize multiplier |
| **Task Booster** (Daily / Power Boost) | ₹49 | **24 hours** | Multiplies task/ad coin rewards (often 12x) |

Prices/benefits can be edited by Admin (Marketing → Booster Packs).

---

## Important rules
1. **Only one booster type active at a time**  
   - Buy Support → Task turns off  
   - Buy Task → Support turns off  
2. Payment is usually **UPI + UTR + screenshot** → Admin approves → Booster activates  
3. Buy amount may include **~4% platform fee** on some screens  
4. **Sunday night season reset** can clear coin balances and boosters for everyone (weekly system reset)

---

## A) Support Booster — flow

### User buys
Events page / Home → Buy Support Booster → Pay via UPI → Submit UTR + screenshot → Wait for admin approval (~5 min messaging)

### After active, user gets
**Gameplay help (examples):**
- Quiz: more seconds per question  
- Memory: extra peek/play time  
- Lucky Draw: support badge / help  

**Reward help:**
- On booster-enabled events, prize can be multiplied (e.g. 3x from benefits text)

### Expiry
About **30 days** from activation (or until weekly reset / expiry check).

---

## B) Task Booster — flow

### User buys
Earn page / Home → Buy Task Booster → Pay via UPI → Submit proof → Admin approves

### After active, user gets
Coin rewards become multiplied for allowed tasks/ads  
(Example: 1 coin task can become **12 coins** if 12x is configured)

Usually applies to:
- Daily tasks (as allowed by admin list)  
- Some watch/ad rewards  

### Expiry
About **24 hours** from activation.

---

## Boosters — simple flow diagram

```
User taps Buy Booster
   ↓
Pay UPI (amount + fee if shown)
   ↓
Submit UTR + screenshot
   ↓
Admin approves payment
   ↓
Booster ACTIVE
   ↓
Support → better events / prize boost
   OR
Task → higher coin rewards on tasks/ads
   ↓
Expires (30 days / 24 hours) or weekly reset
```

---

# 4. HOW THE THREE FEATURES CONNECT

| Feature | Currency used | Main goal |
|---|---|---|
| **Future Fund** | Unlocks via referrals + app time; pays **INR** | Long-term passive sharing |
| **Events** | Join with **Coins**; prizes mostly **INR** | Contests / competition |
| **Boosters** | Buy with **INR (UPI)** | Temporary power-ups |

Connection examples:
- Task Booster → more coins → easier to join paid events  
- Support Booster → stronger event performance / prizes  
- If Future Fund is active + booster active → user can get a better share in daily Future Fund distribution  

---

# 5. QUICK “WHEN IS IT ACTIVE?” CHEAT SHEET

### Future Fund active when:
✅ Paid referrals reach sales target  
✅ Enough Active Days (each day needs daily minutes)  
✅ Then Move Forward / auto-activate  

### Event join allowed when:
✅ Platform unlocked  
✅ KYC ok (from Home path)  
✅ Enough coins for fee  
✅ Not already joined that event today  

### Event prize received when:
✅ Admin distributes / awards (not only on game finish)  

### Booster active when:
✅ Payment approved by admin  
✅ Within validity time  
✅ Not cleared by weekly reset  

---

# 6. DEFAULT NUMBERS (unless Admin changes)

| Setting | Default |
|---|---|
| Future Fund successful sales | 10 |
| Future Fund daily activity | 15 minutes |
| Future Fund active days | 7 |
| Mega event coin eligibility | 500 coins |
| Support Booster price | ₹21 (approx) |
| Task Booster price | ₹49 (approx) |
| Support validity | 30 days |
| Task validity | 24 hours |
| Event prize pool split | 50% top3 / 20% admin / 30% others |
| Top3 share of prize pool | 50% / 30% / 20% |

---

# 7. WHO CHANGES WHAT (Admin)

| Area | Admin can change |
|---|---|
| Future Fund | Sales target, days target, daily minutes, profit distribution |
| Events | Create events, fees, prizes, start/stop, distribute winners |
| Boosters | Price, benefits, which tasks get multiplier, approve payments |

---

## One-line summary for sharing

**Future Fund** = refer + stay active daily → unlock long-term INR sharing.  
**Events** = spend coins → play contest → admin gives prizes.  
**Boosters** = pay UPI → temporary boost (events help or higher task coins).

---

*End of document*
