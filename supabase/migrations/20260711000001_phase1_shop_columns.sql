-- Phase 1 supplement: add ai_instructions column to shops
alter table shops
  add column if not exists ai_instructions text;

-- Add unique constraint on response_cache for upsert to work
alter table response_cache
  drop constraint if exists response_cache_shop_key_unique;
alter table response_cache
  add constraint response_cache_shop_key_unique unique (shop_id, cache_key);
