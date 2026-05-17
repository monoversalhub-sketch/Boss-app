# BOSS — Business Operating System
## Build Trust. Grow Faster.
### A SaaS Product by Monoversal Hub

> From Hustle to BOSS.

BOSS is an **Economic Legitimacy Infrastructure** for informal businesses in Africa.  
It helps tailors (and other artisans) become trusted, organised, visible, and bankable.

---

## Project Structure

```
boss/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/              ← Email login
│   │   │   │   ├── signup/             ← Email signup
│   │   │   │   ├── logout/             ← Sign out
│   │   │   │   ├── session/            ← Session check
│   │   │   │   ├── forgot-password/    ← Send reset email
│   │   │   │   └── reset-password/     ← Update password
│   │   │   ├── paystack-virtual-account/ ← Create dedicated virtual account (uses shop name)
│   │   │   ├── paystack-verify-account/  ← Verify bank account number
│   │   │   ├── paystack-webhook/         ← Handle charge.success + dedicatedaccount.transfer.success
│   │   │   ├── welcome-email/            ← Onboarding email via Resend
│   │   │   └── invoice/[orderId]/        ← Public invoice page API
│   │   ├── invoice/[orderId]/    ← Public-facing invoice + pay page
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── globals.css
│   ├── components/
│   │   ├── BOSSClient.jsx        ← "use client" SSR-safe wrapper
│   │   └── BOSSApp.jsx           ← Full app (all screens + logic, inline styles)
│   └── lib/
│       ├── db.js                 ← Data layer (Supabase + localStorage fallback)
│       ├── paystack.js           ← Paystack payment helpers (virtual accounts)
│       └── supabase.js           ← Supabase client
├── public/
│   ├── favicon.svg
│   ├── icon.svg
│   └── manifest.json
├── supabase-schema.sql           ← Run once in Supabase SQL editor
├── .env.local.example            ← Copy → .env.local and fill keys
├── package.json
└── next.config.js
```

---

## How Payments Work

```
Customer wants to pay balance
          ↓
Tailor shares invoice link (WhatsApp / copy)
          ↓
Customer opens link → sees order breakdown → taps Pay
          ↓
   ┌──────────────────────────────────────┐
   │  Option A: Payment link (Paystack)   │
   │  charge.success webhook fires        │
   │  → order.paid updated automatically  │
   └──────────────────────────────────────┘
              OR
   ┌──────────────────────────────────────┐
   │  Option B: Virtual Account Transfer  │
   │  Customer sends bank transfer to     │
   │  tailor's dedicated virtual account  │
   │  (Wema Bank or Titan by Paystack)    │
   │  dedicatedaccount.transfer.success   │
   │  webhook fires                       │
   │  → auto-matched to order by amount   │
   │  → order.paid updated automatically  │
   └──────────────────────────────────────┘
          ↓
  BOS Score recomputed + saved to DB
  Tailor sees updated balance in Wallet tab
```

**BOSS never holds funds.** Money goes directly to the tailor's bank account.

---

## Virtual Account Setup

Each tailor gets a **Paystack Dedicated Virtual Account** using their shop name.

1. Tailor saves their shop name in Profile tab
2. Taps "Create My Virtual Account"
3. Paystack creates a unique account (Wema Bank or Titan by Paystack)
4. **Account Name = Shop Name** — customers recognise who they're paying
5. Tailor shares account details via WhatsApp or invoice links

No manual bank entry or verification needed. Paystack handles everything.

---

## Navigation Structure

```
Today | Clients | [+] | Wallet | Profile
              ↑
         Action Sheet:
         ➕ New Order
         👤 New Client
```

---

## Profile Tab — Control Center

| Section | Contents |
|---|---|
| 🏪 Profile | Shop name, phone, city |
| 🔒 Security | Password reset, Google/Apple OAuth (coming soon), logout |
| 🏦 Financial Identity | Dedicated Virtual Account (Paystack) — account number, bank, name |
| ☁️ Data & Backup | JSON export, file restore, Google Drive (coming soon) |
| 🧰 Tools | Smart Pricing Engine (labour + production costs + margin + VAT) |

---

## Authentication

- Email + password (Supabase Auth)
- Forgot password → reset link via email
- Google OAuth (UI ready, enable in Supabase dashboard)
- Apple OAuth (UI ready, enable in Supabase dashboard)
- Local/offline mode (localStorage fallback — no account needed)

---

## BOSS Trust Score (BOS Score)

Computed from real business activity. Range: 0–100.

| Factor | Weight |
|---|---|
| Order Completion Rate | 30% |
| Repeat Customers | 25% |
| Payment Consistency | 25% |
| Revenue Signal | 20% |
| Overdue Penalty | −5% per overdue order |

Levels: **New → Building → Growing → Trusted**  
Credit Readiness: **Low / Medium / High**

---

## Quick Setup

### 1. Supabase Database

1. Go to [supabase.com](https://supabase.com) → your project → SQL Editor
2. Paste the entire `supabase-schema.sql` → click **Run**
3. Copy your **Project URL** and **anon key** from Settings → API

### 2. Paystack

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys
2. Copy your **Public Key** and **Secret Key**
3. Set Webhook URL: `https://your-app.vercel.app/api/paystack-webhook`
4. Enable events: `charge.success` + `dedicatedaccount.transfer.success`
5. Enable Dedicated Virtual Accounts in your Paystack dashboard

### 3. Resend (welcome emails — optional)

1. Go to [resend.com](https://resend.com) → API Keys → create key
2. Verify your sending domain
3. Update `FROM_EMAIL` in `src/app/api/welcome-email/route.js`

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
RESEND_API_KEY=re_xxxxxx
```

### 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
cd /storage/emulated/0/Boss-app
git add .
git commit -m "update"
git push -f origin main
```

Vercel auto-deploys on push.

Add all env variables in Vercel → Project → Settings → Environment Variables.

---

## Offline / Demo Mode

No Supabase keys? The app uses **localStorage automatically**.  
Everything works — orders, clients, measurements — stored in the browser.  
Perfect for demos and testing without any backend setup.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, inline styles only (no Tailwind, no CSS modules) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Email Auth + OAuth |
| Payments | Paystack Dedicated Virtual Accounts |
| Email | Resend |
| Hosting | Vercel |

---

## ENV Variables Reference

| Variable | Source | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Webhooks (server-only) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack → Settings → API Keys | Online payments |
| `PAYSTACK_SECRET_KEY` | Paystack → Settings → API Keys | Webhook + virtual account creation |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | Invoice links, password reset |
| `RESEND_API_KEY` | resend.com | Welcome emails (optional) |

---

© 2025 Monoversal Hub. All rights reserved.  
BOSS — Build Trust. Grow Faster.
