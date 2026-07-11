import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
// Allow up to 60 seconds for multi-page crawl + Gemini extraction
export const maxDuration = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    // Remove scripts, styles, noscript, svg entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&taka;/g, '৳')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract all <a href> links that look like product listing pages */
function extractProductLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let m;

  const PRODUCT_HINTS = [
    'product', 'products', 'shop', 'store', 'collection', 'collections',
    'catalogue', 'catalog', 'item', 'items', 'listing', 'all', 'category',
    '/p/', '/c/', '/pd/', '/cat/',
  ];

  while ((m = hrefPattern.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript') || raw.startsWith('mailto')) continue;

    let absolute: string;
    try {
      absolute = new URL(raw, baseUrl).href;
    } catch {
      continue;
    }

    const parsed = new URL(absolute);
    // Must be same host
    if (parsed.hostname !== base.hostname) continue;
    // Skip obvious non-product paths
    if (/\.(jpg|png|webp|svg|gif|css|js|ico|pdf|xml|json)(\?|$)/i.test(parsed.pathname)) continue;
    // Must hint at product content
    const path = parsed.pathname.toLowerCase();
    const hint = PRODUCT_HINTS.some(h => path.includes(h));
    if (!hint) continue;

    const href = absolute.split('#')[0]; // strip fragment
    if (!links.includes(href)) links.push(href);
  }

  return links;
}

/** Fetch a URL with a browser-like UA and reasonable timeout */
async function fetchPage(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DullBot/2.0; +https://dullbot.ai) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    // Allow JS or JSON if we explicitly asked for it, otherwise HTML
    if (!ct.includes('html') && !ct.includes('javascript') && !ct.includes('json')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** 
 * For SPAs (React/Vue/Vanilla JS), the HTML is empty. 
 * This extracts JS script sources, fetches them, and looks for API or JSON endpoints.
 */
async function extractSpaData(rootHtml: string, baseUrl: string): Promise<{ url: string; text: string }[]> {
  const base = new URL(baseUrl);
  const dataResults: { url: string; text: string }[] = [];
  
  // 1. Find all <script src="...">
  const scriptPattern = /<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi;
  const scriptUrls: string[] = [];
  let m;
  while ((m = scriptPattern.exec(rootHtml)) !== null) {
    try {
      const absolute = new URL(m[1], baseUrl).href;
      if (new URL(absolute).hostname === base.hostname && !scriptUrls.includes(absolute)) {
        scriptUrls.push(absolute);
      }
    } catch {}
  }

  // 2. Fetch top 3 scripts
  const scripts = await Promise.all(
    scriptUrls.slice(0, 3).map(url => fetchPage(url, 5000))
  );

  const combinedCode = rootHtml + '\n' + scripts.filter(Boolean).join('\n');

  // 3. Find strings that look like API endpoints: /api/... or .../data.json
  const apiPattern = /(?:["'`])((?:https?:\/\/[^"'`]*)?\/?(?:api|data)\/[a-zA-Z0-9_/?=&.-]+|\/[a-zA-Z0-9_/?=&.-]+\.json)(?:["'`])/gi;
  const endpoints = new Set<string>();
  
  while ((m = apiPattern.exec(combinedCode)) !== null) {
    // Clean up JS template literal variables e.g. /api/products?id=${id} -> /api/products?id=
    let raw = m[1].replace(/\$\{[^}]+\}/g, '');
    try {
      const absolute = new URL(raw, baseUrl).href;
      if (new URL(absolute).hostname === base.hostname) {
        endpoints.add(absolute);
      }
    } catch {}
  }

  // 4. Fetch up to 3 endpoints
  const apiUrls = Array.from(endpoints).slice(0, 3);
  await Promise.all(
    apiUrls.map(async (apiUrl) => {
      try {
        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DullBot/2.0)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') ?? '';
          if (ct.includes('json')) {
            const text = await res.text();
            // Only add if it's not massive (cap at 20KB)
            if (text.length > 50 && text.length < 20000) {
              dataResults.push({ url: apiUrl, text });
            }
          }
        }
      } catch {}
    })
  );

  return dataResults;
}

// ─── Gemini extraction ────────────────────────────────────────────────────────

interface ExtractedProduct {
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  image_url?: string;
}

interface ExtractedBusiness {
  business_name?: string;
  business_description?: string;
  shipping_policy?: string;
  return_policy?: string;
  contact_info?: string;
  products: ExtractedProduct[];
}

async function extractWithGemini(
  pageTexts: { url: string; text: string }[],
  apiKey: string
): Promise<ExtractedBusiness> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Combine all page texts, capped at ~20k chars total to stay within token limits
  const combined = pageTexts
    .map(p => `=== PAGE: ${p.url} ===\n${p.text.slice(0, 8000)}`)
    .join('\n\n')
    .slice(0, 22000);

  const prompt = `You are extracting data from a business website to populate an inventory management system.

WEBSITE CONTENT (multiple pages may be included):
---
${combined}
---

Extract ALL of the following and return ONLY valid JSON, no markdown, no explanation:

{
  "business_name": "exact shop/business name from the site",
  "business_description": "what this business sells, their speciality, tone — 2-3 sentences max",
  "shipping_policy": "shipping info if found (delivery time, charges, areas served) — 1-2 sentences",
  "return_policy": "return/exchange policy if found — 1-2 sentences",
  "contact_info": "phone, email, social links if found",
  "products": [
    {
      "name": "exact product name",
      "description": "product description if available — be thorough, include material, size, features",
      "price": 1500,
      "currency": "BDT",
      "category": "inferred category (e.g. Clothing, Electronics, Food, etc.)",
      "image_url": "absolute image URL if available, else omit"
    }
  ]
}

RULES:
- Extract EVERY product you can find. Do not skip any.
- Price must be a plain number (no currency symbol). If price is missing or zero, still include the product with price: 0.
- currency should be "BDT" for Bangladeshi Taka (৳, Tk, Taka), "USD" for $, etc. Default to "BDT".
- For business_description: describe what they sell and their vibe, as context for an AI sales assistant.
- If you cannot find a field, omit it entirely (don't set it to null or "N/A").
- Return ONLY the raw JSON object. No code fences. No explanation.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip possible code fences Gemini sometimes adds despite instructions
  const json = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(json) as ExtractedBusiness;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
      return NextResponse.json({ error: 'Invalid URL — paste the full link including https://' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // ── Step 1: Fetch the root URL ─────────────────────────────────────────
    const rootHtml = await fetchPage(url);
    if (!rootHtml) {
      return NextResponse.json({
        error: `Could not reach ${url}. Make sure the URL is publicly accessible and returns HTML.`
      }, { status: 400 });
    }

    // ── Step 2: Find product listing pages linked from the root ────────────
    const linkedPages = extractProductLinks(rootHtml, url);

    // Fetch up to 4 extra pages (root + 4 = 5 pages max)
    const pagesToFetch = linkedPages.slice(0, 4);
    const pageResults: { url: string; text: string }[] = [
      { url, text: stripHtml(rootHtml) }
    ];

    await Promise.allSettled(
      pagesToFetch.map(async (pageUrl) => {
        const html = await fetchPage(pageUrl);
        if (html) {
          pageResults.push({ url: pageUrl, text: stripHtml(html) });
        }
      })
    );

    // ── Step 2.5: Extract SPA Data endpoints (for JS-rendered sites) ───────
    const spaData = await extractSpaData(rootHtml, url);
    for (const data of spaData) {
      pageResults.push({ url: data.url, text: `[JSON DATA]: ${data.text}` });
    }

    // ── Step 3: Gemini extraction ──────────────────────────────────────────
    let extracted: ExtractedBusiness;
    try {
      extracted = await extractWithGemini(pageResults, apiKey);
    } catch (geminiErr) {
      console.error('Gemini extraction failed:', geminiErr);
      return NextResponse.json({
        error: `AI extraction failed. The site may be blocking access or the content is not readable. Try pasting a direct product listing URL.`
      }, { status: 500 });
    }

    if (!extracted.products || extracted.products.length === 0) {
      return NextResponse.json({
        message: `DullBot visited ${pageResults.length} page(s) but couldn't find any product listings. Try pasting a direct link to your products or collection page.`,
        count: 0,
        pagesVisited: pageResults.length,
      });
    }

    // ── Step 4: Save business context back to the shop ────────────────────
    const shopUpdate: Record<string, string> = { website_url: url };
    if (extracted.business_name || extracted.business_description || extracted.shipping_policy) {
      // Build a rich ai_instructions snippet from extracted business context
      const contextParts: string[] = [];
      if (extracted.business_description) contextParts.push(`About the business: ${extracted.business_description}`);
      if (extracted.shipping_policy) contextParts.push(`Shipping: ${extracted.shipping_policy}`);
      if (extracted.return_policy) contextParts.push(`Returns: ${extracted.return_policy}`);
      if (extracted.contact_info) contextParts.push(`Contact: ${extracted.contact_info}`);

      if (contextParts.length) {
        // Fetch existing ai_instructions and append (don't overwrite)
        const { data: existingShop } = await supabaseAdmin
          .from('shops')
          .select('ai_instructions, name')
          .eq('id', shopId)
          .single();

        const existingInstructions = existingShop?.ai_instructions ?? '';
        const importedContext = `\n\n[Imported from website ${new Date().toLocaleDateString()}]\n${contextParts.join('\n')}`;

        // Only update name if not already set
        if (extracted.business_name && (!existingShop?.name || existingShop.name === 'Dull Store')) {
          shopUpdate['name'] = extracted.business_name;
        }
        shopUpdate['ai_instructions'] = (existingInstructions + importedContext).slice(0, 4000);
      }
    }

    await supabaseAdmin.from('shops').update(shopUpdate).eq('id', shopId);

    // ── Step 5: Insert products as drafts (stock_quantity = 0 always) ─────
    // The owner sets stock manually in the inventory — we never infer it.
    const rows = extracted.products
      .filter(p => p.name && p.name.trim().length > 0)
      .map(p => ({
        shop_id: shopId,
        name: p.name.trim(),
        description: p.description?.trim() || null,
        price: typeof p.price === 'number' && p.price > 0 ? p.price : 0,
        currency: p.currency || 'BDT',
        category: p.category?.trim() || null,
        image_url: p.image_url || null,
        images: p.image_url ? [p.image_url] : null,
        source: 'scraped' as const,
        draft: true,
        scraped_url: url,
        is_active: false,
        stock_quantity: 0, // Owner must set this manually
      }));

    if (rows.length === 0) {
      return NextResponse.json({
        message: 'Products were found but none had valid names. Check the URL and try a direct product listing page.',
        count: 0,
      });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('products')
      .insert(rows)
      .select('id');

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const count = inserted?.length ?? 0;
    const businessNote = extracted.business_name
      ? ` Business context from "${extracted.business_name}" has been saved to your AI settings.`
      : '';

    return NextResponse.json({
      message: `✓ Imported ${count} product${count !== 1 ? 's' : ''} from ${pageResults.length} page${pageResults.length !== 1 ? 's' : ''}. Review and set stock quantities below.${businessNote}`,
      count,
      pagesVisited: pageResults.length,
      businessExtracted: !!extracted.business_name,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Scrape route error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
