# Business Ideas — Live Flow



**Updated:** 4 Sep 2026  

**Status:** Preview details open; Support Hub only after subscription plan purchase (per idea)



---



## How it works now



```

Business tab

  → Guide / Intro (optional entry)

  → Business Hub listing

  → Business Details (OPEN for everyone)

       • How to Start

       • Investment & Cost (kharcha)

       • Profit Potential

       • Video Support

       • CTA → View Subscription Plans   (no optional buttons)

  → Subscription Plans

       • Admin businessPlans only

       • Pay unlocks ONLY this idea + support access

  → My Support Hub (locked until plan purchase)

       • Ecosystem cards / meeting / chat

```



---



## Rules



| Action | Paid? |

|--------|--------|

| Browse ideas | Free |

| Read How to Start / Investment / Profit / Video | Free (preview) |

| Optional / free skip to Support Hub | **Removed** |

| Subscription plan | Paid — admin `businessPlans` |

| Support Hub / ecosystem / chat for that idea | After plan unlocks this idea |



One plan purchase unlocks **only that idea**, not all ideas.



---



## Code notes



- UI: `BusinessIdeas.jsx` — details CTA goes to `/subscription`; hub redirects to plans if not unlocked

- Unlock list: `user.unlockedIdeas` after successful `BUSINESS_HUB_PLAN` payment

- No hardcoded ₹150 / ₹199 in user UI

