-- ─────────────────────────────────────────────────────────────────
--  BOSS — Supabase Database Schema v5
--  Run this ONCE in Supabase SQL Editor:
--  supabase.com → your project → SQL Editor → New query → Run
--
--  If upgrading from v4: the ALTER TABLE blocks at the bottom
--  safely add new columns without breaking existing data.
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── TAILORS ───────────────────────────────────────────────────────
-- One row per business / user.
-- Funds flow: customer pays → webhook credits wallet_balance
-- Tailor withdraws manually via Settings → Wallet → Withdraw
create table if not exists tailors (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid references auth.users(id) on delete cascade unique,
  shop                      text not null,
  phone                     text,
  city                      text,

  -- Tailor's real bank (used for manual withdrawal requests — Phase 2)
  bank_name                 text,
  bank_code                 text,
  account_number            text,
  account_name              text,

  -- Paystack Dedicated Virtual Account
  -- Customers send bank transfers to this account number.
  -- Money lands in BOSS Paystack balance, credited to wallet_balance.
  -- BOSS does NOT auto-route to the real bank.
  virtual_account_number    text unique,
  virtual_bank_name         text,
  virtual_account_name      text,
  virtual_account_status    text default 'inactive'
                            check (virtual_account_status in ('inactive','active','suspended')),
  paystack_customer_code    text,          -- Paystack customer code for this VA
  paystack_dva_id           text,          -- Paystack internal DVA id (required for deactivation)

  -- BOSS Wallet balance (earmarked funds in Paystack)
  -- Incremented by webhook on every inbound payment
  -- Decremented on manual withdrawal (Phase 2)
  wallet_balance            numeric(14,2) default 0 check (wallet_balance >= 0),
  wallet_last_updated_at    timestamptz,

  -- BOSS Trust Score (0–100, recomputed on each webhook event)
  bos_score                 integer default 0 check (bos_score >= 0 and bos_score <= 100),
  bos_score_updated_at      timestamptz,

  created_at                timestamptz default now()
);

-- ── CUSTOMERS ─────────────────────────────────────────────────────
create table if not exists customers (
  id            uuid primary key default uuid_generate_v4(),
  tailor_id     uuid references tailors(id) on delete cascade not null,
  name          text not null,
  phone         text,
  gender        text default 'female' check (gender in ('male','female')),
  measurements  jsonb default '{}',
  notes         text,
  created_at    timestamptz default now()
);
create index if not exists customers_tailor_idx on customers(tailor_id);

-- ── ORDERS ────────────────────────────────────────────────────────
create table if not exists orders (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid references customers(id) on delete cascade not null,
  tailor_id     uuid references tailors(id) on delete cascade not null,
  type          text,
  price         numeric(12,2) default 0,   -- total agreed price
  deposit       numeric(12,2) default 0,   -- initial deposit paid at creation
  paid          numeric(12,2) default 0,   -- additional installments received
  delivery_date       date,
  installment_history jsonb default '[]',
  status        text default 'In Progress'
                check (status in ('In Progress','Ready','Delivered')),
  notes         text,
  paystack_ref  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists orders_tailor_idx    on orders(tailor_id);
create index if not exists orders_customer_idx  on orders(customer_id);
create index if not exists orders_delivery_idx  on orders(delivery_date);
create index if not exists orders_status_idx    on orders(status);

-- ── PAYMENTS — full audit trail ───────────────────────────────────
create table if not exists payments (
  id                     uuid primary key default uuid_generate_v4(),
  order_id               uuid references orders(id) on delete set null,
  tailor_id              uuid references tailors(id) on delete cascade not null,
  amount                 numeric(12,2) not null,
  method                 text default 'cash'
                         check (method in ('cash','paystack','virtual_account','withdrawal','other')),
  paystack_ref           text,
  virtual_account_number text,
  transfer_code          text,
  sender_name            text,
  notes                  text,
  recorded_at            timestamptz default now()
);
create index if not exists payments_order_idx    on payments(order_id);
create index if not exists payments_tailor_idx   on payments(tailor_id);
create index if not exists payments_recorded_idx on payments(recorded_at);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────
alter table tailors   enable row level security;
alter table customers enable row level security;
alter table orders    enable row level security;
alter table payments  enable row level security;

drop policy if exists "tailors_self"         on tailors;
drop policy if exists "customers_own_tailor" on customers;
drop policy if exists "orders_own_tailor"    on orders;
drop policy if exists "payments_own_tailor"  on payments;

create policy "tailors_self" on tailors
  for all using (auth.uid() = user_id);

create policy "customers_own_tailor" on customers
  for all using (
    tailor_id = (select id from tailors where user_id = auth.uid())
  );

create policy "orders_own_tailor" on orders
  for all using (
    tailor_id = (select id from tailors where user_id = auth.uid())
  );

create policy "payments_own_tailor" on payments
  for all using (
    tailor_id = (select id from tailors where user_id = auth.uid())
  );

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ── ATOMIC WALLET INCREMENT (used by webhook) ─────────────────────
-- This RPC prevents race conditions when multiple payments arrive
-- at the same time for the same tailor.
create or replace function increment_wallet_balance(
  p_tailor_id uuid,
  p_amount    numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update tailors
  set
    wallet_balance         = coalesce(wallet_balance, 0) + p_amount,
    wallet_last_updated_at = now()
  where id = p_tailor_id;
end;
$$;

-- ── WITHDRAWAL LOG (Phase 2) ──────────────────────────────────────
-- Tracks tailor-initiated withdrawals from their BOSS wallet
-- to their real bank account. Not implemented in Phase 1 UI but
-- the table is ready so the schema doesn't need to change later.
create table if not exists withdrawals (
  id                uuid primary key default uuid_generate_v4(),
  tailor_id         uuid references tailors(id) on delete cascade not null,
  amount            numeric(12,2) not null,
  destination_bank  text,
  destination_acct  text,
  destination_name  text,
  paystack_ref      text,
  status            text default 'pending'
                    check (status in ('pending','processing','completed','failed')),
  requested_at      timestamptz default now(),
  completed_at      timestamptz
);
create index if not exists withdrawals_tailor_idx on withdrawals(tailor_id);

-- ── USEFUL VIEWS ─────────────────────────────────────────────────

-- Per-tailor outstanding balance summary (for dashboard)
create or replace view tailor_outstanding as
select
  o.tailor_id,
  count(*)               filter (where o.status != 'Delivered')                             as active_orders,
  sum(o.price - o.deposit - o.paid)
                         filter (where o.status != 'Delivered' and o.price > o.deposit + o.paid)
                                                                                             as outstanding_balance,
  count(*)               filter (where o.delivery_date < current_date and o.status != 'Delivered') as overdue_count
from orders o
group by o.tailor_id;

-- ── UPGRADE SCRIPT (safe to run on existing v4 databases) ─────────
-- These ALTER statements add new columns without dropping anything.

alter table tailors add column if not exists wallet_balance         numeric(14,2) default 0;
alter table tailors add column if not exists wallet_last_updated_at timestamptz;
alter table tailors add column if not exists paystack_customer_code text;
alter table tailors add column if not exists virtual_account_number text;
alter table tailors add column if not exists virtual_bank_name      text;
alter table tailors add column if not exists virtual_account_name   text;
alter table tailors add column if not exists virtual_account_status text default 'inactive';
alter table tailors add column if not exists paystack_dva_id text;  -- v7: needed for DVA deactivation

alter table customers add column if not exists gender text default 'female';

-- Installment history stored as JSONB on orders (array of {id,amount,date,method})
alter table orders  add column if not exists installment_history      jsonb default '[]';
alter table payments add column if not exists virtual_account_number text;
alter table payments add column if not exists transfer_code          text;
alter table payments add column if not exists sender_name            text;
alter table payments add column if not exists notes                  text;

-- Remove old subaccount_code column if it exists (was in v4 but removed in v5)
-- CAUTION: only run after confirming no code references subaccount_code
-- alter table tailors drop column if exists subaccount_code;

-- Re-create payments method constraint to add 'withdrawal', remove 'transfer'
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('cash','paystack','virtual_account','withdrawal','other'));

-- ── BOSS v11 ADDITIONS ─────────────────────────────────────────────

-- MISSING-04: BOS Score history table — audit trail for credit product
-- Required for: lender score trend queries, tailor score dispute resolution
CREATE TABLE IF NOT EXISTS bos_score_history (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tailor_id        uuid NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  score            integer NOT NULL CHECK (score >= 0 AND score <= 100),
  computed_at      timestamptz DEFAULT now() NOT NULL,
  order_count      integer,
  completion_rate  numeric(5,2),
  repeat_rate      numeric(5,2),
  payment_rate     numeric(5,2),
  overdue_count    integer
);
CREATE INDEX IF NOT EXISTS bos_score_history_tailor_idx
  ON bos_score_history(tailor_id, computed_at DESC);

-- Enable RLS on bos_score_history
ALTER TABLE bos_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Tailors see own score history"
  ON bos_score_history FOR SELECT
  USING (tailor_id IN (
    SELECT id FROM tailors WHERE user_id = auth.uid()
  ));

-- MISSING-06: Self-declaration score for new tailors (cold-start bias fix)
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS self_declared_score   integer DEFAULT 0;
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS self_declared_at      timestamptz;
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS years_in_business     text;     -- "1-3 years" etc.

-- MISSING-07: KYC tracking for DVA activation gate
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS phone_verified        boolean DEFAULT false;
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS phone_verified_at     timestamptz;

-- MISSING-14: Order category for ML readiness
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_category text DEFAULT 'Other';
-- Valid values: Traditional, Formal (Men), Formal (Women), Casual, Children, Bridal, Accessories, Other

-- ── AUTO-PROFILE TRIGGER (run this block separately in SQL Editor) ──
-- Run this AFTER the schema above to enable auto-creating tailors rows
-- on new signups. Safe to run multiple times (CREATE OR REPLACE + DROP
-- TRIGGER IF EXISTS pattern).
-- ─────────────────────────────────────────────────────────────────────
-- Automatically creates a tailors row when a new user signs up via
-- Google OAuth (or any auth provider). This ensures RLS policies that
-- reference tailors.user_id work immediately, and the app never shows
-- "setup" with a null tailor from the DB.
--
-- The trigger runs AFTER insert on auth.users (Supabase-managed table).
-- The new tailors row has only user_id set — the user fills in shop,
-- phone, city etc. during SetupScreen.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.tailors (user_id, shop)
  VALUES (NEW.id, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
