-- ─────────────────────────────────────────────────────────────────
--  BOSS — Supabase Database Schema (Complete v2)
--  Run this ONCE in your Supabase SQL editor:
--  supabase.com → your project → SQL Editor → New query → Run
--
--  If upgrading from v1: the ALTER TABLE blocks at the bottom
--  safely add new columns without breaking existing data.
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── TAILORS (one row per business / user) ─────────────────────────
create table if not exists tailors (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid references auth.users(id) on delete cascade unique,
  shop                      text not null,
  phone                     text,
  city                      text,

  -- Bank / payout details (used to create virtual account)
  bank_name                 text,          -- e.g. "Guaranty Trust Bank"
  bank_code                 text,          -- Paystack bank code e.g. "058"
  account_number            text,          -- 10-digit NUBAN account number
  account_name              text,          -- Verified account name from Paystack

  -- Virtual Account (Paystack Dedicated Virtual Accounts — NOT subaccounts)
  virtual_account_number    text,          -- Dedicated virtual account number
  virtual_bank_name         text,          -- e.g. "Wema Bank"
  virtual_account_name      text,          -- Account name on the virtual account
  virtual_account_status    text default 'inactive' check (virtual_account_status in ('inactive','active','manual')),
  paystack_customer_code    text,          -- Paystack customer code for the virtual account

  -- BOSS Trust Score (cached, recomputed on each webhook / sync)
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
  type          text,                       -- cloth type e.g. "Senator", "Gown"
  price         numeric(12,2) default 0,   -- total agreed price
  deposit       numeric(12,2) default 0,   -- initial deposit paid
  paid          numeric(12,2) default 0,   -- additional payments received
  delivery_date date,
  status        text default 'In Progress' check (status in ('In Progress','Ready','Delivered')),
  notes         text,
  paystack_ref  text,                       -- Paystack reference for online payments
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists orders_tailor_idx    on orders(tailor_id);
create index if not exists orders_customer_idx  on orders(customer_id);
create index if not exists orders_delivery_idx  on orders(delivery_date);
create index if not exists orders_status_idx    on orders(status);

-- ── PAYMENTS (full audit trail) ───────────────────────────────────
create table if not exists payments (
  id                     uuid primary key default uuid_generate_v4(),
  order_id               uuid references orders(id) on delete cascade,  -- nullable: some transfers may not match an order immediately
  tailor_id              uuid references tailors(id) on delete cascade not null,
  amount                 numeric(12,2) not null,
  method                 text default 'cash' check (method in ('cash','paystack','transfer','virtual_account','other')),
  paystack_ref           text,             -- Paystack charge reference
  virtual_account_number text,             -- Which virtual account received this transfer
  transfer_code          text,             -- Paystack transfer code (for virtual account payments)
  sender_name            text,             -- Customer name from bank transfer metadata
  recorded_at            timestamptz default now()
);
create index if not exists payments_order_idx    on payments(order_id);
create index if not exists payments_tailor_idx   on payments(tailor_id);
create index if not exists payments_recorded_idx on payments(recorded_at);

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────
alter table tailors   enable row level security;
alter table customers enable row level security;
alter table orders    enable row level security;
alter table payments  enable row level security;

-- Drop old policies if they exist (safe to re-run)
drop policy if exists "tailors_self"          on tailors;
drop policy if exists "customers_own_tailor"  on customers;
drop policy if exists "orders_own_tailor"     on orders;
drop policy if exists "payments_own_tailor"   on payments;

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

-- ── UPGRADE SCRIPT — Run if you have an existing v1 database ──────
-- These ALTER statements are safe to run on an existing database.
-- They add new columns without dropping anything.

alter table tailors add column if not exists virtual_account_number   text;
alter table tailors add column if not exists virtual_bank_name        text;
alter table tailors add column if not exists virtual_account_name     text;
alter table tailors add column if not exists virtual_account_status   text default 'inactive';
alter table tailors add column if not exists paystack_customer_code   text;
alter table tailors add column if not exists bos_score                integer default 0;
alter table tailors add column if not exists bos_score_updated_at     timestamptz;

alter table customers add column if not exists gender text default 'female';

alter table payments add column if not exists virtual_account_number text;
alter table payments add column if not exists transfer_code          text;
alter table payments add column if not exists sender_name           text;

-- Add 'virtual_account' to payments method check constraint (safe add)
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('cash','paystack','transfer','virtual_account','other'));

-- ── HELPFUL VIEWS ─────────────────────────────────────────────────

-- Outstanding balances per tailor (useful for dashboard queries)
create or replace view tailor_outstanding as
select
  o.tailor_id,
  count(*) filter (where o.status != 'Delivered')                            as active_orders,
  sum(o.price - o.deposit - o.paid) filter (where o.status != 'Delivered')  as outstanding_balance,
  count(*) filter (where o.delivery_date < current_date and o.status != 'Delivered') as overdue_count
from orders o
group by o.tailor_id;


-- ── FIX: Recreate tailor_outstanding with SECURITY INVOKER ────────
-- This fixes the Supabase "Security Definer View" warning.
-- Run this in Supabase SQL Editor if you see a CRITICAL warning.
drop view if exists tailor_outstanding;

create or replace view tailor_outstanding
  with (security_invoker = true)
as
select
  o.tailor_id,
  count(*) filter (where o.status != 'Delivered')                            as active_orders,
  sum(o.price - o.deposit - o.paid) filter (where o.status != 'Delivered')  as outstanding_balance,
  count(*) filter (where o.delivery_date < current_date and o.status != 'Delivered') as overdue_count
from orders o
group by o.tailor_id;
