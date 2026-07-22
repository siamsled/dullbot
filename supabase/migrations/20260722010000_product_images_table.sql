-- 1. Create product_images table
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);

-- Index for fast lookup by product and variant
create index if not exists idx_product_images_lookup on product_images(product_id, variant_id, position);

-- Enable Row Level Security
alter table product_images enable row level security;

-- Policy: Shop owners can manage product images for their products
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'product_images' and policyname = 'Shop owners can manage product images'
  ) then
    create policy "Shop owners can manage product images" on product_images
      for all using (
        exists (
          select 1 from products
          join shops on shops.id = products.shop_id
          where products.id = product_images.product_id
          and shops.owner_id = auth.uid()
        )
      );
  end if;
end;
$$;

-- 2. Migrate existing products.images array values into product_images table (keep products.images column intact for safe cutover)
do $$
declare
  r record;
  img_url text;
  idx integer;
begin
  for r in select id, images from products where images is not null and array_length(images, 1) > 0 loop
    idx := 0;
    foreach img_url in array r.images loop
      if not exists (select 1 from product_images where product_id = r.id and url = img_url and variant_id is null) then
        insert into product_images (product_id, variant_id, url, position)
        values (r.id, null, img_url, idx);
      end if;
      idx := idx + 1;
    end loop;
  end loop;
end;
$$;
