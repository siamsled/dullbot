-- 1. Make product_id in stock_movements nullable and update constraint on delete set null
alter table stock_movements alter column product_id drop not null;
alter table stock_movements drop constraint if exists stock_movements_product_id_fkey;
alter table stock_movements add constraint stock_movements_product_id_fkey
  foreign key (product_id) references products(id) on delete set null;

-- 2. Create context media table
create table if not exists product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_product_media_product_id on product_media(product_id);

-- 3. Create product audit trigger
create or replace function log_product_audit()
returns trigger as $$
declare
  v_shop_id uuid;
  v_note text;
begin
  if (TG_OP = 'INSERT') then
    v_shop_id := NEW.shop_id;
    v_note := 'Product created: "' || NEW.name || '"';
    
    insert into stock_movements (shop_id, product_id, change_type, quantity_delta, resulting_stock, note)
    values (v_shop_id, NEW.id, 'audit', 0, NEW.stock_quantity, v_note);
    
  elsif (TG_OP = 'UPDATE') then
    v_shop_id := NEW.shop_id;
    
    -- Check what changed. We only want to log meaningful edits (name, price, low stock threshold),
    -- and IGNORE pure stock updates (which are already logged via manual_adjust/restock/order actions)
    if (OLD.name <> NEW.name) then
      v_note := 'Product name updated from "' || OLD.name || '" to "' || NEW.name || '"';
      insert into stock_movements (shop_id, product_id, change_type, quantity_delta, resulting_stock, note)
      values (v_shop_id, NEW.id, 'audit', 0, NEW.stock_quantity, v_note);
    end if;

    if (OLD.price <> NEW.price) then
      v_note := 'Product price of "' || NEW.name || '" changed from ' || OLD.price || ' to ' || NEW.price;
      insert into stock_movements (shop_id, product_id, change_type, quantity_delta, resulting_stock, note)
      values (v_shop_id, NEW.id, 'audit', 0, NEW.stock_quantity, v_note);
    end if;

    if (coalesce(OLD.low_stock_threshold, -1) <> coalesce(NEW.low_stock_threshold, -1)) then
      v_note := 'Low stock threshold of "' || NEW.name || '" changed from ' || coalesce(OLD.low_stock_threshold, 5) || ' to ' || coalesce(NEW.low_stock_threshold, 5);
      insert into stock_movements (shop_id, product_id, change_type, quantity_delta, resulting_stock, note)
      values (v_shop_id, NEW.id, 'audit', 0, NEW.stock_quantity, v_note);
    end if;
    
  elsif (TG_OP = 'DELETE') then
    v_shop_id := OLD.shop_id;
    v_note := 'Product deleted: "' || OLD.name || '" (SKU: ' || coalesce(OLD.sku, 'N/A') || ')';
    
    insert into stock_movements (shop_id, product_id, change_type, quantity_delta, resulting_stock, note)
    values (v_shop_id, null, 'audit', 0, 0, v_note);
  end if;
  
  return null;
end;
$$ language plpgsql;

drop trigger if exists trigger_product_audit on products;
create trigger trigger_product_audit
after insert or update or delete on products
for each row execute function log_product_audit();
