# BOSS Admin — Implementation Guide

## Prerequisites

- Supabase project (existing)
- Vercel project (existing, auto-deploys from `main`)
- Access to Supabase SQL Editor
- Access to Vercel project dashboard

---

## Step 1: Run Database Migration

Open your Supabase project's **SQL Editor** and run the entire contents of `supabase-admin-schema.sql`.

This creates **12 new tables**:
| Table | Purpose |
|---|---|
| `admin_users` | Admin team members with roles |
| `feature_events` | Feature usage tracking |
| `journey_analytics` | User journey completion data |
| `business_health_scores` | Daily health scores per business |
| `churn_risk` | Churn predictions per business |
| `trust_score_history` | Score change audit log |
| `support_tickets` | Customer support queue |
| `feature_requests` | User-submitted feature ideas |
| `bug_reports` | Bug tracking |
| `credit_readiness` | Lending readiness data |
| `product_metrics` | Daily feature adoption aggregates |
| `admin_auth_links` | Links Supabase auth users to admin users |

All tables have Row Level Security (RLS) enabled with policies that only allow admin users to read/write.

---

## Step 2: Create Admin User

In Supabase SQL Editor, run:

```sql
INSERT INTO admin_users (email, name, role)
VALUES ('your.email@example.com', 'Your Name', 'admin');
```

Then create a Supabase Auth user for this admin:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Invite user** or **Add user**
3. Enter the admin's email and a temporary password
4. Note the `id` (UUID) of the newly created auth user

Link the admin user to the auth user:

```sql
INSERT INTO admin_auth_links (admin_id, auth_user_id)
VALUES (
  (SELECT id FROM admin_users WHERE email = 'your.email@example.com'),
  'AUTH_USER_ID_FROM_STEP_ABOVE'
);
```

---

## Step 3: Set Vercel Environment Variables

In **Vercel Project Dashboard → Settings → Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `CRON_SECRET` | Any strong random string | Used to authenticate cron job calls to admin API routes |

If not already set, also ensure:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `...` | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | `...` | Required for admin cron routes to bypass RLS |

---

## Step 4: Deploy to Vercel

```bash
git add -A
git commit -m "Admin: Business Success Intelligence Platform — 17 pages, event tracking, cron compute"
git push origin main
```

Vercel auto-deploys from `main`. Monitor the deployment at `https://vercel.com/your-team/boss-app/deployments`.

---

## Step 5: Verify Deployment

1. Visit `https://boss-africa.vercel.app/admin/login`
2. Sign in with the admin credentials created in Step 2
3. You should see **Mission Control** dashboard with live metrics
4. Navigate through all sidebar sections:
   - Mission Control
   - Users
   - Businesses
   - Orders
   - Customers
   - Payments
   - Measurements
   - Reminders
   - Trust Score
   - Customer Success
   - Product Intelligence
   - Support Center
   - Feature Requests
   - Bug Center
   - Fraund & Risk
   - Experiments
   - Settings

Expect empty tables on first load — data populates as cron jobs run and events fire from user activity.

---

## Step 6: Verify Cron Jobs Run

The following cron routes are registered in `vercel.json` and will execute automatically on schedule:

| Route | Schedule | What it does |
|---|---|---|
| `/api/admin/cron/compute-trust` | 5:00 AM daily | Recomputes all trust scores |
| `/api/admin/cron/compute-health` | 5:30 AM daily | Computes business health scores |
| `/api/admin/cron/compute-churn` | 6:00 AM daily | Recalculates churn risk |
| `/api/admin/cron/compute-credit` | 6:30 AM daily | Updates credit readiness |

Check Vercel **Logs** to confirm these fire without 401 errors (requires `CRON_SECRET` set).

---

## Step 7: Event Tracking Goes Live Automatically

Once deployed, the following user actions automatically populate `feature_events` and `journey_analytics` tables:

| Action | Event |
|---|---|
| Today tab viewed | `screen_view: today_tab` |
| Order filter changed | `feature_use: order_filter` |
| Add Order Flow opened | `journey: add_order → started` |
| Step changed | `journey: add_order → step_2/3/4` |
| Order saved | `journey: add_order → completed` + `feature_use: add_order` |
| Flow closed without saving | `journey: add_order → abandoned` |
| Smart Pricing Calculator used | `feature_use: smart_pricing_calculator` |
| Payment recorded | `feature_use: record_payment` |
| Status changed | `feature_use: status_change` |
| WhatsApp message sent | `feature_use: wa_message` |
| Calendar export used | `feature_use: add_to_calendar` |
| Invoice viewed | `feature_use: view_receipt` |
| Reminder sent | `feature_use: reminder_send` |
| Invoice link copied | `feature_use: remonder_copy_link` |
| Onboarding started | `journey: setup → started` |
| Onboarding completed | `journey: setup → completed` |

Data appears in **Product Intelligence** and **Journey Analytics** admin pages within minutes.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel (Next.js 16)                     │
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │             src/app/admin/ (17 pages)              │     │
│  │  Layout → AdminShell → LayoutContents (sidebar)    │     │
│  │  Each page imports from src/lib/admin/             │     │
│  └────────────────────────┬───────────────────────────┘     │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐     │
│  │              src/lib/admin/ (7 files)               │     │
│  │  analytics.js  churn.js  credit.js  events.js       │     │
│  │  health.js     metrics.js  trust-score.js           │     │
│  └────────────────────────┬───────────────────────────┘     │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐     │
│  │              Supabase (PostgreSQL)                   │     │
│  │  12 admin tables + existing app tables               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Cron Routes (Vercel Cron Jobs)                    │     │
│  │  /api/admin/cron/compute-*  (5-6:30 AM daily)      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## File Inventory (new files)

```
supabase-admin-schema.sql                         — DB schema (12 tables)
src/lib/admin/analytics.js                        — Journey & feature analytics
src/lib/admin/churn.js                            — Churn detection engine
src/lib/admin/credit.js                           — Credit readiness engine
src/lib/admin/events.js                           — Client-side event tracking
src/lib/admin/health.js                           — Business health scoring
src/lib/admin/metrics.js                          — Metrics computation
src/lib/admin/trust-score.js                      — Trust Score Intelligence
src/components/admin/AdminShell.jsx               — Dynamic client wrapper
src/components/admin/Layout.jsx                   — Shared UI components
src/components/admin/LayoutContents.jsx           — Sidebar + shell layout
src/app/admin/page.js                             — Mission Control
src/app/admin/login/page.js                       — Admin login
src/app/admin/users/page.js                       — All users
src/app/admin/users/[id]/page.js                  — User detail
src/app/admin/businesses/page.js                  — Businesses filterable
src/app/admin/businesses/[id]/page.js             — Redirects to user detail
src/app/admin/orders/page.js                      — Order management
src/app/admin/customers/page.js                   — Customer list
src/app/admin/payments/page.js                    — Payment Intelligence
src/app/admin/measurements/page.js                — Measurements Intelligence
src/app/admin/reminders/page.js                   — Reminder tracking
src/app/admin/trust-score/page.js                 — Trust Score Intelligence
src/app/admin/customer-success/page.js            — Customer Success Center
src/app/admin/product-intelligence/page.js        — Product Intelligence
src/app/admin/support/page.js                     — Support Center
src/app/admin/feature-requests/page.js            — Feature Requests
src/app/admin/bug-center/page.js                  — Bug Center
src/app/admin/fraud-risk/page.js                  — Fraud & Risk
src/app/admin/experiments/page.js                 — Experiments
src/app/admin/settings/page.js                    — Settings
src/app/admin/activity/page.js                    — Activity log (placeholder)
src/app/api/admin/cron/compute-trust/route.js     — Trust score cron
src/app/api/admin/cron/compute-health/route.js    — Health score cron
src/app/api/admin/cron/compute-churn/route.js     — Churn risk cron
src/app/api/admin/cron/compute-credit/route.js    — Credit readiness cron
```

## Files modified

```
vercel.json                                        — 4 new cron entries
src/components/boss/flows/AddOrderFlow.jsx          — Event tracking integration
src/components/boss/flows/OrderDetailFlow.jsx       — Event tracking integration
src/components/boss/flows/RemindersFlow.jsx         — Event tracking integration
src/components/boss/flows/CustomerDetailFlow.jsx    — Events import
src/components/boss/tabs/TodayTab.jsx               — Screen view + filter tracking
src/components/boss/tabs/EarningsTab.jsx            — Screen view tracking
src/components/boss/tabs/CustomersTab.jsx           — Screen view tracking
src/components/boss/tabs/ProfileTab.jsx             — Screen view tracking
src/components/boss/SetupScreen.jsx                 — Journey tracking
```
