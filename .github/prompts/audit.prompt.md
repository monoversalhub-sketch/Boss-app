---
name: audit
description: Runs the full BOSS security checklist across the codebase. Eight mandatory items plus regulatory checks. Blocks deployment on any critical failure.
---

# /audit — BOSS Security Audit

You are acting as the SecurityAuditor Agent.
Read `.github/agents/SecurityAuditor.agent.md` for the full protocol.

## Run All 8 Items

Scan the entire `src/` directory for each item.
Report file name and line number for every finding.

---

### Item 1 — HMAC Timing Attack
```bash
grep -n "hash !== signature\|=== signature\|!== hash" src/app/api/paystack-webhook/route.js
```
PASS: zero results (timingSafeEqual is used instead)
FAIL: any result found

Also verify timingSafeEqual IS present:
```bash
grep -n "timingSafeEqual" src/app/api/paystack-webhook/route.js
```
PASS: found
FAIL: not found

---

### Item 2 — Customer Phone in Public API
```bash
grep -n "phone" src/app/api/invoice/\[orderId\]/route.js
```
PASS: phone only appears in comments or is explicitly excluded
FAIL: `customer.phone` or `phone:` in the response object

---

### Item 3 — Tailor Phone in Public API
```bash
grep -n "t\.phone\|tailor\.phone\|phone:" src/app/api/invoice/\[orderId\]/route.js
```
PASS: not in response
FAIL: present in response object

---

### Item 4 — alert() in JSX
```bash
grep -rn "alert(" src/components/
```
PASS: zero results
FAIL: any result — must be replaced with toast()

---

### Item 5 — Bare setTimeout Memory Leaks
```bash
grep -rn "setTimeout(" src/components/boss/
```
For each result: verify it is inside a `useEffect` return cleanup.
PASS: all setTimeout calls are inside useEffect with clearTimeout
FAIL: any bare setTimeout with setState outside useEffect

---

### Item 6 — Offline Mode Re-Introduction
```bash
grep -rn "boss_mode\|boss_local_user\|handleLocalMode\|Continue Without" src/
```
PASS: zero results
FAIL: any result — offline mode was permanently removed in v10

---

### Item 7 — Wrong Supabase Key in Auth Routes
```bash
grep -rn "ANON_KEY\|anon_key\|createBrowserClient" src/app/api/auth/
```
PASS: not found in auth API routes
FAIL: anon key used for auth operations that require service role

Also verify service role key IS present:
```bash
grep -rn "SERVICE_ROLE_KEY\|service_role" src/app/api/auth/
```
PASS: found in auth routes that send emails or create users
FAIL: not found — auth emails will silently fail

---

### Item 8 — N+1 Write Pattern
```bash
grep -rn "setCustomers\|db\.setCustomers" src/components/
```
For each result: verify it is NOT in a single-field update context
(status change, measurement save, payment recording).
PASS: setCustomers only called in AddOrderFlow and AddClientFlow (creation)
FAIL: setCustomers called in updateOrder, updateMeas, or recordPay contexts

---

## Additional Checks

### Supabase Init Location
```bash
grep -rn "createClient" src/app/api/
```
PASS: createClient calls are inside handler functions (not at top of file)
FAIL: createClient at module level (will fail on Vercel cold starts)

### Wallet Atomicity
```bash
grep -n "wallet_balance" src/app/api/paystack-webhook/route.js
```
PASS: only references via `increment_wallet_balance` RPC
FAIL: direct `update({ wallet_balance: x })` found

### Duplicate Const Check
```bash
grep -n "^const " src/components/boss/*.jsx src/components/boss/*.js
```
PASS: no symbol defined in both tokens.js and a submodule
FAIL: duplicate found — build will fail on Vercel

---

## Output

```
## Security Audit Report — YYYY-MM-DD

| # | Item | Status | File | Line |
|---|------|--------|------|------|
| 1 | HMAC timingSafeEqual | ✅ PASS | webhook/route.js | 54 |
| 2 | Customer phone | ✅ PASS | invoice/route.js | — |
| 3 | Tailor phone | ✅ PASS | invoice/route.js | — |
| 4 | No alert() | ✅ PASS | — | — |
| 5 | setTimeout cleanup | ✅ PASS | — | — |
| 6 | No offline mode | ✅ PASS | — | — |
| 7 | Service role key | ✅ PASS | auth/signup | 12 |
| 8 | No N+1 writes | ✅ PASS | — | — |

### Additional Checks
| Check | Status | Notes |
|---|---|---|
| Supabase init location | ✅ PASS | |
| Wallet atomicity | ✅ PASS | |
| Duplicate consts | ✅ PASS | |

### Critical Failures (block deployment)
None / [description + file + line]

### Warnings (fix before launch)
None / [description]

### Verdict
✅ AUDIT PASSED — proceed to /review
❌ AUDIT FAILED — fix items above before deployment
```
