'use server';
import { getCurrentShop, supabaseAdmin, assertShopPermission } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function getShopId(): Promise<string> {
  const shop = await assertShopPermission('inventory');
  return shop.id;
}

function revalidate() {
  revalidatePath('/dashboard/inventory');
}

// ─── Draft / Scraping Workflow (preserved from Phase 3) ─────────────────────────

export async function approveProduct(productId: string) {
  const shopId = await getShopId();

  // Fetch product to get current stock for the movement row
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('shop_id, stock_quantity')
    .eq('id', productId)
    .eq('shop_id', shopId)
    .single();

  if (!product) throw new Error('Product not found or unauthorized');

  await supabaseAdmin
    .from('products')
    .update({ draft: false, is_active: true, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('shop_id', shopId);

  // Write import movement if there's stock
  if (product && (product.stock_quantity ?? 0) > 0) {
    await supabaseAdmin.from('stock_movements').insert({
      product_id: productId,
      shop_id: product.shop_id,
      change_type: 'import',
      quantity_delta: product.stock_quantity,
      resulting_stock: product.stock_quantity,
      note: 'Approved from website import',
    });
  }

  revalidate();
}

export async function rejectProduct(productId: string) {
  const shopId = await getShopId();
  await supabaseAdmin.from('products').delete().eq('id', productId).eq('shop_id', shopId);
  revalidate();
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const shopId = await getShopId();
  await supabaseAdmin
    .from('products')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('shop_id', shopId);
  revalidate();
}

// ─── Product CRUD ────────────────────────────────────────────────────────────────

export type ProductInput = {
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  currency?: string;
  stock_quantity: number;
  sku?: string | null;
  category?: string | null;
  tags?: string[] | null;
  images?: string[] | null;
  low_stock_threshold?: number;
  default_supplier_id?: string | null;
  is_active?: boolean;
  draft?: boolean;
  source?: 'manual' | 'scraped';
};

export async function saveProductImages(
  productId: string,
  images: { url: string; variant_id?: string | null; position: number }[]
) {
  await supabaseAdmin.from('product_images').delete().eq('product_id', productId);
  if (!images.length) return;
  const rows = images.map((img, idx) => ({
    product_id: productId,
    variant_id: img.variant_id ?? null,
    url: img.url,
    position: img.position ?? idx,
  }));
  await supabaseAdmin.from('product_images').insert(rows);
}

export async function addProduct(data: ProductInput & { product_images_data?: { url: string; variant_id?: string | null; position: number }[] }) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };

  const { product_images_data, ...productFields } = data;
  const cleanImages = (data.images ?? []).filter(u => u && !u.startsWith('blob:'));

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      ...productFields,
      images: cleanImages.length ? cleanImages : null,
      shop_id: shopId,
      source: data.source ?? 'manual',
      draft: data.draft ?? false,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select('id, stock_quantity')
    .single();

  if (error || !product) return { error: error?.message ?? 'Insert failed' };

  // Save product_images table rows
  if (product_images_data && product_images_data.length > 0) {
    await saveProductImages(product.id, product_images_data);
  } else if (cleanImages.length > 0) {
    await saveProductImages(product.id, cleanImages.map((url, idx) => ({ url, variant_id: null, position: idx })));
  }

  // Write initial_stock movement if stock > 0
  if ((data.stock_quantity ?? 0) > 0) {
    await supabaseAdmin.from('stock_movements').insert({
      product_id: product.id,
      shop_id: shopId,
      change_type: 'initial_stock',
      quantity_delta: data.stock_quantity,
      resulting_stock: data.stock_quantity,
      note: 'Initial stock on product creation',
    });
  }

  revalidate();
  return { success: true, productId: product.id };
}

export async function updateProduct(
  productId: string, 
  data: Partial<ProductInput> & { product_images_data?: { url: string; variant_id?: string | null; position: number }[] }
) {
  const shopId = await getShopId();
  const { product_images_data, ...productFields } = data;
  const cleanImages = data.images !== undefined
    ? (data.images ?? []).filter(u => u && !u.startsWith('blob:'))
    : undefined;

  // Fetch current product to check if stock changed
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('shop_id, stock_quantity, name')
    .eq('id', productId)
    .single();

  const oldStock = existing?.stock_quantity ?? 0;
  const resolvedShopId = existing?.shop_id ?? shopId;

  await supabaseAdmin
    .from('products')
    .update({
      ...productFields,
      ...(cleanImages !== undefined ? { images: cleanImages.length ? cleanImages : null } : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (product_images_data !== undefined) {
    await saveProductImages(productId, product_images_data);
  } else if (cleanImages !== undefined) {
    await saveProductImages(productId, cleanImages.map((url, idx) => ({ url, variant_id: null, position: idx })));
  }

  // If stock_quantity was updated, log a manual adjustment movement
  if (data.stock_quantity !== undefined && data.stock_quantity !== oldStock) {
    const delta = data.stock_quantity - oldStock;
    await supabaseAdmin.from('stock_movements').insert({
      product_id: productId,
      shop_id: resolvedShopId,
      change_type: delta > 0 ? 'restock' : 'manual_adjust',
      quantity_delta: delta,
      resulting_stock: data.stock_quantity,
      note: `Stock updated in product editor (${oldStock} → ${data.stock_quantity})`,
    });
  }

  revalidate();
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const shopId = await getShopId();
  await supabaseAdmin.from('products').delete().eq('id', productId).eq('shop_id', shopId);
  revalidate();
}

// ─── Bulk Actions (single batched queries — no N+1) ──────────────────────────────

export async function bulkDeleteProducts(ids: string[]) {
  if (!ids.length) return;
  const shopId = await getShopId();
  await supabaseAdmin.from('products').delete().in('id', ids).eq('shop_id', shopId);
  revalidate();
}

export async function bulkToggleVisibility(ids: string[], makeActive: boolean) {
  if (!ids.length) return { success: true };
  const shopId = await getShopId();
  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: makeActive, updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('shop_id', shopId);

  if (error) {
    console.error('Failed to bulk toggle product visibility:', error);
    return { success: false, error: error.message };
  }
  revalidate();
  return { success: true };
}

export async function bulkReassignCategory(ids: string[], category: string) {
  if (!ids.length) return;
  await supabaseAdmin
    .from('products')
    .update({ category, updated_at: new Date().toISOString() })
    .in('id', ids);
  revalidate();
}

// ─── Product Variants ────────────────────────────────────────────────────────────

export type VariantInput = {
  name: string;
  sku?: string | null;
  price_override?: number | null;
  stock: number;
  image_url?: string | null;
};

export async function getProductVariants(productId: string) {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('id, product_id, name, sku, price_override, stock')
    .eq('product_id', productId);
  if (error) {
    console.error('Error fetching product variants:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getShopVariants(shopId?: string | null) {
  const actualShopId = shopId || (await getShopId());
  if (!actualShopId) return [];

  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('id, product_id, name, sku, price_override, stock')
    .eq('shop_id', actualShopId);

  if (error) {
    console.error('Error fetching shop variants:', error.message);
    return [];
  }
  return data ?? [];
}

export async function addVariants(productId: string, variants: VariantInput[]) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };

  const rows = variants.map(v => ({
    product_id: productId,
    shop_id: shopId,
    name: v.name.trim(),
    sku: v.sku?.trim() || null,
    price_override: v.price_override ?? null,
    stock: typeof v.stock === 'number' ? v.stock : 0,
    image_url: v.image_url && !v.image_url.startsWith('blob:') ? v.image_url : null,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('product_variants')
    .insert(rows)
    .select('id, product_id, name, sku, price_override, stock');

  if (error) {
    console.error('Error inserting product_variants:', error);
    return { error: error.message };
  }

  // Write initial_stock movements for variants with stock
  const movements = (inserted ?? [])
    .filter(v => v.stock > 0)
    .map(v => ({
      product_id: productId,
      variant_id: v.id,
      shop_id: shopId,
      change_type: 'initial_stock',
      quantity_delta: v.stock,
      resulting_stock: v.stock,
      note: `Initial stock for variant "${v.name}"`,
    }));

  if (movements.length) {
    const { error: mErr } = await supabaseAdmin.from('stock_movements').insert(movements);
    if (mErr) console.warn('Stock movement log warning:', mErr.message);
  }

  revalidate();
  return { success: true, variants: inserted };
}

export async function updateVariant(variantId: string, data: Partial<VariantInput>) {
  const shopId = await getShopId();
  const { data: existing } = await supabaseAdmin
    .from('product_variants')
    .select('product_id, shop_id, stock, name')
    .eq('id', variantId)
    .single();

  const oldStock = existing?.stock ?? 0;
  const resolvedShopId = existing?.shop_id ?? shopId;
  const productId = existing?.product_id;

  await supabaseAdmin.from('product_variants').update(data).eq('id', variantId);

  if (data.stock !== undefined && data.stock !== oldStock) {
    const delta = data.stock - oldStock;
    await supabaseAdmin.from('stock_movements').insert({
      product_id: productId,
      variant_id: variantId,
      shop_id: resolvedShopId,
      change_type: delta > 0 ? 'restock' : 'manual_adjust',
      quantity_delta: delta,
      resulting_stock: data.stock,
      note: `Variant "${existing?.name || 'Item'}" stock updated (${oldStock} → ${data.stock})`,
    });
  }

  revalidate();
}

export async function deleteVariant(variantId: string) {
  await supabaseAdmin.from('product_variants').delete().eq('id', variantId);
  revalidate();
}

// ─── Stock Movements ──────────────────────────────────────────────────────────────

export async function manualStockAdjust(
  productId: string,
  delta: number,
  note: string,
  variantId?: string | null
) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };
  if (!note.trim()) return { error: 'A reason note is required for manual adjustments' };

  let resultingStock: number;

  if (variantId) {
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', variantId)
      .single();

    const newStock = Math.max(0, (variant?.stock ?? 0) + delta);
    await supabaseAdmin
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variantId);
    resultingStock = newStock;
  } else {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    const newStock = Math.max(0, (product?.stock_quantity ?? 0) + delta);
    await supabaseAdmin
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);
    resultingStock = newStock;
  }

  await supabaseAdmin.from('stock_movements').insert({
    product_id: productId,
    variant_id: variantId ?? null,
    shop_id: shopId,
    change_type: 'manual_adjust',
    quantity_delta: delta,
    resulting_stock: resultingStock,
    note,
  });

  revalidate();
  return { success: true, resultingStock };
}

export async function restockProduct(
  productId: string,
  quantity: number,
  note: string,
  variantId?: string | null,
  supplierId?: string | null,
  costPerUnit?: number | null
) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };
  if (quantity <= 0) return { error: 'Quantity must be greater than 0' };

  let resultingStock: number;

  if (variantId) {
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', variantId)
      .single();

    const newStock = (variant?.stock ?? 0) + quantity;
    await supabaseAdmin
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variantId);
    resultingStock = newStock;
  } else {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    const newStock = (product?.stock_quantity ?? 0) + quantity;
    await supabaseAdmin
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);
    resultingStock = newStock;
  }

  await supabaseAdmin.from('stock_movements').insert({
    product_id: productId,
    variant_id: variantId ?? null,
    shop_id: shopId,
    change_type: 'restock',
    quantity_delta: quantity,
    resulting_stock: resultingStock,
    supplier_id: supplierId ?? null,
    cost_per_unit: costPerUnit ?? null,
    note: note || 'Restock',
  });

  revalidate();
  return { success: true, resultingStock };
}

export async function getStockMovements(productId: string) {
  const { data } = await supabaseAdmin
    .from('stock_movements')
    .select('id, change_type, quantity_delta, resulting_stock, supplier_id, cost_per_unit, note, created_at, variant_id, suppliers(name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

// ─── CSV Import ───────────────────────────────────────────────────────────────────

export type CSVRow = {
  name: string;
  description?: string;
  price: number;
  stock: number;
  sku?: string;
  category?: string;
};

export async function importCSV(rows: CSVRow[]) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };
  if (!rows.length) return { error: 'No rows to import' };

  const products = rows.map(r => ({
    shop_id: shopId,
    name: r.name,
    description: r.description ?? null,
    price: r.price,
    stock_quantity: r.stock,
    sku: r.sku ?? null,
    category: r.category ?? null,
    source: 'manual' as const,
    draft: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('products')
    .insert(products)
    .select('id, stock_quantity');

  if (error) return { error: error.message };

  // Write import movements for all products with stock
  const movements = (inserted ?? [])
    .filter(p => p.stock_quantity > 0)
    .map(p => ({
      product_id: p.id,
      shop_id: shopId,
      change_type: 'import' as const,
      quantity_delta: p.stock_quantity,
      resulting_stock: p.stock_quantity,
      note: 'CSV bulk import',
    }));

  if (movements.length) {
    await supabaseAdmin.from('stock_movements').insert(movements);
  }

  revalidate();
  return { success: true, count: inserted?.length ?? 0 };
}

// ─── Suppliers ────────────────────────────────────────────────────────────────────

export async function getSuppliers() {
  const shopId = await getShopId();
  if (!shopId) return [];
  const { data } = await supabaseAdmin
    .from('suppliers')
    .select('id, name, contact_phone, contact_note, created_at')
    .eq('shop_id', shopId)
    .order('name');
  return data ?? [];
}

export async function addSupplier(data: { name: string; contact_phone?: string; contact_note?: string }) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };
  await supabaseAdmin.from('suppliers').insert({ ...data, shop_id: shopId });
  revalidate();
  return { success: true };
}

export async function updateSupplier(id: string, data: { name?: string; contact_phone?: string; contact_note?: string }) {
  await supabaseAdmin.from('suppliers').update(data).eq('id', id);
  revalidate();
}

export async function deleteSupplier(id: string) {
  await supabaseAdmin.from('suppliers').delete().eq('id', id);
  revalidate();
}

// ─── Reports & Analytics ──────────────────────────────────────────────────────────

export async function getInventoryStats() {
  const shopId = await getShopId();
  if (!shopId) return null;

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('stock_quantity, price, cost_price, is_active, low_stock_threshold, draft')
    .eq('shop_id', shopId)
    .eq('draft', false);

  if (!products) return null;

  let totalRetailValue = 0;
  let totalCostValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const qty = p.stock_quantity ?? 0;
    totalRetailValue += qty * (p.price ?? 0);
    totalCostValue += qty * (p.cost_price ?? 0);
    if (qty === 0) outOfStockCount++;
    else if (qty <= (p.low_stock_threshold ?? 5)) lowStockCount++;
  }

  return { totalRetailValue, totalCostValue, lowStockCount, outOfStockCount, totalProducts: products.length };
}

export async function getSalesByProduct(startDate: string, endDate: string) {
  const shopId = await getShopId();
  if (!shopId) return [];

  const { data } = await supabaseAdmin
    .from('stock_movements')
    .select('product_id, quantity_delta, created_at, products(name, image_url, price)')
    .eq('shop_id', shopId)
    .eq('change_type', 'order')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (!data) return [];

  // Aggregate by product
  const map = new Map<string, { name: string; imageUrl: string | null; price: number; unitsSold: number; productId: string }>();
  for (const m of data) {
    const prod = m.products as { name?: string; image_url?: string; price?: number } | null;
    const name = prod?.name ?? 'Unknown';
    const imageUrl = prod?.image_url ?? null;
    const price = prod?.price ?? 0;
    const existing = map.get(m.product_id);
    if (existing) {
      existing.unitsSold += Math.abs(m.quantity_delta);
    } else {
      map.set(m.product_id, { 
        productId: m.product_id, 
        name, 
        imageUrl,
        price,
        unitsSold: Math.abs(m.quantity_delta) 
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.unitsSold - a.unitsSold);
}

export async function getReorderCandidates() {
  const shopId = await getShopId();
  if (!shopId) return [];

  // Fetch shop reorder window
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('reorder_window_days')
    .eq('id', shopId)
    .single();
  const windowDays = shop?.reorder_window_days ?? 7;

  // 30-day order velocity from stock_movements (only 'order' type)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: movements } = await supabaseAdmin
    .from('stock_movements')
    .select('product_id, quantity_delta')
    .eq('shop_id', shopId)
    .eq('change_type', 'order')
    .gte('created_at', thirtyDaysAgo);

  // Aggregate velocity by product
  const velocity = new Map<string, number>();
  for (const m of movements ?? []) {
    velocity.set(m.product_id, (velocity.get(m.product_id) ?? 0) + Math.abs(m.quantity_delta));
  }

  // Fetch all live products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, stock_quantity, low_stock_threshold, product_images(url, position, variant_id)')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .eq('draft', false);

  const candidates = [];
  for (const p of products ?? []) {
    const sold30d = velocity.get(p.id) ?? 0;
    const dailyVelocity = sold30d / 30;
    const daysUntilEmpty = dailyVelocity > 0 ? (p.stock_quantity ?? 0) / dailyVelocity : Infinity;

    if (daysUntilEmpty <= windowDays || (p.stock_quantity ?? 0) === 0) {
      const suggestedQty = Math.max(0, Math.ceil(sold30d - (p.stock_quantity ?? 0)));
      candidates.push({
        id: p.id,
        name: p.name,
        stock: p.stock_quantity ?? 0,
        images: (p.product_images ?? []).filter(i => !i.variant_id).map(i => i.url),
        product_images: p.product_images ?? [],
        dailyVelocity: Math.round(dailyVelocity * 10) / 10,
        daysUntilEmpty: isFinite(daysUntilEmpty) ? Math.round(daysUntilEmpty) : null,
        suggestedReorderQty: suggestedQty,
      });
    }
  }

  return candidates.sort((a, b) => (a.daysUntilEmpty ?? 999) - (b.daysUntilEmpty ?? 999));
}

// ─── Phase 13 Shop Movements & Product Context Media ──────────────────────────────

export async function getShopMovements(shopId?: string | null) {
  const actualShopId = shopId || (await getShopId());
  if (!actualShopId) return [];

  const { data } = await supabaseAdmin
    .from('stock_movements')
    .select('id, change_type, quantity_delta, resulting_stock, supplier_id, cost_per_unit, note, created_at, variant_id, products(name, product_images(url)), suppliers(name)')
    .eq('shop_id', actualShopId)
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export type ProductMediaInput = {
  url: string;
  media_type: 'image' | 'video';
  tags: string[];
};

export async function getProductMedia(productId: string) {
  const { data, error } = await supabaseAdmin
    .from('product_media')
    .select('id, url, media_type, tags, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching product media:', error.message);
    return [];
  }
  return data ?? [];
}

export async function saveProductMedia(productId: string, mediaItems: ProductMediaInput[]) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };

  // First, delete existing media for the product
  const { error: deleteErr } = await supabaseAdmin
    .from('product_media')
    .delete()
    .eq('product_id', productId);

  if (deleteErr) {
    return { error: deleteErr.message };
  }

  if (mediaItems.length === 0) {
    return { success: true };
  }

  // Insert new media items
  const rows = mediaItems.map(item => ({
    product_id: productId,
    shop_id: shopId,
    url: item.url,
    media_type: item.media_type,
    tags: item.tags,
  }));

  const { error: insertErr } = await supabaseAdmin
    .from('product_media')
    .insert(rows);

  if (insertErr) {
    return { error: insertErr.message };
  }

  return { success: true };
}

// ─── Legacy helpers (kept for compatibility) ────────────────────────────────────
export async function updateStock(productId: string, stock_quantity: number) {
  await supabaseAdmin
    .from('products')
    .update({ stock_quantity, updated_at: new Date().toISOString() })
    .eq('id', productId);
  revalidatePath('/dashboard/inventory');
}

