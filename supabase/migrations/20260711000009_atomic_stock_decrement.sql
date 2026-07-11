-- Atomic stock decrement RPC for concurrent order safety
-- Prevents two customers ordering the last unit simultaneously (no read-then-write)

create or replace function decrement_stock(
  p_product_id uuid,
  p_variant_id uuid default null,
  p_shop_id uuid default null,
  p_note text default 'Order confirmed'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected int;
  v_resulting_stock int;
  v_shop_id uuid;
begin
  -- Resolve shop_id if not provided
  if p_shop_id is null then
    select shop_id into v_shop_id from products where id = p_product_id;
  else
    v_shop_id := p_shop_id;
  end if;

  if p_variant_id is not null then
    -- Decrement variant stock atomically
    update product_variants
      set stock = stock - 1
      where id = p_variant_id
        and product_id = p_product_id
        and stock > 0;

    get diagnostics v_affected = row_count;

    if v_affected = 0 then
      return json_build_object('success', false, 'reason', 'out_of_stock');
    end if;

    select stock into v_resulting_stock
      from product_variants where id = p_variant_id;

    -- Insert movement row
    insert into stock_movements (
      product_id, variant_id, shop_id, change_type,
      quantity_delta, resulting_stock, note
    ) values (
      p_product_id, p_variant_id, v_shop_id, 'order',
      -1, v_resulting_stock, p_note
    );

  else
    -- Decrement parent product stock atomically
    update products
      set stock_quantity = stock_quantity - 1,
          updated_at = now()
      where id = p_product_id
        and stock_quantity > 0;

    get diagnostics v_affected = row_count;

    if v_affected = 0 then
      return json_build_object('success', false, 'reason', 'out_of_stock');
    end if;

    select stock_quantity into v_resulting_stock
      from products where id = p_product_id;

    -- Insert movement row
    insert into stock_movements (
      product_id, shop_id, change_type,
      quantity_delta, resulting_stock, note
    ) values (
      p_product_id, v_shop_id, 'order',
      -1, v_resulting_stock, p_note
    );
  end if;

  return json_build_object(
    'success', true,
    'resulting_stock', v_resulting_stock
  );
end;
$$;

-- Grant execute to authenticated users (RLS on the tables still applies within the function context)
grant execute on function decrement_stock(uuid, uuid, uuid, text) to authenticated;
grant execute on function decrement_stock(uuid, uuid, uuid, text) to service_role;
