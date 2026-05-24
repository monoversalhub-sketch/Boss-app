# BOSS — Engineering Constraints
> These are laws, not guidelines. Every agent reads this before acting.
> If a constraint conflicts with a user request, the constraint wins.
> To change a constraint, create a spec and get it approved first.

---

## Stack (Non-Negotiable)

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Do not upgrade — tested and stable |
| Language | JavaScript (no TypeScript) | Keeps codebase accessible |
| UI library | None — inline styles only | Core architectural rule |
| Database | Supabase (PostgreSQL + RLS) | Single source of truth |
| Auth | Supabase Auth via API routes | Never call Supabase auth client-side |
| Payments | Paystack DVA only | No subaccounts, no split payments |
| Rate limiting | Upstash Redis + in-memory fallback | Distributed across Vercel instances |
| Deployment | Vercel | Auto-deploys on GitHub push |
| Package manager | npm | Not yarn, not pnpm |

---

## Frontend Rules

### Styles
- **Inline styles ONLY** — no Tailwind, no CSS modules, no styled-components, no className with external CSS
- All design tokens live in `src/components/boss/tokens.js` as `C` (colours) and `S` (shared styles)
- No third-party UI component libraries (no MUI, Chakra, shadcn, Radix, etc.)
- Dark card background: `#1C1C1E` — never hardcode other values inline

### Typography
- Minimum font size: **12px** in all production UI
- Exception: nav icon labels may use 10px
- Font family: Plus Jakarta Sans (loaded via layout.js — do not re-import in components)
- Font weights in use: 400, 500, 600, 700, 800, 900

### Touch Targets
- Minimum tap target: **48dp height** on all interactive elements
- Minimum tap target: **44px width** on all interactive elements
- Never stack interactive elements closer than 8px apart

### Identifiers
- All IDs generated with `crypto.randomUUID()` — **never** `Math.random()` or `Date.now()`
- All IDs are UUIDs — never sequential integers in the frontend

### Feedback
- **No `alert()` anywhere in the codebase** — use the BOSS `toast()` function from `useBOSS()`
- All success states use green toasts, all errors use red toasts
- Loading states use the `SkeletonCard` component — never a spinner library

---

## Architecture Rules

### File Structure
```
src/components/BOSSApp.jsx        ← root only, max 300 lines
src/components/BOSSClient.jsx     ← thin client wrapper + ErrorBoundary
src/components/boss/tokens.js     ← C, S, GLOBAL_CSS, constants
src/components/boss/helpers.js    ← pure functions only (no React)
src/components/boss/context.jsx   ← ErrorBoundary, BOSSContext, useBOSS
src/components/boss/ui.jsx        ← Btn, Input, Sheet, Flow, Toast, DatePicker
src/components/boss/cards.jsx     ← TrustScoreCard, OrderCard, StatusStepper
src/components/boss/flows.jsx     ← AddOrderFlow, OrderDetailFlow, RemindersFlow
src/components/boss/tabs.jsx      ← TodayTab, WalletTab, ProfileTab, AuthScreen
src/lib/db.js                     ← Supabase only data layer
src/lib/ratelimit.js              ← Upstash Redis + in-memory fallback
src/lib/paystack.js               ← Paystack popup helper
```

### The Golden Rules of the File Split
1. **Nothing new goes into `BOSSApp.jsx` directly** — it is a wiring layer only
2. New UI atoms → `ui.jsx`
3. New composite cards → `cards.jsx`
4. New full-screen flows (slide-up panels) → `flows.jsx`
5. New tab screens → `tabs.jsx`
6. New pure functions → `helpers.js`
7. New constants/tokens → `tokens.js`

### The Duplicate Const Rule (CRITICAL — Causes Build Failures)
After adding ANY symbol to `tokens.js`, verify it is not also defined as `const`
in any submodule file. The Vercel build fails immediately on duplicate const names.

Run this check after every change to any boss/ file:
```
grep -n "^const " src/components/boss/*.jsx src/components/boss/*.js
```
Any name appearing twice across files is a build-breaking duplicate.

### State Management
- `useBOSS()` hook from `context.jsx` — all shared state flows through this
- No prop drilling beyond one level
- `useCallback` on all functions passed as props
- `useMemo` on all expensive derivations (allOrders, filter, sort, chart data)
- No Redux, no Zustand, no external state management

### Timer Rules
- **No bare `setTimeout` with state setters** — wrap in `useEffect` with `clearTimeout` cleanup
- Pattern:
  ```js
  useEffect(()=>{
    if(!msg) return;
    const id = setTimeout(()=>setMsg(""), 2500);
    return ()=>clearTimeout(id);
  },[msg]);
  ```

---

## Database Rules

### Supabase
- `db.js` is the ONLY file that imports from `@supabase/ssr` or `@supabase/supabase-js`
- localStorage is cache ONLY — never the source of truth for any write operation
- For single-field mutations: use `db.updateOrder()` or `db.updateCustomer()` — never `db.setCustomers()` for single updates
- `db.setCustomers()` is for bulk creation/sync only
- Wallet balance increments use the atomic `increment_wallet_balance` RPC — never a direct update

### RLS
- All tables have Row Level Security enabled
- Tailors see only their own data — enforced at DB level, not just frontend
- The `payments` table has idempotency constraints on `paystack_ref` and `transfer_code`

---

## Security Rules (Non-Negotiable)

| Rule | Correct | Wrong |
|---|---|---|
| HMAC comparison | `crypto.timingSafeEqual(hashBuf, sigBuf)` | `hash !== signature` |
| ID generation | `crypto.randomUUID()` | `Math.random()` |
| Auth client | `SUPABASE_SERVICE_ROLE_KEY` in API routes | Anon key for auth operations |
| Rate limiting | `await checkRateLimit(ip)` (async Upstash) | In-memory Map only |
| Customer PII | Never in public invoice API | `customer.phone` in `/api/invoice` |
| Tailor PII | Never in public invoice API | `tailor.phone` in `/api/invoice` |
| User feedback | `toast()` from `useBOSS()` | `alert()` |
| Supabase init | Inside handler function | At module level |

### The Eight-Item BOSS Security Checklist (run /audit to check all)
1. `timingSafeEqual` present in webhook HMAC — not string equality
2. No customer phone in public `/api/invoice` response
3. No tailor phone in public `/api/invoice` response
4. No `alert()` in any `.jsx` file
5. No bare `setTimeout` with state setter (must use `useEffect` + cleanup)
6. No `boss_mode` localStorage key (offline mode re-introduction)
7. All auth API routes use `SUPABASE_SERVICE_ROLE_KEY`
8. `db.setCustomers()` not used for single-field mutations (N+1)

---

## What Is Permanently Removed

- **Offline mode** — removed in v10. Do not re-introduce localStorage-only auth,
  `boss_mode` keys, `boss_local_user` keys, or `handleLocalMode()` functions.
- **"Continue Without Account" button** — removed from AuthScreen.
- **Paystack subaccounts** — DVA only.
- **FinanceTab** — dead code, removed in v6.
- **"Pending" order status** — removed. Statuses are: In Progress, Ready, Delivered.
- **"Clients" terminology** — always "Customers".
- **"Settings" tab name** — now "Profile".
- **Financial Identity in Profile menu** — it lives in the Wallet tab.

---

## UX Rules

- Service fee (₦75) is **never shown at the moment of payment collection**
- The "first win path" must never be broken: Add Order → Log Deposit → WhatsApp Receipt Prompt
- WhatsApp messages must sound like a real Lagos business person — not a SaaS template
- Every bottom sheet / modal must be dismissable by tapping the backdrop
- Delete actions require a two-tap confirmation sheet — never one tap to permanent deletion
- Empty states always have an icon, a title, and an encouraging subtitle

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY                 ← must be sk_live_... for production
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY           ← required for all auth operations
UPSTASH_REDIS_REST_URL              ← distributed rate limiting
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY                      ← welcome email
```

---

## DVA Naming Convention

```js
function buildDVAName(shopName) {
  const clean = shopName.toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ").trim();
  const shop = clean.length > 18 ? clean.slice(0, 18).trim() : clean;
  return { first_name: "BOSS", last_name: shop || "BUSINESS" };
}
```

Customers see: `BOSS BY MNVSL / BOSS CHIDI FASHION`
Paystack business name must be registered as: `BOSS BY MNVSL` (13 chars)
