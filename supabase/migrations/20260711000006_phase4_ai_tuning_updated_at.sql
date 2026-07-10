-- Phase 4: Add tuning_updated_at for context poisoning prevention
alter table shops
  add column if not exists tuning_updated_at timestamptz not null default now();
