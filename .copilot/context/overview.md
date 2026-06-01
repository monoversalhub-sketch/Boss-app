# BOSS — Project Overview
> Read this file before acting on any task in this repository.

---

## What BOSS Is

BOSS is a SaaS product owned and operated by **Monoversal Hub** (CAC BN 9319562).

BOSS is **not**:
- Bookkeeping software
- A CRM
- An invoicing tool
- An admin dashboard

BOSS **is**:
> Economic Legitimacy Infrastructure for informal businesses in Africa.

It gives Lagos tailors a business bank account identity, order tracking, customer
measurement storage, WhatsApp receipt sharing, and a Trust Score that will eventually
unlock working capital credit — things that currently require a CAC registration and
₦50,000+ in bank fees.

---

## The Core Problem

> "Nobody takes my business seriously."

A Lagos tailor today operates with:
- A personal bank account (GTBank/Opay) — shared with family transfers, no way to know which ₦15,000 came from which customer
- A notebook — gets wet, gets lost, left at home
- WhatsApp — just messages, no receipts, no proof of payment
- Memory — holds ~20 customers before orders fall through

They have survived with this system. BOSS must not just digitise their pain —
it must make them feel something new.

---

## The Three Things BOSS Sells

**1. Business Identity**
When a customer opens their banking app and sees:
```
Personal account:  CHUKWUEMEKA OKONKWO
BOSS account:      BOSS BY MNVSL / BOSS CHIDI FASHION
```
The tailor looks like a real business immediately, without CAC registration.

**2. Payment Trust**
Every payment auto-records against a specific order with timestamp and reference.
The WhatsApp receipt is not just a message — it is a receipt with an invoice link
the customer can open, screenshot, and refer back to. No tailor in Yaba or Balogun
market currently has this.

**3. The Trust Score — The Long Game**
The BOS Score builds silently. Every order completed, every payment received,
every customer served is scored. When BOSS unlocks working capital credit,
the tailors who were earliest on the platform have the best scores.
Every transaction becomes an investment, not just a record.

---

## The Real Competitor

**Not another app. Inertia.**

Notebooks never crash. Memory needs no wifi. The real objection is:
"This is new and new things take time to learn."

BOSS wins by engineering **the first win in under 10 minutes**:
Add an order → log a deposit → send a WhatsApp receipt →
customer replies "this looks professional."

That single reaction converts a sceptic into a daily user.
Everything else — fees, Trust Score, DVA — is a bonus discovered over time.

---

## Target Users

**Primary:** Tailors in Lagos, Nigeria.

**Expansion:** Barbers, hair stylists, mechanics, electricians, traders,
carpenters, freelancers, caterers across Nigeria and Africa.

**Monopoly Strategy:** Dominate tailors in Lagos first.
Goal: Become the default operating system for tailors in Lagos.
Then expand across Africa.

---

## Current State (v10)

- **Version:** 13
- **Deployment:** Live at Vercel — https://boss-app-nine.vercel.app
- **Launch Readiness:** 6.5 / 10
- **Blocking Items:** 8 Tier 1 items before paying users
- **Engineering Quality:** 8.5 / 10
- **Legal/Compliance:** 3.0 / 10 (Privacy Policy + CBN review missing)
- **Security:** 7.5 / 10

### What Is Confirmed Excellent (Do Not Touch)
- Webhook HMAC with `crypto.timingSafeEqual()`
- Idempotency on `paystack_ref` AND `transfer_code` (UNIQUE indexes)
- Upstash Redis rate limiter with in-memory fallback and graceful fail-open
- `db.js` localStorage-as-cache-only with Supabase as single source of truth
- `db.updateOrder()` / `db.updateCustomer()` targeted single-row writes
- `Promise.all([minWait, dataLoad])` splash transition
- ErrorBoundary at the BOSSClient level (above BOSSApp)
- Custom DatePicker (3 selects — handles Android WebView + leap years)
- Auto-receipt WhatsApp prompt after order creation with deposit
- TrustScoreSheet factor breakdown panel
- DVA naming convention: `first_name: "BOSS"`, `last_name: cleanedShopName`
- `paystack_dva_id` saved in creation response (enables deactivation)

---

## The 8 Tier 1 Blocking Items

1. `db.setCustomers()` N+1 write loop — replace with bulk upsert (20 min)
2. BOS Score repeat rate formula inverted — fix in helpers.js + webhook (20 min)
3. `creditWallet()` fallback bypasses atomic RPC — remove fallback (10 min)
4. No Privacy Policy / Terms of Service (external — Nigerian fintech lawyer)
5. No UI for unmatched DVA payments in WalletTab (1 day)
6. No sync/connection status indicator (1 day)
7. Auth emails not sending — wrong Supabase client key (45 min)
8. Double-save creates duplicates — no `isSaving` guard (30 min)

---

## Revenue Model

- **Phase 1:** ₦75 flat service fee per fully completed order (deducted ONLY when `amount_paid >= total_order_amount`)
- **Phase 2:** Withdrawal fees, transfer infrastructure fees
- **Phase 3:** BOS Trust Score credit products, working capital, micro-loans

**Fee framing (always):** "BOSS earns ₦75 only when you get fully paid. We only win when you win."

The service fee is NEVER shown at the moment of payment collection.

---

## Primary Users (Persona)

Lagos tailor, 25–45 years old, Android phone (Samsung Galaxy A series),
Nigerian 3G/4G network, may be semi-literate, uses WhatsApp daily,
has 20–80 customers, takes payments in cash and bank transfers.
Currently has zero formal business records.
