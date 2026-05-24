---
applyTo: "**/*.jsx"
---

# BOSS React/JSX Instructions
> Applies to every .jsx file. Enforces BOSS component architecture rules.

---

## File Placement Rules

Before creating or editing any component, check where it belongs:

| Component type | Correct file |
|---|---|
| New colour, constant, token | `boss/tokens.js` |
| New pure function (no React) | `boss/helpers.js` |
| New button, input, sheet, modal | `boss/ui.jsx` |
| New card, stepper, grid | `boss/cards.jsx` |
| New full-screen sliding panel | `boss/flows.jsx` |
| New tab screen or auth screen | `boss/tabs.jsx` |
| New root wiring | `BOSSApp.jsx` (keep under 300 lines) |

**Never create a new component directly in `BOSSApp.jsx`.**

---

## After Every Change to boss/ Files

Run the duplicate-const check:
```bash
grep -n "^const " src/components/boss/*.jsx src/components/boss/*.js
```

If any symbol from `tokens.js` appears in a submodule file as a `const` definition,
remove it from the submodule — it must only be imported.

Common duplicates to watch for:
- `NG_BANKS` — only in tokens.js
- `MONTHS` — only in tokens.js
- `CLOTH_TYPES` — only in tokens.js
- `STATUSES` — only in tokens.js
- `SERVICE_FEE` — only in tokens.js
- `VAT_RATE` — only in tokens.js

---

## Component Rules

### Shared State
```js
// ✅ Access shared state via useBOSS()
const { customers, setCustomers, tailor, toast } = useBOSS();

// ❌ Never pass customers/setCustomers/tailor/toast as props through multiple levels
```

### Expensive Computations
```js
// ✅ Memoize all derived values
const orders = useMemo(() => allOrders(customers), [customers]);
const sorted = useMemo(() => [...orders].sort(...), [orders]);

// ❌ Never compute inside render without memoization
const orders = allOrders(customers); // recomputes every render
```

### Functions Passed as Props
```js
// ✅ Wrap in useCallback
const handleSave = useCallback(async () => { ... }, [deps]);

// ❌ Inline arrow functions as props recreate on every render
onClick={() => doSomething()} // on expensive children — use useCallback
```

### Icon SVGs
```js
// ✅ Define OUTSIDE the component function — stable reference
const IconSave = () => <svg>...</svg>;

function MyComponent() {
  return <IconSave />;
}

// ❌ Inside function — recreated every render
function MyComponent() {
  const IconSave = () => <svg>...</svg>; // new function every render
  return <IconSave />;
}
```

---

## UX Rules in JSX

### Touch Targets
```js
// ✅ Minimum 48dp height on all tappable elements
<button style={{ minHeight: 48, padding: "12px 20px" }}>
  Tap me
</button>
```

### Font Sizes
```js
// ✅ Minimum 12px everywhere
<div style={{ fontSize: 12 }}>caption text</div>

// ✅ Exception: nav icon labels only
<div style={{ fontSize: 10, textTransform: "uppercase" }}>{n.label}</div>

// ❌ Never below 10px in any context
<div style={{ fontSize: 8 }}>
```

### Empty States
```js
// ✅ Always use EmptyState component for empty lists
{list.length === 0
  ? <EmptyState
      icon="✂️"
      title="Your first order is one tap away."
      sub="Every trusted tailor in Lagos started right here."
    />
  : list.map(...)
}
```

### Delete Confirmation
```js
// ✅ Two-tap confirmation using a Sheet
const [confirmDelete, setConfirmDelete] = useState(false);

// First tap opens confirmation
<Btn variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Btn>

// Sheet with second tap to confirm
{confirmDelete && (
  <div style={{ position: "fixed", inset: 0, zIndex: 400 }}>
    ...
    <Btn variant="danger" onClick={handleDelete}>Yes, Delete</Btn>
    <Btn variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Btn>
  </div>
)}
```

---

## Terminology in JSX Strings

| ❌ Wrong | ✅ Correct |
|---|---|
| "Client" | "Customer" |
| "Settings" tab label | "Profile" |
| "Earnings" tab label | "Wallet" |
| "Pending" status | Does not exist — use "In Progress" |
| "Financial Identity" in menu | Not in menu — only in Wallet tab |
