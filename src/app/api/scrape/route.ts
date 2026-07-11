import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Simple product extraction from HTML
interface ScrapedProduct {
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  scraped_url: string;
}

function extractJsonLd(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const price = offer?.price ? parseFloat(offer.price) : 0;
          if (item.name && price > 0) {
            products.push({
              name: item.name,
              description: item.description,
              price,
              currency: offer?.priceCurrency || 'BDT',
              image_url: Array.isArray(item.image) ? item.image[0] : item.image,
              scraped_url: '',
            });
          }
        }
      }
    } catch {}
  }
  
  return products;
}

function extractHeuristic(html: string, baseUrl: string): ScrapedProduct[] {
  // Extract price patterns like "৳2,500" "BDT 2500" "Tk. 1800" "2,500.00 BDT"
  const products: ScrapedProduct[] = [];
  
  // Look for product-name-like headings near prices
  const productPattern = /<h[123][^>]*>([^<]{5,100})<\/h[123]>[\s\S]{0,500}?(?:৳|BDT|Tk\.?)\s*([\d,]+(?:\.\d{2})?)/gi;
  let match;
  
  while ((match = productPattern.exec(html)) !== null) {
    const name = match[1].replace(/<[^>]+>/g, '').trim();
    const priceStr = match[2].replace(/,/g, '');
    const price = parseFloat(priceStr);
    
    if (name && price > 0 && name.length < 150) {
      products.push({
        name,
        price,
        currency: 'BDT',
        scraped_url: baseUrl,
      });
    }
  }
  
  return products.slice(0, 20); // Cap at 20 heuristic results
}

export async function POST(request: Request) {
  try {
    const { shopId, url } = await request.json();
    
    if (!shopId || !url) {
      return NextResponse.json({ error: 'shopId and url are required' }, { status: 400 });
    }
    
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 });
    }

    // Check robots.txt
    try {
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
      const robotsRes = await fetch(robotsUrl, { 
        headers: { 'User-Agent': 'DullBot/1.0 (product catalogue importer)' },
        signal: AbortSignal.timeout(5000) 
      });
      if (robotsRes.ok) {
        const robotsTxt = await robotsRes.text();
        const disallowed = robotsTxt.split('\n').some(line => {
          const trimmed = line.trim().toLowerCase();
          return trimmed.startsWith('disallow:') && (
            trimmed.includes('disallow: /') && 
            !trimmed.includes('disallow: /$')
          );
        });
        if (disallowed) {
          return NextResponse.json({ error: 'robots.txt disallows scraping this site.' }, { status: 403 });
        }
      }
    } catch {}
    
    // Fetch page
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'DullBot/1.0 (product catalogue importer)' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!pageRes.ok) {
      return NextResponse.json({ error: `Page returned ${pageRes.status}` }, { status: 400 });
    }
    
    const html = await pageRes.text();
    
    // Try JSON-LD first
    let scrapedProducts = extractJsonLd(html);
    if (scrapedProducts.length === 0) {
      scrapedProducts = extractHeuristic(html, url);
    }
    
    if (scrapedProducts.length === 0) {
      return NextResponse.json({ message: 'No products found on this page.', count: 0 });
    }
    
    // Upsert shop website_url
    await supabaseAdmin.from('shops').update({ website_url: url }).eq('id', shopId);
    
    // Insert as draft products
    const rows = scrapedProducts.map(p => ({
      shop_id: shopId,
      name: p.name,
      description: p.description || null,
      price: p.price,
      currency: p.currency,
      image_url: p.image_url || null,
      source: 'scraped' as const,
      draft: true,
      scraped_url: url,
      is_active: false,
      stock_quantity: 0,
    }));
    
    const { data: inserted, error } = await supabaseAdmin
      .from('products')
      .insert(rows)
      .select('id');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: `Found ${inserted?.length ?? 0} products. Review and approve below.`,
      count: inserted?.length ?? 0,
    });
  } catch (err: any) {
    console.error('Scrape error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
