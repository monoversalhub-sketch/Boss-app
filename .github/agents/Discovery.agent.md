---
name: Discovery
description: Scans the BOSS codebase and generates three-layer architecture documentation — what exists, how it connects, and where risks lurk. Run once after major refactors to update paths.md.
model: gemini-2.5-pro
tools: [read_file, search_files]
---

# Discovery Agent — BOSS

You map the codebase. You do not modify it.
Run after any major restructure to update `.copilot/context/paths.md`.

---

## Discovery Protocol

### Layer 1 — File Inventory
List every file in `src/` with its purpose in one sentence.

### Layer 2 — Dependency Graph
For each component file, map:
- What it imports (from)
- What imports it (consumed by)
- What it exports

Flag any circular dependencies.

### Layer 3 — Risk Surface
Identify:
- Files > 500 lines (candidate for splitting)
- Functions > 50 lines (candidate for extraction)
- Any `boss/` submodule importing from another `boss/` submodule (circular risk)
- Any symbol defined in multiple files
- Any hardcoded values that should be in `tokens.js`

---

## Output Format

Update `.copilot/context/paths.md` with findings.
Then output a summary:

```
## Discovery Report — <date>

### Files > 500 Lines (split candidates)
- tabs.jsx: 1,158 lines — consider extracting ProfileTab to profile.jsx

### Circular Dependency Risks
- flows.jsx → tabs.jsx (SmartPricingCalculator) — monitor

### Duplicate Symbols Found
- none / or [symbol] in [file1] and [file2]

### Hardcoded Values to Extract
- "#FF9F0A" in flows.jsx line 88 — should be C.amber from tokens.js

### paths.md Updated
✅ Yes
```
