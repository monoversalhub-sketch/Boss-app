create extension if not exists "uuid-ossp";

create table if not exists tailors (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid references auth.users(id) on delete cascade unique,
  shop                   text not null default '',
  phone                  text,
  city                   text,
  bank_name              text,
  bank_code              text,
  account_number         text,
  account_name           text,
  virtual_account_number text unique,
  virtual_bank_name      text,
  virtual_account_name   text,
  virtual_account_status text default 'inactive'
                         check (virtual_account_status in ('inactive','active','suspended')),
  paystack_customer_code text,
  paystack_dva_id        text,
  wallet_balance         numeric(14,2) default 0 check (wallet_balance >= 0),
  wallet_last_updated_at timestamptz,
  bos_score              integer default 0 check (bos_score >= 0 and bos_score <= 100),
  bos_score_updated_at   timestamptz,
  self_declared_score    integer default 0,
  self_declared_at       timestamptz,
  years_in_business      text,
  phone_verified         boolean default false,
  phone_verified_at      timestamptz,
  crypto_address         text,
  created_at             timestamptz default now()
);


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


create table if not exists orders (
  id                  uuid primary key default uuid_generate_v4(),
  customer_id         uuid references customers(id) on delete cascade not null,
  tailor_id           uuid references tailors(id) on delete cascade not null,
  type                text,
  price               numeric(12,2) default 0,
  deposit             numeric(12,2) default 0,
  paid                numeric(12,2) default 0,
  delivery_date       date,
  installment_history jsonb default '[]',
  image_urls          text[] default '{}',
  order_category      text default 'Other',
  status              text default 'In Progress'
                      check (status in ('In Progress','Ready','Delivered')),
  notes               text,
  paystack_ref        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists orders_tailor_idx   on orders(tailor_id);
create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_delivery_idx on orders(delivery_date);
create index if not exists orders_status_idx   on orders(status);


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


create table if not exists withdrawals (
  id               uuid primary key default uuid_generate_v4(),
  tailor_id        uuid references tailors(id) on delete cascade not null,
  amount           numeric(12,2) not null,
  destination_bank text,
  destination_acct text,
  destination_name text,
  paystack_ref     text,
  status           text default 'pending'
                   check (status in ('pending','processing','completed','failed')),
  requested_at     timestamptz default now(),
  completed_at     timestamptz
);
create index if not exists withdrawals_tailor_idx on withdrawals(tailor_id);


CREATE TABLE IF NOT EXISTS bos_score_history (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tailor_id       uuid NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  score           integer NOT NULL CHECK (score >= 0 AND score <= 100),
  computed_at     timestamptz DEFAULT now() NOT NULL,
  order_count     integer,
  completion_rate numeric(5,2),
  repeat_rate     numeric(5,2),
  payment_rate    numeric(5,2),
  overdue_count   integer
);
CREATE INDEX IF NOT EXISTS bos_score_history_tailor_idx
  ON bos_score_history(tailor_id, computed_at DESC);


-- RLS
alter table tailors          enable row level security;
alter table customers        enable row level security;
alter table orders           enable row level security;
alter table payments         enable row level security;
alter table bos_score_history enable row level security;


drop policy if exists "tailors_self"         on tailors;
drop policy if exists "customers_own_tailor" on customers;
drop policy if exists "orders_own_tailor"    on orders;
drop policy if exists "payments_own_tailor"  on payments;
drop policy if exists "Tailors see own score history"    on bos_score_history;
drop policy if exists "Tailors insert own score history" on bos_score_history;


create policy "tailors_self" on tailors
  for all using (auth.uid() = user_id);


create policy "customers_own_tailor" on customers
  for all using (tailor_id = (select id from tailors where user_id = auth.uid()));


create policy "orders_own_tailor" on orders
  for all using (tailor_id = (select id from tailors where user_id = auth.uid()));


create policy "payments_own_tailor" on payments
  for all using (tailor_id = (select id from tailors where user_id = auth.uid()));


create policy "Tailors see own score history" on bos_score_history
  for select using (tailor_id in (select id from tailors where user_id = auth.uid()));


create policy "Tailors insert own score history" on bos_score_history
  for insert with check (tailor_id in (select id from tailors where user_id = auth.uid()));


-- updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;


drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();


-- Wallet increment RPC
create or replace function increment_wallet_balance(p_tailor_id uuid, p_amount numeric)
returns void language plpgsql security definer as $$
begin
  update tailors
  set wallet_balance = coalesce(wallet_balance,0) + p_amount,
      wallet_last_updated_at = now()
  where id = p_tailor_id;
end;
$$;


-- Auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── ORDER STYLE IMAGES — Storage bucket ──────────────────────────────
-- Run this block AFTER creating the bucket in the Supabase Dashboard:
--   Storage → Create bucket → name: "order-images" → Public bucket ✅
--
-- Or create it via SQL:
--   insert into storage.buckets (id, name, public)
--   values ('order-images', 'order-images', true)
--   on conflict (id) do nothing;
--
-- Policies:
insert into storage.buckets (id, name, public)
values ('order-images', 'order-images', true)
on conflict (id) do nothing;

drop policy if exists "Allow public to view" on storage.objects;
create policy "Allow public to view"
  on storage.objects for select
  using (bucket_id = 'order-images');

drop policy if exists "Allow authenticated inserts" on storage.objects;
create policy "Allow authenticated inserts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'order-images');

drop policy if exists "Allow authenticated updates" on storage.objects;
create policy "Allow authenticated updates"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'order-images');


-- ═══════════════════════════════════════════════════════════════
-- FEEDBACK SYSTEM (Section A)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id    uuid REFERENCES tailors(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('nps', 'micro', 'bug', 'feature')),
  trigger      text,
  score        integer,
  message      text,
  app_version  text,
  screen       text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tailors_own_feedback" ON feedback
  FOR ALL USING (
    tailor_id = (SELECT id FROM tailors WHERE user_id = auth.uid())
  );


-- ═══════════════════════════════════════════════════════════════
-- REFERRAL SYSTEM (Section A)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid REFERENCES tailors(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES tailors(id) ON DELETE SET NULL,
  referral_code   text UNIQUE NOT NULL,
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','signed_up','activated','rewarded')),
  referred_at     timestamptz,
  activated_at    timestamptz,
  rewarded_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_own" ON referrals
  FOR ALL USING (
    referrer_id = (SELECT id FROM tailors WHERE user_id = auth.uid())
  );

-- Add referral columns to tailors
ALTER TABLE tailors
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   uuid REFERENCES tailors(id),
  ADD COLUMN IF NOT EXISTS orders_count  integer DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════
-- UPDATED AUTO-PROFILE TRIGGER — includes referral_code
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.tailors (user_id, shop, referral_code)
  VALUES (
    NEW.id,
    '',
    upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- FEEDBACK SUMMARY VIEW
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW feedback_summary AS
SELECT
  tailor_id,
  type,
  COUNT(*) as count,
  AVG(score) as avg_score,
  MAX(created_at) as last_received
FROM feedback
GROUP BY tailor_id, type;


-- ═══════════════════════════════════════════════════════════════
-- REFERRAL REWARD RPC — boosts referrer's Trust Score by +5
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_referral_reward(
  p_tailor_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE tailors
  SET bos_score = LEAST(100, COALESCE(bos_score, 0) + 5)
  WHERE id = p_tailor_id;

  UPDATE referrals
  SET status = 'rewarded',
      rewarded_at = now()
  WHERE referrer_id = p_tailor_id
    AND status = 'activated';
END;
$$;
