import { supabaseAdmin } from '@/lib/supabase-admin';
import InventoryClient from './InventoryClient';

const SHOP_SLUG = 'dull-store';

export default async function InventoryPage() {
  // ── Resolve shop ──────────────────────────────────────────────────────────
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, website_url')
    .eq('slug', SHOP_SLUG)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  // ── Products (all: draft + live) ──────────────────────────────────────────
  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, description, price, compare_at_price, cost_price,
      currency, stock_quantity, sku, category, tags,
      low_stock_threshold, default_supplier_id, is_active, draft,
      source, updated_at,
      product_images(id, variant_id, url, position)
    `)
    .eq('shop_id', shop.id)
    .order('updated_at', { ascending: false });

  // ── Variants ──────────────────────────────────────────────────────────────
  const { data: allVariants } = await supabaseAdmin
    .from('product_variants')
    .select('id, product_id, name, sku, price_override, stock')
    .eq('shop_id', shop.id);

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const { data: suppliers } = await supabaseAdmin
    .from('suppliers')
    .select('id, name, contact_phone, contact_note, created_at')
    .eq('shop_id', shop.id)
    .order('name');

  // ── Stock Movements (last 500 for activity log) ───────────────────────────
  const { data: movements } = await supabaseAdmin
    .from('stock_movements')
    .select(`
      id, change_type, quantity_delta, resulting_stock,
      note, created_at, variant_id, supplier_id, cost_per_unit, product_id,
      suppliers(name),
      products(name)
    `)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(500);

  // ── Reorder candidates (30-day velocity, 'order' movements only) ──────────
  const { data: shopSettings } = await supabaseAdmin
    .from('shops')
    .select('reorder_window_days')
    .eq('id', shop.id)
    .single();
  const windowDays = shopSettings?.reorder_window_days ?? 7;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orderMovements } = await supabaseAdmin
    .from('stock_movements')
    .select('product_id, quantity_delta')
    .eq('shop_id', shop.id)
    .eq('change_type', 'order')
    .gte('created_at', thirtyDaysAgo);

  const velocity = new Map<string, number>();
  for (const m of orderMovements ?? []) {
    velocity.set(m.product_id, (velocity.get(m.product_id) ?? 0) + Math.abs(m.quantity_delta));
  }

  const reorderCandidates = (allProducts ?? [])
    .filter(p => !p.draft && p.is_active)
    .reduce<{
      id: string; name: string; stock: number; images: string[];
      dailyVelocity: number; daysUntilEmpty: number | null; suggestedReorderQty: number;
    }[]>((acc, p) => {
      const sold30d = velocity.get(p.id) ?? 0;
      const dailyVelocity = sold30d / 30;
      const stock = p.stock_quantity ?? 0;
      const daysUntilEmpty = dailyVelocity > 0 ? stock / dailyVelocity : Infinity;

      if (daysUntilEmpty <= windowDays || stock === 0) {
        acc.push({
          id: p.id,
          name: p.name,
          stock,
          images: (p.product_images ?? []).filter(i => !i.variant_id).map(i => i.url),
          dailyVelocity: Math.round(dailyVelocity * 10) / 10,
          daysUntilEmpty: isFinite(daysUntilEmpty) ? Math.round(daysUntilEmpty) : null,
          suggestedReorderQty: Math.max(0, Math.ceil(sold30d - stock)),
        });
      }
      return acc;
    }, [])
    .sort((a, b) => (a.daysUntilEmpty ?? 999) - (b.daysUntilEmpty ?? 999));

  // ── Low/out-of-stock products ─────────────────────────────────────────────
  const lowStockProducts = (allProducts ?? [])
    .filter(p => !p.draft && p.stock_quantity <= (p.low_stock_threshold ?? 5))
    .map(p => ({
      id: p.id,
      name: p.name,
      stock_quantity: p.stock_quantity ?? 0,
      low_stock_threshold: p.low_stock_threshold ?? 5,
      price: p.price,
    }));

  // ── Inventory stats ───────────────────────────────────────────────────────
  const liveProducts = (allProducts ?? []).filter(p => !p.draft);
  let totalRetailValue = 0;
  let totalCostValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of liveProducts) {
    const qty = p.stock_quantity ?? 0;
    totalRetailValue += qty * (p.price ?? 0);
    totalCostValue += qty * (p.cost_price ?? 0);
    if (qty === 0) outOfStockCount++;
    else if (qty <= (p.low_stock_threshold ?? 5)) lowStockCount++;
  }

  const inventoryStats = {
    totalRetailValue,
    totalCostValue,
    lowStockCount,
    outOfStockCount,
    totalProducts: liveProducts.length,
  };

  // ── Existing categories for autocomplete ─────────────────────────────────
  const existingCategories = [...new Set(
    (allProducts ?? []).map(p => p.category).filter(Boolean) as string[]
  )].sort();

  return (
    <InventoryClient
      shopId={shop.id}
      products={allProducts ?? []}
      variants={allVariants ?? []}
      suppliers={suppliers ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      movements={(movements ?? []) as any}
      reorderCandidates={reorderCandidates}
      lowStockProducts={lowStockProducts}
      inventoryStats={inventoryStats}
      existingCategories={existingCategories}
      websiteUrl={shop.website_url ?? ''}
    />
  );
}
