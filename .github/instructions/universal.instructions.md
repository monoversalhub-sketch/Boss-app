---
applyTo: "**/*.{js,jsx}"
---

# BOSS Universal Instructions
> These rules apply to EVERY JavaScript and JSX file in this repository.
> Any AI agent editing a file must follow these rules automatically.

---

## Forbidden Patterns — Will Be Flagged Immediately

### 1. alert() is banned
```js
// ❌ NEVER
alert("something happened")
window.alert("error")

// ✅ ALWAYS
toast("something happened")  // from useBOSS()
```

### 2. String equality on cryptographic values is banned
```js
// ❌ NEVER — timing attack vulnerability
if (hash !== signature) { ... }
if (hash === signature) { ... }

// ✅ ALWAYS — constant-time comparison
const valid = crypto.timingSafeEqual(
  Buffer.from(hash),
  Buffer.from(signature)
);
```

### 3. Math.random() for IDs is banned
```js
// ❌ NEVER — collision-prone
const id = "b" + Date.now().toString(36) + Math.random().toString(36)
const id = Math.random().toString(36)

// ✅ ALWAYS — cryptographically unique
const id = crypto.randomUUID()
```

### 4. Bare setTimeout with state setters is banned
```js
// ❌ NEVER — fires after unmount, leaks memory
setTimeout(() => setMsg(""), 2500)
setTimeout(() => setSaved(false), 2200)

// ✅ ALWAYS — cleaned up on unmount
useEffect(() => {
  if (!msg) return;
  const id = setTimeout(() => setMsg(""), 2500);
  return () => clearTimeout(id);
}, [msg]);
```

### 5. Offline mode identifiers are banned
```js
// ❌ NEVER — offline mode removed in v10
localStorage.setItem("boss_mode", "local")
localStorage.getItem("boss_mode")
localStorage.setItem("boss_local_user", ...)
handleLocalMode()
"Continue Without Account"
```

### 6. className is banned
```js
// ❌ NEVER — inline styles only
<div className="container">
<button className="btn-primary">

// ✅ ALWAYS
<div style={{ padding: 20, backgroundColor: C.bg }}>
<button style={{ ...S.btn, backgroundColor: C.dark }}>
```

### 7. Supabase client at module level is banned
```js
// ❌ NEVER — fails on Vercel cold starts
const supabase = createClient(...)  // at top of file

// ✅ ALWAYS — inside handler
export async function POST(request) {
  const supabase = createClient(...)
  // ...
}
```

---

## Required Patterns

### Design tokens come from tokens.js
```js
import { C, S } from "./boss/tokens";
// or
import { C, S } from "./tokens";

// Use C.text, C.green, C.red, C.accent — never hardcode hex values
```

### User feedback uses toast
```js
const { toast } = useBOSS();
toast("✅ Order saved!");
toast("⚠️ Enter a delivery date");
```

### Database writes for updates use targeted functions
```js
// Single order field update
await db.updateOrder(orderId, { status: "Ready" });

// Single customer field update
await db.updateCustomer(customerId, { measurements: meas });

// Bulk creation ONLY
await db.setCustomers(next);
```
