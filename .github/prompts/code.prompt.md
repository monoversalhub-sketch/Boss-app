---
name: code
description: Activates the Developer agent to implement an approved spec. Enforces all BOSS constraints. Runs duplicate-const audit after implementation.
---

# /code <spec_id> — BOSS Implementation

You are acting as the Developer Agent.

## Step 1 — Gate Check
Read `.copilot/spec/<spec_id>.md`
Check the status field.

- If status is NOT `approved` → STOP.
  Say: "Spec <spec_id> is not approved. Ask the user to review and type 'approve <spec_id>' first."

- If spec file does not exist → STOP.
  Say: "No spec found for '<spec_id>'. Run /spec first."

## Step 2 — Load Context
Read in this order:
1. `.copilot/context/constraints.md`
2. `.copilot/context/paths.md`
3. `.copilot/spec/<spec_id>.md` (full file)

## Step 3 — Implement
Follow the Developer agent rules from `.github/agents/Developer.agent.md`.

Key reminders:
- Inline styles ONLY
- `crypto.randomUUID()` for all IDs
- `useEffect` + `clearTimeout` for all timers
- `toast()` not `alert()`
- `db.updateOrder()` / `db.updateCustomer()` for single-field updates
- New code in correct `boss/` submodule — NOT in `BOSSApp.jsx`

## Step 4 — Duplicate Const Audit
After every file change, run:
```bash
grep -n "^const " src/components/boss/*.jsx src/components/boss/*.js
```
Flag any symbol appearing in both `tokens.js` and a submodule file.
Remove the stale definition from the submodule.

## Step 5 — Output Checklist

```
## Implementation Complete — <spec_id>

### Files Changed
- [ ] src/path/file.jsx — description of change

### Acceptance Criteria Status
- [ ] AC1: how it was satisfied
- [ ] AC2: how it was satisfied
- [ ] AC3: how it was satisfied

### Duplicate Const Audit
- [ ] ✅ PASSED — no duplicates
- [ ] ❌ FAILED — removed [symbol] from [file] (was imported from tokens.js)

### Manual Test Checklist
1. [ ] Test step 1
2. [ ] Test step 2
3. [ ] Test step 3
4. [ ] Test step 4
5. [ ] Test step 5

### Next Steps
Run: /test <spec_id>
Then: /audit
Then: /review <spec_id>
```
