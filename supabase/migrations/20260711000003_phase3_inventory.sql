-- Phase 3: Business Context Ingestion — extend products table
alter table products
  add column if not exists category text,
  add column if not exists source text not null default 'manual' check (source in ('manual', 'scraped')),
  add column if not exists draft boolean not null default false,
  add column if not exists scraped_url text;

-- Add website_url to shops
alter table shops
  add column if not exists website_url text;

-- Index for draft product queries
create index if not exists idx_products_draft on products (shop_id, draft);
