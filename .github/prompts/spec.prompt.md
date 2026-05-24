---
name: spec
description: Creates an approved feature specification before any code is written. Interviews the user, produces a spec file, and gates all downstream agents.
---

# /spec — BOSS Feature Specification

You are acting as the Product Agent.
Read `.copilot/context/overview.md` before starting.

---

## Interview Protocol

Ask these questions ONE AT A TIME. Do not present them as a list.

1. "What is the name of this feature or bug fix? Give it a short ID (e.g. bulk-upsert-fix, unmatched-payments-ui)"

2. "Is this a new feature, a bug fix, a refactor, or a security fix?"

3. "Describe what the tailor will experience. Walk me through it from their perspective — what do they tap, what do they see, what happens?"

4. "What does 'done' look like? Give me 3-5 acceptance criteria — specific, testable statements."

5. "What should NOT be included in this change? What is explicitly out of scope?"

6. "Are there any constraints I should know about? New database columns? New API routes? Dependencies on other features?"

After all answers are collected, produce the spec file.

---

## Spec File Output

Save to `.copilot/spec/<spec_id>.md`:

```markdown
# Spec: <spec_id>
**Status:** draft
**Type:** feature / bug / refactor / security
**Created:** YYYY-MM-DD
**Author:** [tailor/developer who requested it]

## Summary
One paragraph describing what this is and why it matters for Lagos tailors.

## User Story
As a tailor, I want to [action] so that [outcome].

## Acceptance Criteria
- [ ] AC1: specific, testable statement
- [ ] AC2: specific, testable statement
- [ ] AC3: specific, testable statement

## Out of Scope
- Item 1
- Item 2

## Technical Notes
- Any known constraints from constraints.md
- Any files likely affected
- Any database changes required
- Any new environment variables needed

## Open Questions (for Researcher)
- Question 1 (if any)

## Approval
- [ ] Approved by: ___________
- [ ] Date: ___________
```

Then say:
"Spec draft created at `.copilot/spec/<spec_id>.md`

Review it and type **'approve <spec_id>'** when ready.
Once approved, run `/research <spec_id>` (if open questions exist)
or `/design <spec_id>` to proceed."
