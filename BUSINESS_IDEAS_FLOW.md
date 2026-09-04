# Business Ideas — Live Flow (Free Start)



**Updated:** 31 Aug 2026  

**Status:** Ideas free by default; Premium Support prices from admin only; unlock is per-idea



---



## How it works now



```

Business tab

  → Guide (optional)

  → SHME Intro

  → Business Hub listing  (Free badge — no hardcoded ₹199)

  → Business Details

       • How to Start / Investment / Profit — OPEN (free ideas)

       • Continue to Support Hub

       • Get Premium Support (optional — admin plan prices)

  → Premium Support

       • Plans = Settings.businessPlans (admin Customize Membership)

       • Pay unlocks support chat + ONLY this idea

  → My Support Hub

       • Ecosystem cards for this idea

       • Meeting link (if set)

       • Support Chat — renewal amount from admin settings / cheapest plan

```



---



## Rules



| Action | Paid? |

|--------|--------|

| Browse ideas | Free |

| Read How to Start / Investment / Profit | Free (unless admin sets Premium + price > 0) |

| Open Support Hub + ecosystem cards | Free for free ideas; else only if this idea is in `unlockedIdeas` |

| Premium Support plans (subscription) | Paid — amount from admin `businessPlans` only |

| Support chat renewal | Paid — `supportChatRenewalAmount` or cheapest admin plan |

| One idea plan purchase unlocks all ideas? | **No** — only that idea |



Admin can mark a future idea as **Premium + price > 0**; then unlock payment is required for that idea only.



---



## Code notes



- Model default: `isPremium: false`, `price: 0`

- One-shot DB migrate clears old ₹199 locks (`businessIdeasFreeStartMigratedV3`)

- Unlock: free unless `isPremium === true` AND `price > 0`

- `supportExpiry` = chat / membership window — does **not** unlock every idea

- User UI must never hardcode ₹150 / ₹199 for business prices


