# X API 403 SpendCapReached — Research Summary

## What you're seeing

- **Following** (`GET /2/users/:id/following`) → works.
- **Likes** (`GET /2/users/:id/liked_tweets`) → 403 with `SpendCapReached`.
- Console shows **Unlimited** spend cap and **$7.86** current spend (balance $7.14). No separate "Likes" or "Engagement" cap is visible in the dashboard.

## What the 403 says

The API response includes:

- `"title": "SpendCapReached"`
- `"detail": "Your enrolled account [id] has reached its billing cycle spend cap. API requests will be blocked **until the next cycle begins on 2026-04-14**."`
- `"reset_date": "2026-04-14"`

So the block is explicitly tied to the **billing cycle** and a **reset date**.

## What the docs say

1. **Pay-per-use (Feb 2026)**  
   X moved to credit-based pricing: you buy credits, pay per request (e.g. $0.005/read). No fixed monthly tiers required. Spend cap is optional and set in the Developer Console.

2. **No separate “Likes” cap in the UI**  
   Public X docs and third-party summaries (e.g. Postproxy’s X API pricing 2026) do **not** describe a separate per-product or per-endpoint spend cap for “Likes” or “Engagement” that you’d set in the dashboard. On pay-per-use, read endpoints (including following and liked_tweets) are generally billed as reads.

3. **Cycle-based block**  
   The 403 text says requests are blocked **until the next cycle begins on 2026-04-14**. That strongly suggests:
   - Once the **enrolled account** hits its spend cap during a billing cycle, the API keeps returning 403 for the **rest of that cycle**.
   - Changing the cap to Unlimited (or raising it) later in the same cycle may **not** remove the block until the cycle resets. The new cap likely applies from the **next** cycle (e.g. from 2026-04-14).

4. **“Enrolled account”**  
   The error refers to your **enrolled account** (the X developer account ID in the 403). The Console’s “Manage Spend Cap” is for that account. There’s no separate “per-endpoint” or “Likes” cap documented in the places we checked; the only distinction in the docs is between **account-level** spend cap and **cycle reset**.

## Why Following works but Likes doesn’t

Plausible explanations:

- **Order of hitting the cap:** The cap may have been hit first on a request that went through the **Likes** path (or the backend treats “engagement” endpoints differently once the account is over cap). So Following might still succeed while Likes returns 403 for the same cycle.
- **Different internal buckets:** X might enforce or meter “engagement” (e.g. liked_tweets) differently from “social graph” (e.g. following) under the hood, even if the Console doesn’t show a separate cap. We didn’t find official docs that confirm or deny this.
- **Cycle lock:** The most consistent explanation with the 403 text: the account was marked “over spend cap” for this cycle; that state persists until **2026-04-14** regardless of the cap you set now. Following could be allowed while Likes stays blocked for the rest of the cycle.

## What to do

1. **Wait for the cycle to reset (2026-04-14)**  
   After the new cycle starts, with Unlimited (or a higher) spend cap and available balance, try the Likes endpoint again. Many billing systems behave this way: “capped for the rest of the cycle.”

2. **Ask X Developer Support**  
   The official error-troubleshooting and billing pages don’t spell out “SpendCapReached” or “block until reset_date.” To get a definitive answer:
   - Go to [developer.x.com](https://developer.x.com) → **Support** (or the support link in the Developer Console).
   - Ask: *“We get 403 SpendCapReached on GET liked_tweets until 2026-04-14. We’ve set the spend cap to Unlimited and have balance. Can the block be lifted for the current cycle, or does it always last until reset_date?”*
   - Optionally attach the 403 response body (with `account_id`, `reset_date`, `title`, `detail`).

3. **In the app**  
   We already treat 403 like 402: log once, return “credits depleted” and skip the like check so the rest of allocation (including following) still works. No code change needed unless X confirms a different fix.

## References

- X Developer Platform: [developer.x.com](https://developer.x.com)  
- Pay-per-use / billing: [developer.x.com/en/support/x-api/error-troubleshooting](https://developer.x.com/en/support/x-api/error-troubleshooting) (general; no explicit SpendCapReached doc)  
- Postproxy, “X API pricing in 2026”: pay-per-use, tiers, and “like and follow endpoints” context (Aug 2025 changes, pay-per-use launch Feb 2026).
