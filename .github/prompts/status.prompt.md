---
name: status
description: Outputs the current BOSS launch readiness dashboard — score, blocking items, confirmed correct items, and next priority action.
---

# /status — BOSS Launch Readiness Dashboard

You are providing a project status report.
Read `.copilot/context/overview.md` for context.
Check `.copilot/artifact/worklog/` for the most recent session log.
Check `.copilot/spec/` for any open specs.

---

## Output Format

```
════════════════════════════════════════════════
  BOSS — Launch Readiness Dashboard
  v10 · $(date)
════════════════════════════════════════════════

OVERALL SCORE: 6.5 / 10

Engineering Quality:    8.5/10  ████████░░
Security:               7.5/10  ███████░░░
UX/Accessibility:       7.0/10  ███████░░░
Legal/Compliance:       3.0/10  ███░░░░░░░
Business Readiness:     5.0/10  █████░░░░░

════════════════════════════════════════════════
  🔴 TIER 1 — BLOCKING (must fix before paying users)
════════════════════════════════════════════════

[ ] PARTIAL-01  db.setCustomers() N+1 loop
                → Replace with bulk upsert (2 calls, not a for-loop)
                → File: src/lib/db.js
                → Effort: 20 min

[ ] PARTIAL-02  BOS Score repeat rate formula inverted
                → repeatRate = repeatCustomers / customers.length
                → File: helpers.js + webhook route.js
                → Effort: 20 min

[ ] PARTIAL-03  creditWallet() fallback bypasses atomic RPC
                → Remove the direct wallet_balance update fallback
                → File: paystack-webhook/route.js
                → Effort: 10 min

[ ] MISSING-01  No Privacy Policy / Terms of Service
                → Nigerian NDPA 2023 requires before data collection
                → Action: Engage Nigerian fintech lawyer
                → Effort: External

[ ] MISSING-02  No UI for unmatched DVA payments
                → Transfers with no matching order land in wallet silently
                → File: WalletTab in tabs.jsx
                → Effort: 1 day

[ ] MISSING-03  No sync/connection status indicator
                → Supabase write failures are silent on 3G
                → Effort: 1 day

[ ] BUG-AUTH    Auth emails not sending
                → Signup confirmation, forgot-password, reset all fail
                → Root cause: anon key used instead of SERVICE_ROLE_KEY
                → Files: signup/route.js, forgot-password/route.js, reset-password/route.js
                → Also: configure Supabase dashboard SMTP + email templates
                → Effort: 45 min + Supabase dashboard config

[ ] BUG-SAVE    Double-save creates duplicate orders
                → No isSaving guard in AddOrderFlow
                → File: flows.jsx — save() function
                → Effort: 30 min

════════════════════════════════════════════════
  🟡 TIER 2 — LAUNCH QUALITY (fix within first week)
════════════════════════════════════════════════

[ ] Q-03  tabs.jsx is 1,158 lines — extract ProfileTab
[ ] Q-04  SmartPricingCalculator fee formula edge cases
[ ] Q-05  Invoice payment auto-polling (customer pays → status updates live)
[ ] A-01  BOS Score explainability panel (show what drives the score)
[ ] A-02  Self-declaration score boost for new tailors (onboarding)
[ ] A-04  bos_score_history table (track score over time)

════════════════════════════════════════════════
  ✅ CONFIRMED CORRECT — DO NOT TOUCH
════════════════════════════════════════════════

✅ HMAC webhook with crypto.timingSafeEqual()
✅ Upstash Redis rate limiter with in-memory fallback
✅ Idempotency on paystack_ref AND transfer_code
✅ db.updateOrder() / db.updateCustomer() targeted writes
✅ Auto-receipt WhatsApp prompt (deposit > 0 + phone exists)
✅ ErrorBoundary at BOSSClient level
✅ Custom DatePicker (Android WebView safe)
✅ Promise.all([minWait, dataLoad]) splash transition
✅ DVA naming: first_name="BOSS", last_name=cleanedShopName
✅ paystack_dva_id saved for deactivation
✅ Customer/tailor phone excluded from public invoice API
✅ Offline mode fully removed

════════════════════════════════════════════════
  📋 OPEN SPECS
════════════════════════════════════════════════

[Check .copilot/spec/ for any draft or approved specs]

════════════════════════════════════════════════
  🎯 NEXT PRIORITY ACTION
════════════════════════════════════════════════

Start with BUG-AUTH — auth emails not sending.
Run: /spec auth-email-fix
This unblocks the entire user acquisition funnel.
Single most impactful fix in the codebase right now.
════════════════════════════════════════════════
```
