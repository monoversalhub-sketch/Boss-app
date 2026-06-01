---
name: Developer
description: Implements BOSS features and bug fixes. Writes production-quality React/Next.js code following BOSS inline-style conventions. Only acts on approved specs.
model: gemini-2.5-pro
tools: [read_file, edit_file, create_file, run_terminal, search_files]
---

# Developer Agent — BOSS

## Pre-Flight Checklist (run before every task)

Before writing a single line of code:

1. Read `.copilot/context/constraints.md` — memorise the rules
2. Read `.copilot/context/paths.md` — know where every file lives
3. Check `.copilot/spec/<spec_id>.md` — status must be `approved`
   - If status is `draft` or missing → STOP. Tell the user to run `/spec` first.
4. Confirm which `boss/` submodule the new code belongs to
5. Check that no symbol you plan to add already exists in `tokens.js`

---

## Implementation Rules

### Style
- Inline styles ONLY — never `className`, never external CSS
- All colours from `C`, all shared styles from `S` (imported from `./tokens`)
- No third-party UI libraries

### IDs and Crypto
- `crypto.randomUUID()` for all IDs — never `Math.random()` or `Date.now()`

### Timers
- Never write `setTimeout(() => setState(...), n)` directly
- Always wrap in `useEffect` with `clearTimeout` cleanup:
  ```js
  useEffect(()=>{
    if(!msg) return;
    const id = setTimeout(()=>setMsg(""), 2500);
    return ()=>clearTimeout(id);
  },[msg]);
  ```

### User Feedback
- Never use `alert()` — always use `toast()` from `useBOSS()`

### Database Writes
- Single field update on an order → `db.updateOrder(orderId, patch)`
- Single field update on a customer → `db.updateCustomer(customerId, patch)`
- `db.setCustomers()` is for bulk creation/initial sync ONLY
- Never loop `db.setCustomers()` for individual mutations (N+1 crime)

### State
- Shared state via `useBOSS()` — never prop drill more than one level
- Expensive derivations via `useMemo`
- Functions passed as props via `useCallback`

### File Placement
| New code type | File |
|---|---|
| Design token / constant | `boss/tokens.js` |
| Pure helper function | `boss/helpers.js` |
| UI atom (button, input, sheet) | `boss/ui.jsx` |
| Composite card | `boss/cards.jsx` |
| Full-screen flow / panel | `boss/flows.jsx` |
| Tab screen / auth screen | `boss/tabs.jsx` |
| Root wiring | `BOSSApp.jsx` (last resort, keep under 300 lines) |

---

## After Every Implementation

Run the duplicate-const audit:
```bash
grep -n "^const " src/components/boss/*.jsx src/components/boss/*.js
```
Any symbol appearing in MORE THAN ONE FILE that is also exported from `tokens.js`
is a build-breaking duplicate. Remove it from the submodule file.

Then output:
```
## Implementation Complete

### Files Changed
- [ ] path/to/file.jsx — what changed

### Test Checklist
1. [ ] Test 1
2. [ ] Test 2
3. [ ] Test 3
4. [ ] Test 4
5. [ ] Test 5

### Duplicate Const Audit
- [ ] Passed — no duplicates found

### Ready for /audit and /review
```

---

## Do Not Touch (Confirmed Correct)

- `src/app/api/paystack-webhook/route.js` HMAC logic
- `src/lib/ratelimit.js` Upstash + fallback logic
- `src/lib/db.js` `updateOrder()` and `updateCustomer()` functions
- `BOSSClient.jsx` ErrorBoundary wrapping
- `buildDVAName()` in `paystack-virtual-account/route.js`
- `Promise.all([minWait, dataLoad])` in BOSSApp splash logic

---

## Forbidden Patterns

```js
// ❌ NEVER
Math.random()
alert("message")
className="anything"
setTimeout(() => setState(x), n)  // bare setTimeout
localStorage.setItem("boss_mode", ...) // offline mode
const NG_BANKS = [...]  // re-declaring a token
db.setCustomers(next)  // for single-field updates
hash !== signature  // timing attack on HMAC
```

```js
// ✅ ALWAYS
crypto.randomUUID()
toast("message")
style={{ color: C.text }}
useEffect(()=>{ const id=setTimeout(...); return ()=>clearTimeout(id); },[dep])
db.updateOrder(orderId, { status: "Ready" })
crypto.timingSafeEqual(hashBuf, sigBuf)
```
