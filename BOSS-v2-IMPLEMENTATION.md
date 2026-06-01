# BOSS v2 — Implementation Document

## Overview

BOSS v2 is a comprehensive rewrite of the tailor management application. The update focuses on four pillars:

1. **Authentication overhaul** — Migrate from email/password + magic link to Google-only OAuth
2. **Paystack disconnection** — Remove all Paystack-dependent features (wallet, virtual accounts, webhooks)
3. **New Earnings tab** — Replace Wallet/DVA with a pure client-side earnings dashboard
4. **Data integrity hardening** — N+1 elimination, double-tap guards, sync status indicator, compensation deletes

---

## Architecture Decisions

### Google-Only Auth
- **Problem:** Email/password auth required SMTP config (blocked by non-technical founder), confirmation emails never arrived, users couldn't sign up.
- **Decision:** Switch to Google OAuth exclusively. Bypasses SMTP entirely. Google handles identity; we get a verified email for free.
- **Trade-off:** Users must have a Google account. Acceptable for the target market (Nigerian tailors with Android phones — Google account is ubiquitous).
- **Server-side:** Auth API routes remain for session management but signup/login endpoints are no longer called from the UI.

### Paystack Removal
- **Problem:** Paystack Dedicated Virtual Accounts (DVA) required Paystack API calls, webhook handling, wallet balance tracking, and complex state management. The webhook route alone was 360 lines. Most tailors collect cash/deposit in person.
- **Decision:** Remove all Paystack code. No virtual accounts, no wallet, no webhooks, no Paystack popup card payments.
- **Trade-off:** Tailors lose the ability to receive bank transfers directly into the app. The new Earnings tab replaces the wallet with a read-only view of money collected and outstanding. Paystack can be re-added later as a phase-2 feature with a cleaner integration.

### BOS Score Trigger
- **Problem:** The BOS Trust Score was only recalculated on the Paystack webhook (card payments). Manual cash/deposit payments never triggered a score update, leaving the score permanently stale for most users.
- **Decision:** Move `updateBosScore()` from the webhook route into `db.js` as a private helper. Call it from `recordPayment()` after every manual payment insert.
- **Trade-off:** `recordPayment` now has an additional dependency on `updateBosScore`. If the score fails, the payment is still committed, but a compensation delete removes the orphan row. This is acceptable because the score failure is rare and the payment audit trail is non-critical.

### Sync Status Indicator (MISSING-03)
- **Problem:** Users had no feedback on whether their data reached Supabase. The existing pill only tracked `setCustomers()`, missing 7 other write paths.
- **Decision:** Add a module-level `_syncCallback` in `db.js` that all 8 write functions call. BOSSApp registers a state setter on mount. Combined with browser `online`/`offline` events for network awareness.
- **Priority ranking:** `syncing > error > offline > connected > saved > idle` — ensures the most important state wins at render.
- **Error is sticky:** `"error"` persists until the next write attempt. `"saved"` and `"connected"` auto-hide. `"offline"` persists until the browser fires `online`.

### Compensation Delete (Optimistic Rollback)
- **Problem:** `recordPayment` inserts a payment row, then calls `updateBosScore`. If the score throws, the payment row is an orphan in Supabase while the UI shows "error". Retrying would duplicate the payment.
- **Decision:** Track `insertedId` and issue a fire-and-forget `DELETE` on failure. The `.then/.catch` pattern ensures the original error is never masked by a compensation failure.
- **Trade-off:** If the compensation `DELETE` itself fails (network drop), the orphan row remains. Recoverable with a periodic cleanup query. Acceptable because this is a rare failure path.

---

## Files Changed

### 10 files modified, 496 insertions, 1,397 deletions

---

### 1. `src/lib/db.js` (Data Layer)

**Role:** The single source of truth for all Supabase interactions. localStorage is a read-through cache only.

**Changes:**

| Change | Lines | Details |
|---|---|---|
| Added `_syncCallback` module variable | 36 | Opaque callback for sync status — react-free |
| Added `setSyncCallback(fn)` | 120 | Public registration method called by BOSSApp on mount |
| Added `signInWithGoogle()` | 121–126 | Google OAuth redirect via Supabase, no password flow |
| Moved `updateBosScore()` into module | 48–116 | Previously in webhook route. Now private helper |
| Added `updateBosScore` rethrow | 114 | `throw err` propagates to caller's catch for `_syncCallback("error")` |
| Wrapped `setTailor` | 203–206 | `_syncCallback("syncing")` / `("saved")` / `("error")` |
| Wrapped `setCustomers` | 272–288 | Same pattern around the two bulk upserts |
| Wrapped `updateOrder` | 317–324 | Conditional — only fires if `dbPatch` has entries |
| Wrapped `updateCustomer` | 343–350 | Same conditional pattern |
| Wrapped `recordPayment` | 354–387 | Compensation delete on failure. `.select("id").single()` to capture `insertedId` |
| Wrapped `deleteOrder` | 389–400 | Simple syncing → delete → saved pattern |
| Wrapped `addCustomer` | 414–420 | Syncing → insert → saved + error in catch |
| Wrapped `addOrder` | 433–441 | Same pattern |
| Removed `updateWalletBalance()` | — | No wallet, no balance to update |
| Removed `getUnmatchedPayments()` | — | No DVA, no unmatched transfers |
| Removed `matchPaymentToOrder()` | — | No unmatched matching UI needed |
| Simplified `getTailor()` select | — | Removed all `virtual_account_*` and `wallet_balance` fields |
| Simplified `setTailor()` payload | — | Removed all DVA fields from payload construction |
| Simplified `recordPayment()` params | — | Removed `virtualAccountNumber` and `transferCode` |

---

### 2. `src/components/BOSSApp.jsx` (Root Orchestrator)

**Role:** Mounts on app load, manages global state (auth screen, navigation, context data), wires the sync status indicator.

**Changes:**

| Change | Lines | Details |
|---|---|---|
| Added `useRef` to React import | 12 | Needed for timer refs |
| Added network status state | 101–102 | `netStatus` tracks `online`/`offline` independently |
| Added `reportSyncing/Saved/Error/Connected/Offline` callbacks | 106–110 | Each clears its own domain's timer to prevent races |
| Added `statusDisplay` computed via priority rank | 114 | `reduce` over `[syncStatus, netStatus]` — lowest index wins |
| Added `useEffect` for callback registration + network listeners | 117–134 | Calls `db.setSyncCallback`, checks `!navigator.onLine` on mount, wires `window` events. Empty dep array intentional. |
| Simplified `setCustomers` wrapper | 77–80 | No more manual `setSyncStatus` — db.js handles it internally |
| Replaced old syncStatus pill | 167–181 | New pill with 5 states: syncing (indigo), saved/connected (green), error (red), offline (amber). IDs: `🔄 Saving…`, `☁️ Saved`, `📡 Connected`, `⚠️ Sync error`, `⚠️ Offline` |

---

### 3. `src/components/boss/tabs.jsx` (Screen Components)

**Role:** Contains all tab screens — Today, Customers, Earnings, Profile, and the Auth/Setup screens.

**Changes:**

| Change | Lines | Details |
|---|---|---|
| Rewrote `AuthScreen` | — | Single Google sign-in button. Removed all email/password forms, forgot-password, verify screens |
| Created `EarningsTab` | — | New tab replacing Wallet. Shows Money Collected, This Month, Still Owed, debtors list, Best/Worst job comparison. Pure function via `computeEarnings()` |
| Removed `WalletTab` export | — | Entire 300+ line component deleted |
| Cleaned `ProfileTab` | — | Removed Financial Identity card (DVA setup, copy, share, deactivate), removed unmatched payments banner, removed wallet balance references, removed all VA-related boolean state variables |
| Simplified comment headers | — | Updated to reflect new tab names (no Wallet, replaced by Earnings) |

---

### 4. `src/components/boss/flows.jsx` (Full-Screen Flows)

**Role:** Modal flows for Add Order, Order Detail, Customer Detail, Add Client, and Reminders.

**Changes:**

| Change | Lines | Details |
|---|---|---|
| Added `useRef` to React import | 5 | Needed for synchronous double-tap guards |
| `AddOrderFlow` — replaced `isSaving` guard with `savingRef` | 23–78 | `useRef` is synchronous — blocks double-tap before React re-renders |
| `AddOrderFlow` — reset ref in `finally` block | 78 | `savingRef.current=false` ensures retry works after failure |
| `CustomerDetailFlow.saveEdit` — wrapped in try/catch/finally | 447–463 | Previously had no error handling. Added `saveEditRef` guard, try/catch, ref reset in finally |
| `CustomerDetailFlow.saveEdit` — rethrow fix | 461–463 | `console.error` then `setSaving(false)` and `saveEditRef.current=false` |
| `AddClientFlow` — replaced `isSaving` guard with `savingRef` | 630–657 | Same pattern as AddOrderFlow |

---

### 5. `src/components/boss/helpers.js` (Pure Functions)

**Role:** Pure helper functions with no side effects.

**Changes:**

| Change | Lines | Details |
|---|---|---|
| Added `computeEarnings(customers)` | — | Pure function. Accepts customers array, returns `{ totalCollected, totalOwed, debtors, thisMonth, bestJob, worstJob, totalOrders, paidOrders }`. All computed client-side via `reduce`, `filter`, `sort` |

---

### 6. `src/app/api/paystack-webhook/route.js` (Deleted)

**Role:** Previously handled Paystack webhooks — signature verification, `charge.success`, `transfer.success`, wallet credit, score update.

**Deleted entirely** (360 lines):

- `POST` handler with HMAC-SHA512 signature verification
- `handleChargeSuccess` — card payment processing
- `creditWallet` — `increment_wallet_balance` RPC call
- `updateBosScore` — moved to `db.js`

---

### 7. `src/app/api/invoice/[orderId]/route.js` (Invoice API)

**Role:** Serves invoice data for the customer-facing invoice page.

**Changes:**

| Change | Details |
|---|---|
| Removed DVA fields from `select` | No more `virtual_account_number`, `virtual_bank_name`, `virtual_account_name`, `virtual_account_status` |
| Removed DVA fields from response | Cleaner JSON with only relevant invoice data |

---

### 8. `src/app/invoice/[orderId]/PayButton.jsx` (Invoice Payment Button)

**Role:** Renders on the customer-facing invoice page.

**Changes:**

| Change | Details |
|---|---|
| Rewrote entirely | Removed bank transfer/DVA section. Only Paystack card payment button remains. Skeletonized to 353 fewer lines |

---

### 9. `next.config.js` (Next.js Configuration)

**Role:** CSP headers and security configuration.

**Changes:**

| Change | Details |
|---|---|
| Added `https://accounts.google.com` to CSP | Required for Google OAuth redirect — added to both `connect-src` and `frame-src` directives |

---

### 10. `.env.local.example` (Environment Template)

**Role:** Documents required environment variables for new developers.

**Changes:**

| Change | Details |
|---|---|
| Added Google OAuth setup instructions | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and notes on configuring Supabase + Google Cloud Console |
| Deprecated `SUPABASE_SERVICE_ROLE_KEY` | No longer needed since webhook route (which used it) was deleted |

---

## State Machines

### Sync Status Display

```
networkOk │ syncStatus │ Display           │ Behavior
──────────┼────────────┼───────────────────┼──────────────────────
false     │ any        │ ⚠️ Offline        │ Sticky — resolves on window.online
true      │ syncing    │ 🔄 Saving…        │ Shows immediately on write, clears saved timer
true      │ saved      │ ☁️ Saved          │ Auto-hides after 2.5s
true      │ error      │ ⚠️ Sync error     │ Sticky — clears on next syncing
true      │ connected  │ 📡 Connected      │ Shows on reconnection, auto-hides after 1.5s
```

### Priority (lowest index = wins)
```
["syncing", "error", "offline", "connected", "saved", "idle"]
```

---

## Data Flow Diagrams

### Payment Recording
```
User taps "Record Payment"
  → flows.jsx calculates newPaid, creates installment
  → updateOrder({paid, installmentHistory})
      → local cache updated
      → db.updateOrder() → _syncCallback("syncing") → Supabase UPDATE → _syncCallback("saved")
  → db.recordPayment({orderId, amount, method})
      → _syncCallback("syncing")
      → Supabase INSERT into payments → captures insertedId
      → updateBosScore(tailorId)
          → reads ALL orders for tailor
          → computes 6 metrics (completion, repeat, payment, revenue, overdue, penalty)
          → UPDATE tailors SET bos_score = ...
          → INSERT INTO bos_score_history (fire-and-forget)
      → _syncCallback("saved")
  → IF updateBosScore throws:
      → _syncCallback("error")
      → Compensation DELETE from payments WHERE id = insertedId
      → throw (re-raises original error)
  → Catch in flows.jsx: toast("❌ Could not save. Try again.")
```

### Order Creation
```
User fills AddOrderFlow form, taps Save
  → savingRef.current = true (synchronous guard)
  → Build order + customer objects
  → Optimistic local state update via setCustomers(next)
  → db.getTailorId() → db.addCustomer() / db.updateCustomer()
  → db.addOrder()
      → Each db call fires _syncCallback("syncing") → write → _syncCallback("saved")
  → If any write fails: _syncCallback("error")
  → savingRef.current = false in finally block
```

---

## Error Handling Strategy

| Layer | Strategy | Example |
|---|---|---|
| **Double-tap** | Synchronous `useRef` guard | `savingRef.current = true` before async work |
| **Sync failure** | `_syncCallback("error")` pill, compensation delete | Payment INSERT succeeds but `updateBosScore` fails → delete orphan row |
| **Compensation failure** | Fire-and-forget `.then/.catch`, don't mask original error | Compensation `DELETE` network fails → log warning, original error propagates |
| **Network offline** | Browser `navigator.onLine` events, sticky ⚠️ Offline pill | Device goes offline mid-write → pill shows, data cached locally |
| **Auth failure** | Silent early return in db.js functions | `if (!authData?.user) return` — no sync callback, no toast |
| **Race conditions** | `clearTimeout` before every setter in sync callbacks | Two rapid saves: first timer cleared before second "syncing" |
| **Score recalculation** | `throw err` after console.error | `updateBosScore` rethrows so `recordPayment`'s catch fires `"error"` |

---

## Verification Checklist

- [ ] Google OAuth redirect works end-to-end
- [ ] Signing in creates a Supabase session
- [ ] Auth callback route exchanges code for session
- [ ] Wallet tab no longer appears in navigation
- [ ] Earnings tab shows correct money collected
- [ ] Profile tab has no Financial Identity card
- [ ] PayButton.jsx has no bank transfer section
- [ ] Invoice API returns no DVA fields
- [ ] `db.js` has no `updateWalletBalance`, `getUnmatchedPayments`, or `matchPaymentToOrder`
- [ ] `db.js` `getTailor` select has no `virtual_account_*` or `wallet_balance`
- [ ] No duplicate `const` names across `boss/` directory
- [ ] Paystack webhook route is deleted
- [ ] All 8 write functions fire `_syncCallback` appropriately
- [ ] Sync pill shows `🔄 Saving…` during write
- [ ] Sync pill shows `☁️ Saved` after success
- [ ] Sync pill shows `⚠️ Sync error` on failure (sticky)
- [ ] Sync pill shows `⚠️ Offline` when browser goes offline
- [ ] Sync pill shows `📡 Connected` when browser comes back online
- [ ] Rapid double-taps on Save do not create duplicate orders or clients
- [ ] `recordPayment` with simulated `updateBosScore` failure does not leave orphan payment row
- [ ] `saveEdit` in CustomerDetailFlow has try/catch/finally (previously was unprotected)

---

## Remaining Technical Debt

1. **Auto-profile-trigger SQL migration** — Postgres trigger to auto-create `tailors` row on new user signup. Currently handled client-side with a potential race condition. SQL is ready in `.copilot/spec/auto-profile-trigger.md`.

2. **Leftover Paystack API routes** — `paystack-virtual-account`, `paystack-deactivate-virtual-account`, `paystack-requery-virtual-account` still exist in `src/app/api/`. Harmless with no UI calling them. Can delete.

3. **Leftover auth API routes** — `signup`, `login`, `forgot-password`, `reset-password` still exist in `src/app/api/auth/`. No UI calls them (Google-only now). Can delete.

4. **Privacy Policy / ToS (MISSING-01)** — External requirement. Needs a lawyer or template service.

5. **No `npm run build` verification** — Node.js not available on this machine. Must verify on deploy.
