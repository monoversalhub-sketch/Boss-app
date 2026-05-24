---
applyTo: "src/app/api/**/*.js"
---

# BOSS API Route Instructions
> Applies to every file in src/app/api/. Enforces server-side security rules.

---

## Supabase Client Initialisation

### ✅ ALWAYS — inside the handler function
```js
export async function POST(request) {
  // ✅ Inside handler — env vars guaranteed available
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // ...
}
```

### ❌ NEVER — at module level
```js
// ❌ Top of file — fails on Vercel cold starts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) { ... }
```

---

## Auth Routes — Service Role Key Required

For any auth operation (create user, send email, update password, admin actions):
```js
// ✅ Use SERVICE_ROLE_KEY — bypasses RLS, can send emails
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
await supabase.auth.admin.createUser({ email, password, ... });
await supabase.auth.admin.generateLink({ type: "recovery", email });
```

```js
// ❌ Anon key CANNOT send password reset emails or create admin users
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await supabase.auth.resetPasswordForEmail(email); // silently fails
```

---

## Public Endpoints — PII Rules

Routes accessible without authentication (invoice page) must NEVER return:
- `customer.phone`
- `tailor.phone`
- Any email address
- Any account number beyond the DVA for payment

```js
// ✅ Safe public response
return NextResponse.json({
  customer: { name: order.customers?.name || "Customer" },
  tailor:   { shop: t.shop, city: t.city,
               virtual_account_number: t.virtual_account_number,
               virtual_bank_name: t.virtual_bank_name }
});

// ❌ PII exposure — NDPA 2023 violation
return NextResponse.json({
  customer: { name: order.customers?.name, phone: order.customers?.phone },
  tailor:   { shop: t.shop, phone: t.phone }
});
```

---

## Webhook Route — HMAC Verification

Must use constant-time comparison. Always. No exceptions.

```js
// ✅ Constant-time — safe against timing attacks
const hash   = crypto.createHmac("sha512", secret).update(body).digest("hex");
const hashBuf = Buffer.from(hash);
const sigBuf  = Buffer.from(signature);
const valid   = hashBuf.length === sigBuf.length &&
                crypto.timingSafeEqual(hashBuf, sigBuf);
if (!valid) return new Response("Unauthorized", { status: 401 });

// ❌ String comparison — timing attack allows signature forgery
if (hash !== signature) return new Response("Unauthorized", { status: 401 });
```

## Webhook Route — Idempotency

Always check for duplicate processing before acting:
```js
// ✅ Check if already processed
const { data: existing } = await supabase
  .from("payments")
  .select("id")
  .eq("paystack_ref", ref)
  .maybeSingle();

if (existing) {
  console.log(`[webhook] Already processed ref=${ref}, skipping`);
  return new Response("OK", { status: 200 });
}
```

---

## Wallet Credit — Atomic RPC Only

```js
// ✅ Atomic — prevents race conditions on simultaneous transfers
const { error } = await supabase.rpc("increment_wallet_balance", {
  tailor_uuid: tailor.id,
  amount_to_add: amountInKobo / 100
});

// ❌ Race condition — two transfers can both read same balance
const { data: tailor } = await supabase.from("tailors").select("wallet_balance")...
const newBalance = tailor.wallet_balance + amount;
await supabase.from("tailors").update({ wallet_balance: newBalance })...
```

---

## Authentication Check Pattern

For protected POST endpoints (not public invoice):
```js
export async function POST(request) {
  const supabase = createClient(...);

  // ✅ Always verify session before processing
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... proceed with user.id
}
```

---

## Rate Limiting on Auth Routes

Auth routes must apply the Upstash rate limiter:
```js
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request) {
  // ✅ Rate limit first — before any processing
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }
  // ...
}
```
