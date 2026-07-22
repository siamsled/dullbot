import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { saveProductImages } from '@/app/dashboard/inventory/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Shopify /products.json format
interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string;
  tags: string | string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: { name: string; position: number; values: string[] }[];
}

interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  inventory_quantity?: number; // Might not always be present depending on API version
}

interface ShopifyImage {
  id: number;
  created_at: string;
  position: number;
  updated_at: string;
  product_id: number;
  src: string;
  width: number;
  height: number;
}

// Custom Format
interface CustomProduct {
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  currency?: string;
  stock_quantity?: number;
  category?: string;
  image_url?: string;
  images?: string[];
  is_active?: boolean;
}

export async function POST(request: Request) {
  try {
    const { shopId, url, format } = await request.json();

    if (!shopId || !url || !format) {
      return NextResponse.json({ error: 'shopId, url, and format are required' }, { status: 400 });
    }

    // Update settings in shop table
    // Ignore TS type errors since api_sync_url is fresh in DB
    // @ts-ignore
    await supabaseAdmin.from('shops').update({
      api_sync_url: url,
      api_sync_format: format,
    }).eq('id', shopId);

    // Fetch the external API
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DullBot/2.0 Inventory Sync API',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch API. Status: ${res.status}` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      return NextResponse.json({ error: `API returned non-JSON content type: ${contentType}` }, { status: 400 });
    }

    const data = await res.json();
    let importedCount = 0;

    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, sku')
      .eq('shop_id', shopId);

    const existingMap = new Map((existingProducts || []).map(p => [p.name.toLowerCase(), p.id]));

    if (format === 'shopify') {
      const shopifyData = data as { products: ShopifyProduct[] };
      if (!shopifyData.products || !Array.isArray(shopifyData.products)) {
        return NextResponse.json({ error: 'Invalid Shopify format. Expected { products: [...] }' }, { status: 400 });
      }

      for (const sp of shopifyData.products) {
        const title = sp.title;
        const description = sp.body_html ? sp.body_html.replace(/<[^>]+>/g, '').trim() : '';
        const price = parseFloat(sp.variants?.[0]?.price || '0');
        const compareAt = sp.variants?.[0]?.compare_at_price ? parseFloat(sp.variants[0].compare_at_price) : null;
        const sku = sp.variants?.[0]?.sku || null;
        const images = (sp.images || []).map(img => img.src);
        const stock = sp.variants?.[0]?.inventory_quantity || 0;
        const category = sp.product_type || null;
        
        const payload = {
          shop_id: shopId,
          name: title,
          description: description || null,
          price: price,
          compare_at_price: compareAt,
          sku: sku,
          images: images.length > 0 ? images : null,
          image_url: images.length > 0 ? images[0] : null,
          category: category,
          is_active: true,
          stock_quantity: stock,
          draft: false,
          source: 'api'
        };

        const existingId = existingMap.get(title.toLowerCase());
        
        let targetId = existingId;
        if (existingId) {
          await supabaseAdmin.from('products').update(payload).eq('id', existingId);
        } else {
          const { data: created } = await supabaseAdmin.from('products').insert(payload).select('id').single();
          targetId = created?.id;
        }
        if (targetId && images.length > 0) {
          await saveProductImages(targetId, images.map((url, idx) => ({ url, variant_id: null, position: idx })));
        }
        importedCount++;
      }

    } else if (format === 'custom') {
      const customData = data as CustomProduct[];
      if (!Array.isArray(customData)) {
        return NextResponse.json({ error: 'Invalid Custom format. Expected an array of products' }, { status: 400 });
      }

      for (const cp of customData) {
        if (!cp.name) continue; 
        const payload = {
          shop_id: shopId,
          name: cp.name,
          description: cp.description || null,
          price: cp.price || 0,
          compare_at_price: cp.compare_at_price || null,
          sku: cp.sku || null,
          currency: cp.currency || 'BDT',
          stock_quantity: cp.stock_quantity || 0,
          category: cp.category || null,
          images: cp.images || (cp.image_url ? [cp.image_url] : null),
          image_url: cp.image_url || (cp.images && cp.images.length > 0 ? cp.images[0] : null),
          is_active: cp.is_active !== false,
          draft: false,
          source: 'api'
        };

        const existingId = existingMap.get(cp.name.toLowerCase());
        
        if (existingId) {
          await supabaseAdmin.from('products').update(payload).eq('id', existingId);
        } else {
          await supabaseAdmin.from('products').insert(payload);
        }
        importedCount++;
      }
    } else {
      return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
    }

    // @ts-ignore
    await supabaseAdmin.from('shops').update({ api_sync_last_run: new Date().toISOString() }).eq('id', shopId);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${importedCount} products.` 
    });

  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync API' }, { status: 500 });
  }
}
