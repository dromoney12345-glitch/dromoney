# Business Ideas — Live Flow (Free Start)

**Updated:** 30 Aug 2026  
**Status:** Implemented — ideas open free; Premium Support optional

---

## How it works now

```
Business tab
  → Guide (optional)
  → SHME Intro
  → Business Hub listing  (Free badge, no ₹199 lock)
  → Business Details
       • How to Start / Investment / Profit — OPEN
       • Continue to Support Hub
       • Get Premium Support (optional)
  → My Support Hub
       • Ecosystem cards (Daily Plan, Updates, Tools, Calculation…)
       • Meeting link (if set)
       • Support Chat — free renew path still optional paid for chat plan
```

---

## Rules

| Action | Paid? |
|--------|--------|
| Browse ideas | Free |
| Read How to Start / Investment / Profit | Free |
| Open Support Hub + ecosystem cards | Free |
| Premium Support plans (subscription) | Optional paid |
| Idea unlock ₹199 (legacy) | Removed for current ideas |

Admin can still mark a future idea as **Premium + price > 0** if needed; then unlock payment returns for that idea only.

---

## Code notes

- Model default: `isPremium: false`, `price: 0`
- One-shot DB migrate clears old ₹199 locks (flag `businessIdeasFreeStartMigrated`)
- Unlock: free unless `isPremium === true` AND `price > 0`
