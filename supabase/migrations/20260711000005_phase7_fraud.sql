-- Phase 7: Fraud Flagging Table
create table if not exists fraud_flags (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  hashed_customer_id text not null, -- hashed phone number
  reason text not null,
  created_at timestamptz not null default now(),
  unique(shop_id, hashed_customer_id)
);
alter table fraud_flags enable row level security;
create policy "Owner can manage own fraud_flags"
  on fraud_flags for all
  using (user_owns_shop(shop_id));
