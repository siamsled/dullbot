-- Phase 1: Token Economy & Credit Metering
-- Run against existing DullBot schema (shops-based, not workspaces)

-- ─────────────────────────────────────────────────────────────────
-- 1. Extend shops table with credit tracking columns
-- ─────────────────────────────────────────────────────────────────
alter table shops
  add column if not exists credit_balance numeric not null default 0,
  add column if not exists low_balance_notified_at timestamptz;

-- ─────────────────────────────────────────────────────────────────
-- 2. Per-request usage log — every real Gemini call gets one row
-- ─────────────────────────────────────────────────────────────────
create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  raw_cost numeric not null default 0,
  billed_credits numeric not null default 0,
  cache_hit boolean not null default false,
  prefilter_hit boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_logs_shop_created on usage_logs (shop_id, created_at);

-- ─────────────────────────────────────────────────────────────────
-- 3. Credit top-up records
-- ─────────────────────────────────────────────────────────────────
create table if not exists credit_topups (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  amount_taka numeric not null,
  credits_granted numeric not null,
  payment_method text not null check (payment_method in ('bkash', 'nagad', 'manual')),
  transaction_ref text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_topups_shop on credit_topups (shop_id, created_at);

-- ─────────────────────────────────────────────────────────────────
-- 4. Pricing config — markup tunable without redeploy
-- ─────────────────────────────────────────────────────────────────
create table if not exists pricing_config (
  id uuid primary key default gen_random_uuid(),
  markup_multiplier numeric not null default 4.0,
  credits_per_taka numeric not null default 1.0,
  low_balance_warn_pct numeric not null default 0.20,
  low_balance_critical_pct numeric not null default 0.05,
  updated_at timestamptz not null default now()
);

-- Insert default config row (idempotent)
insert into pricing_config (markup_multiplier, credits_per_taka, low_balance_warn_pct, low_balance_critical_pct)
select 4.0, 1.0, 0.20, 0.05
where not exists (select 1 from pricing_config);

-- ─────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────────
alter table usage_logs enable row level security;
alter table credit_topups enable row level security;
alter table pricing_config enable row level security;

-- usage_logs: shops can only read their own rows
create policy "Owner can read own usage_logs"
  on usage_logs for select
  using (user_owns_shop(shop_id));

-- credit_topups: shops can only read their own rows
create policy "Owner can read own credit_topups"
  on credit_topups for select
  using (user_owns_shop(shop_id));

-- pricing_config: all authenticated users can read
create policy "Any authenticated user can read pricing_config"
  on pricing_config for select
  to authenticated
  using (true);
