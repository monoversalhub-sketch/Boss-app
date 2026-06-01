---
name: review
description: Cross-model review of a completed BOSS implementation. Checks spec conformance, UX quality, accessibility, and the first-win path. Uses a different model family than Developer to surface blind spots.
---

# /review <spec_id> — BOSS Cross-Model Review

You are acting as the Reviewer Agent.
Your model (gemini-2.0-flash) is intentionally different from the Developer's model.
You are looking for what the Developer could not see about its own work.

## Pre-Flight
Read:
1. `.copilot/spec/<spec_id>.md` — the approved spec
2. `.copilot/context/constraints.md` — the rules
3. Every file modified in the implementation

---

## Six-Area Review

### Area 1 — Spec Conformance
For each acceptance criterion in the spec:
- Is it addressed? Where in the code?
- Is anything outside spec scope added? (flag as scope creep)

### Area 2 — UX Accessibility
Apply the Lagos Tailor Standard:
- [ ] Tap targets ≥ 48dp on all new interactive elements
- [ ] Font sizes ≥ 12px on all new text (10px exception: nav icon labels)
- [ ] No technical jargon in user-facing copy
- [ ] Error messages are specific and actionable
- [ ] Loading states use SkeletonCard

### Area 3 — First-Win Path
Trace the 8-step path from overview.md.
State explicitly: INTACT or BROKEN AT STEP N.

### Area 4 — BOSS UX Rules
- [ ] Service fee NOT shown during payment collection
- [ ] "Customer" not "Client" terminology
- [ ] "Profile" not "Settings"
- [ ] Delete requires 2-tap confirmation
- [ ] All bottom sheets dismissable by backdrop tap
- [ ] WhatsApp messages sound human, not template

### Area 5 — Code Quality
- [ ] No prop drilling beyond one level
- [ ] useMemo on expensive derivations
- [ ] New components in correct boss/ submodule
- [ ] No duplicate consts vs tokens.js
- [ ] Icon SVGs defined outside component functions

### Area 6 — Terminology Audit
Scan all new user-facing strings for:
- "Client" → must be "Customer"
- "Settings" → must be "Profile"
- "Earnings" → must be "Wallet"
- "Pending" order status → must not exist
- Service fee shown during payment → must not exist

---

## Output

```
## Code Review — <spec_id>

**Reviewer Model:** gemini-2.0-flash
**Date:** YYYY-MM-DD

### Spec Conformance
- ✅ AC1 — [where satisfied]
- ❌ AC2 — NOT addressed — [what's missing]

### UX Accessibility
- ✅ Tap targets ≥ 48dp
- ❌ [element] at [file]:[line] — [X]dp, must be 48dp

### First-Win Path
✅ INTACT — all 8 steps work
❌ BROKEN at step [N] — [description of break]

### BOSS UX Rules
- ✅ Service fee not shown during payment
- ❌ [rule violated] at [file]:[line]

### Code Quality
- ✅ No prop drilling
- ❌ [issue] at [file]:[line]

### Terminology
- ✅ All correct
- ❌ "[found text]" at [file]:[line] — should be "[correct text]"

### Verdict
✅ APPROVED — ready for /log and deployment
❌ CHANGES REQUESTED

### Required Changes (numbered, specific)
1. [What to change] — [file] line [N]
2. ...

### Optional Improvements (non-blocking)
1. ...
```
