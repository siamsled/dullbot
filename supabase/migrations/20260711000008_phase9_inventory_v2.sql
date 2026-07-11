-- Phase 9: Inventory Management System v2
-- Extends products table and adds stock_movements, product_variants, suppliers

-- ─── Extend products ───────────────────────────────────────────────────────────
alter table products
  add column if not exists sku text,
  add column if not exists compare_at_price numeric,
  add column if not exists images text[],
  add column if not exists low_stock_threshold integer default 5,
  add column if not exists tags text[],
  add column if not exists cost_price numeric,
  add column if not exists default_supplier_id uuid;
  -- updated_at already exists in initial schema

-- ─── Extend shops ──────────────────────────────────────────────────────────────
alter table shops
  add column if not exists reorder_window_days integer default 7;

-- ─── Suppliers ─────────────────────────────────────────────────────────────────
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  contact_phone text,
  contact_note text,
  created_at timestamptz default now()
);

-- FK from products to suppliers (must be after suppliers table)
alter table products drop constraint if exists fk_default_supplier;
alter table products
  add constraint fk_default_supplier
    foreign key (default_supplier_id) references suppliers(id);

-- ─── Product Variants ──────────────────────────────────────────────────────────
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  sku text,
  price_override numeric,
  stock integer not null default 0,
  created_at timestamptz default now()
);

-- ─── Stock Movements ───────────────────────────────────────────────────────────
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid,
  shop_id uuid not null references shops(id) on delete cascade,
  change_type text not null check (change_type in ('order', 'manual_adjust', 'restock', 'import', 'initial_stock')),
  quantity_delta integer not null,
  resulting_stock integer not null,
  supplier_id uuid,
  cost_per_unit numeric,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- FK from stock_movements to product_variants
alter table stock_movements drop constraint if exists fk_variant;
alter table stock_movements
  add constraint fk_variant
    foreign key (variant_id) references product_variants(id) on delete set null;

-- FK from stock_movements to suppliers
alter table stock_movements drop constraint if exists fk_supplier;
alter table stock_movements
  add constraint fk_supplier
    foreign key (supplier_id) references suppliers(id);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_stock_movements_product on stock_movements(product_id, created_at desc);
create index if not exists idx_stock_movements_shop on stock_movements(shop_id, created_at desc);
create index if not exists idx_stock_movements_type on stock_movements(shop_id, change_type, created_at desc);
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_product_variants_shop on product_variants(shop_id);
create index if not exists idx_suppliers_shop on suppliers(shop_id);
create index if not exists idx_products_sku on products(shop_id, sku) where sku is not null;
create index if not exists idx_products_updated_at on products(shop_id, updated_at desc);

-- ─── RLS ───────────────────────────────────────────────────────────────────────
alter table suppliers enable row level security;
alter table product_variants enable row level security;
alter table stock_movements enable row level security;

-- Suppliers: scope to owning shop
create policy "Owner can manage own suppliers"
  on suppliers for all
  using (user_owns_shop(shop_id));

-- Product Variants: scope to owning shop
create policy "Owner can manage own product_variants"
  on product_variants for all
  using (user_owns_shop(shop_id));

-- Stock Movements: scope to owning shop
create policy "Owner can manage own stock_movements"
  on stock_movements for all
  using (user_owns_shop(shop_id));

-- REMINDER: Create 'product-images' Storage bucket in the Supabase dashboard
-- (Storage → New bucket → Name: product-images → Public: yes)
