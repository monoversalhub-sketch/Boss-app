# BOSS — Codebase Path Map
> This file tells agents exactly where everything lives.
> Check here before searching the codebase.

---

## Entry Points

```
src/app/layout.js                           ← Root HTML, font loading (Plus Jakarta Sans)
src/app/page.js                             ← Renders BOSSClient only
src/components/BOSSClient.jsx               ← "use client" wrapper + ErrorBoundary
src/components/BOSSApp.jsx                  ← Root app: auth state, nav, context provider (~260 lines)
```

---

## Component Architecture

```
src/components/boss/
├── tokens.js       ← ALL design tokens (C, S), GLOBAL_CSS, MONTHS, STATUSES,
│                      CLOTH_TYPES, MEAS_FIELDS, NG_BANKS, APP_URL, SERVICE_FEE, VAT_RATE
├── helpers.js      ← Pure functions: fmt, fmtDate, uid, getBalance, getTotalPaid,
│                      getPaymentState, getServiceFee, getNetEarning, allOrders,
│                      orderStatus, isOverdue, isDueToday, waLink, buildReceiptText,
│                      buildReminderMsg, buildInvoiceLinkMsg, invoiceUrl, computeTrustScore
├── context.jsx     ← ErrorBoundary class, BOSSContext, useBOSS() hook
├── ui.jsx          ← GlobalStyles, DatePicker, Btn, Input, Select, Textarea,
│                      SectionLabel, EmptyState, SkeletonCard, Toast, Sheet, Flow
├── cards.jsx       ← TrustScoreCard, TrustScoreSheet, TodayMoneyCard,
│                      OrderCard, StatusStepper, MeasGrid
├── flows.jsx       ← AddOrderFlow, OrderDetailFlow, CustomerDetailFlow,
│                      RemindersFlow, AddClientFlow
└── tabs.jsx        ← SmartPricingCalculator, TodayTab, CustomersTab,
                       WalletTab, ProfileTab, AuthScreen, SetupScreen, SplashScreen
```

---

## Data Layer

```
src/lib/db.js                   ← ONLY file that touches Supabase from client
                                   Functions: signUpWithPassword, signInWithPassword,
                                   getSession, signOut, getTailor, setTailor,
                                   getCustomers, setCustomers, updateOrder,
                                   updateCustomer, recordPayment, deleteOrder,
                                   updateWalletBalance

src/lib/ratelimit.js            ← Upstash Redis rate limiter + in-memory fallback
                                   Functions: checkRateLimit(ip), getClientIp(request)

src/lib/paystack.js             ← Paystack inline script loader + popup helper
                                   Functions: openPaystackPopup({email, amount, ...})

src/lib/supabase/
├── client.js                   ← createClient() for browser
└── server.js                   ← createClient() for server (uses cookies)
```

---

## API Routes

```
src/app/api/auth/
├── signup/route.js             ← POST: creates Supabase user via SERVICE_ROLE_KEY
├── login/route.js              ← POST: signs in, rate-limited via Upstash
├── logout/route.js             ← POST: destroys session
├── session/route.js            ← GET: returns current user
├── forgot-password/route.js    ← POST: sends reset email (uses SERVICE_ROLE_KEY)
└── reset-password/route.js     ← POST: updates password (uses SERVICE_ROLE_KEY)

src/app/api/paystack-webhook/route.js
    ← POST: receives Paystack events, verifies HMAC with timingSafeEqual,
       handles charge.success and transfer.success, idempotency on paystack_ref
       and transfer_code, credits wallet via increment_wallet_balance RPC

src/app/api/paystack-virtual-account/route.js
    ← POST: creates Paystack customer + DVA, saves dva_id and account details
       to tailors table, uses buildDVAName() naming convention

src/app/api/paystack-deactivate-virtual-account/route.js
    ← POST: deactivates DVA using saved paystack_dva_id

src/app/api/paystack-requery-virtual-account/route.js
    ← POST: requeries pending DVA status from Paystack

src/app/api/invoice/[orderId]/route.js
    ← GET: PUBLIC endpoint — returns order, customer name (no phone),
       tailor shop + city (no phone), DVA details for payment

src/app/api/welcome-email/route.js
    ← POST: sends welcome email via Resend, HTML-escapes shopName
```

---

## Public Pages

```
src/app/invoice/[orderId]/page.js
    ← Public invoice page — customer-facing. Shows order details,
       payment status, DVA bank details for transfer, Paystack card payment.
       Does NOT show customer phone or tailor phone.
```

---

## Configuration

```
next.config.js              ← Security headers: CSP, X-Frame-Options, X-Content-Type-Options
supabase-schema.sql         ← Full PostgreSQL schema with RLS policies,
                               increment_wallet_balance RPC, all indexes
package.json                ← Dependencies: @supabase/ssr, @supabase/supabase-js,
                               @upstash/ratelimit, @upstash/redis, next, react
.env.example                ← All required environment variables with descriptions
.env.local                  ← Local secrets (gitignored)
```

---

## Framework Files (this framework)

```
.copilot/
├── context/
│   ├── overview.md         ← What BOSS is, who uses it, current state
│   ├── constraints.md      ← Non-negotiable technical and UX rules
│   └── paths.md            ← This file
├── spec/                   ← Feature specs (created by /spec, approved before /code)
└── artifact/               ← Worklogs from CopilotLogger

.github/
├── agents/                 ← 14 agent definitions
├── prompts/                ← Slash command definitions
└── instructions/           ← Auto-applied rules per file type
```

---

## Key Supabase Tables

```
tailors         ← user_id, shop, phone, city, bos_score, wallet_balance,
                   virtual_account_number, virtual_bank_name, virtual_account_name,
                   virtual_account_status, paystack_customer_code, paystack_dva_id

customers       ← id, tailor_id, name, phone, measurements (JSONB), notes

orders          ← id, customer_id, tailor_id, type, price, deposit, paid,
                   delivery_date, status (CHECK: In Progress|Ready|Delivered),
                   notes, installment_history (JSONB), paystack_ref, created_at

payments        ← id, order_id, tailor_id, amount, method, paystack_ref (UNIQUE),
                   transfer_code (UNIQUE), virtual_account_number, sender_name,
                   created_at

withdrawals     ← id, tailor_id, amount, status, bank_name, bank_code,
                   account_number, account_name, created_at
```

---

## Dependency Map (Who Imports What)

```
BOSSApp.jsx
  └── imports from boss/context.jsx (ErrorBoundary, BOSSContext)
  └── imports from boss/ui.jsx (GlobalStyles, Toast)
  └── imports from boss/tabs.jsx (SplashScreen, AuthScreen, SetupScreen,
                                   TodayTab, CustomersTab, WalletTab, ProfileTab)
  └── imports from boss/flows.jsx (AddOrderFlow, OrderDetailFlow,
                                    CustomerDetailFlow, RemindersFlow, AddClientFlow)

boss/flows.jsx
  └── imports from boss/tokens.js
  └── imports from boss/helpers.js
  └── imports from boss/context.jsx (useBOSS)
  └── imports from boss/ui.jsx (Btn, Input, Select, Textarea, Flow, Sheet,
                                 SectionLabel, EmptyState, DatePicker)
  └── imports from boss/cards.jsx (StatusStepper, MeasGrid, OrderCard)
  └── imports from boss/tabs.jsx (SmartPricingCalculator)  ← circular-risk: monitor
  └── imports from lib/paystack.js
  └── imports from lib/db.js

boss/tabs.jsx
  └── imports from boss/tokens.js
  └── imports from boss/helpers.js
  └── imports from boss/context.jsx (useBOSS)
  └── imports from boss/ui.jsx
  └── imports from boss/cards.jsx (TrustScoreCard, TrustScoreSheet,
                                    TodayMoneyCard, OrderCard)
  └── imports from lib/db.js
```

⚠️ **Circular risk:** `flows.jsx` imports `SmartPricingCalculator` from `tabs.jsx`.
Monitor: if `tabs.jsx` ever imports from `flows.jsx` this becomes a circular dependency.
If that occurs, extract `SmartPricingCalculator` into its own file.
