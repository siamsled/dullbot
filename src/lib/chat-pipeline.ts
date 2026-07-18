import { invokeGemini, createPromptCache } from './gemini';
import { supabaseAdmin } from './supabase-admin';
import { buildSystemPrompt } from './prompt-builder';
import { handleOrderCreationIntercept, processPaymentVerification } from './order-manager';
import crypto from 'crypto';

// Gemini Flash Lite pricing (USD per million tokens) as of 2025
const GEMINI_INPUT_COST_PER_M = 0.25;
const GEMINI_OUTPUT_COST_PER_M = 1.50;

// In-process pricing config cache — refreshed every 5 minutes
let pricingConfigCache: {
  markup_multiplier: number;
  low_balance_warn_pct: number;
  low_balance_critical_pct: number;
  cachedAt: number;
} | null = null;

async function getPricingConfig() {
  const now = Date.now();
  if (pricingConfigCache && now - pricingConfigCache.cachedAt < 5 * 60 * 1000) {
    return pricingConfigCache;
  }
  const { data } = await supabaseAdmin
    .from('pricing_config')
    .select('markup_multiplier, low_balance_warn_pct, low_balance_critical_pct')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const config = data ?? { markup_multiplier: 4.0, low_balance_warn_pct: 0.20, low_balance_critical_pct: 0.05 };
  pricingConfigCache = { ...config, cachedAt: now };
  return pricingConfigCache;
}

async function getOrCreateConversation(shopId: string, customerPhone: string, channel: string) {
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id, status')
    .eq('shop_id', shopId)
    .eq('customer_phone', customerPhone)
    .neq('status', 'closed')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from('conversations')
    .insert({ shop_id: shopId, customer_phone: customerPhone, channel })
    .select('id, status')
    .single();

  return created;
}

async function getConversationHistory(shopId: string, conversationId: string, tuningUpdatedAt?: string | null) {
  let query = supabaseAdmin
    .from('messages')
    .select('id, sender, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (tuningUpdatedAt) {
    query = query.gt('created_at', tuningUpdatedAt);
  }

  const { data: messages } = await query.limit(20);

  if (!messages || messages.length === 0) return [];

  // Check if we have a summary stored
  const cacheKey = `summary_${conversationId}`;
  const { data: cachedSummary } = await supabaseAdmin
    .from('response_cache')
    .select('response_text')
    .eq('shop_id', shopId)
    .eq('cache_key', cacheKey)
    .single();

  let summaryText = '';
  let summarizedUpToMsgId = '';
  if (cachedSummary) {
    const parts = cachedSummary.response_text.split('|||');
    if (parts.length >= 2) {
      summarizedUpToMsgId = parts[0];
      summaryText = parts.slice(1).join('|||');
    }
  }

  const chronological = [...messages].reverse();
  
  // Find index of the message we've summarized up to
  let unsummarizedStartIndex = 0;
  if (summarizedUpToMsgId) {
    const idx = chronological.findIndex(m => m.id === summarizedUpToMsgId);
    if (idx !== -1) {
      unsummarizedStartIndex = idx + 1;
    }
  }

  const unsummarizedMessages = chronological.slice(unsummarizedStartIndex);

  // If there are > 8 unsummarized messages, let's summarize the oldest 4
  if (unsummarizedMessages.length > 8) {
    const messagesToSummarize = unsummarizedMessages.slice(0, 4);
    const textToSummarize = messagesToSummarize.map(m => `${m.sender}: ${m.content}`).join('\\n');
    
    const summaryPrompt = `You are summarizing an ongoing chat between a customer and a bot.
Previous summary: ${summaryText || 'None'}
New messages to append to summary:
${textToSummarize}

Write a very brief factual summary (under 3 sentences) of what the customer wants, their preferences, and what has been offered so far. DO NOT include pleasantries.`;
    
    try {
      const summaryResponse = await invokeGemini(summaryPrompt, 'Summarize this.', []);
      if (summaryResponse.success && summaryResponse.text) {
        summaryText = summaryResponse.text.trim();
        summarizedUpToMsgId = messagesToSummarize[3].id;
        unsummarizedStartIndex += 4;
        
        // Save to cache
        await supabaseAdmin.from('response_cache').upsert({
          shop_id: shopId,
          cache_key: cacheKey,
          response_text: `${summarizedUpToMsgId}|||${summaryText}`,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'shop_id,cache_key' });
      }
    } catch (err) {
      console.error("Failed to generate summary", err);
    }
  }

  const activeMessages = chronological.slice(unsummarizedStartIndex).filter(m => m.sender === 'customer' || m.sender === 'bot');

  const formatted = activeMessages.map(m => ({
    role: m.sender === 'customer' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  if (summaryText && formatted.length > 0) {
    formatted[0].parts[0].text = `[SYSTEM NOTE: Summary of earlier conversation: ${summaryText}]\\n\\n${formatted[0].parts[0].text}`;
  }

  while (formatted.length > 0 && formatted[0].role === 'model') {
    formatted.shift();
  }

  return formatted;
}

async function persistMessage(conversationId: string, sender: 'customer' | 'bot' | 'human_agent', content: string) {
  await supabaseAdmin.from('messages').insert({ conversation_id: conversationId, sender, content });
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function billGeminiCall(
  shopId: string,
  conversationId: string,
  inputTokens: number,
  outputTokens: number,
  cacheHit: boolean,
  prefilterHit: boolean
) {
  const pricing = await getPricingConfig();

  const rawCost = cacheHit || prefilterHit ? 0 :
    (inputTokens / 1_000_000) * GEMINI_INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_M;

  const billedCredits = rawCost * pricing.markup_multiplier;

  // Insert usage log
  await supabaseAdmin.from('usage_logs').insert({
    shop_id: shopId,
    conversation_id: conversationId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    raw_cost: rawCost,
    billed_credits: billedCredits,
    cache_hit: cacheHit,
    prefilter_hit: prefilterHit,
  });

  if (billedCredits <= 0) return;

  // Decrement credit balance and check thresholds
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('credit_balance, low_balance_notified_at')
    .eq('id', shopId)
    .single();

  if (!shop) return;

  const newBalance = Math.max(0, (shop.credit_balance ?? 0) - billedCredits);

  // Fetch last top-up to compute threshold amounts
  const { data: lastTopup } = await supabaseAdmin
    .from('credit_topups')
    .select('credits_granted')
    .eq('shop_id', shopId)
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const topupAmount = lastTopup?.credits_granted ?? 0;
  const warnThreshold = topupAmount * pricing.low_balance_warn_pct;
  const criticalThreshold = topupAmount * pricing.low_balance_critical_pct;

  const isBelowThreshold = topupAmount > 0 && (newBalance <= warnThreshold || newBalance <= criticalThreshold);
  const alreadyNotified = !!shop.low_balance_notified_at;

  const updatePayload: Record<string, unknown> = { credit_balance: newBalance };
  if (isBelowThreshold && !alreadyNotified) {
    updatePayload.low_balance_notified_at = new Date().toISOString();
  }

  await supabaseAdmin.from('shops').update(updatePayload).eq('id', shopId);
}

// ── Pre-filter layer (zero-cost, no Gemini call) ──────────────────────────────
// Each entry: { pattern, reply | replyFn }
// replyFn receives the normalized text and the shop's live product list.
// Returns null to fall through to Gemini if the lookup yields no useful data.

const STATIC_PREFILTER: { trigger: RegExp; reply: string }[] = [
  // Greetings
  {
    trigger: /^(hi|hello|hey|helo|heloo|salaam|salam|assalamualaikum|walaikum|আস্সালামু আলাইকুম|ওয়ালাইকুম|কেমন আছ|kemon acho|wadup|waddup|sup\??|yo\b|what['']?s up)/i,
    reply: 'হ্যালো! কী সাহায্য করতে পারি?',
  },
  // Thanks / closing
  {
    trigger: /^(thank|thanks|tnx|thx|ty\b|dhonnobad|ধন্যবাদ|shukriya|জাজাকাল্লাহ|jazakallah|ok done|okok|okay done|বাই|bye|আল্লাহ হাফেজ|allah hafez|khoda hafez)/i,
    reply: 'আপনাকে স্বাগতম! আর কিছু লাগলে জানাবেন।',
  },
  // Discount
  {
    trigger: /discount|ছাড়|কম দামে|negotiate|bargain|কমাবেন|দাম কমান|less price/i,
    reply: 'দুঃখিত, দাম ফিক্সড। কোনো ডিসকাউন্ট দেওয়া সম্ভব না।',
  },
  // Delivery / shipping
  {
    trigger: /delivery|courier|shipping|পৌঁছাবে|পাঠাবেন|delivery charge|delivery cost|delivery fee|কতদিনে পাব|kotodin|কত দিন লাগবে/i,
    reply: 'ঢাকার ভেতরে সাধারণত ১–২ কার্যদিবস এবং ঢাকার বাইরে ৩–৫ কার্যদিবস সময় লাগে। চার্জ অর্ডারের সময় নিশ্চিত করা হবে।',
  },
  // Business hours / open
  {
    trigger: /open|closed|khulan|খোলা|বন্ধ|hours|time|সময়|কটায় খোলে|কখন খোলা|are you open|are u open/i,
    reply: 'আমরা সপ্তাহের প্রতিদিন সকাল ১০টা থেকে রাত ১০টা পর্যন্ত সার্ভিস দিই।',
  },
  // Short filler / noise that doesn't need Gemini
  {
    trigger: /^([?]+|[!]+|[.]+|hmm+|hm+|huh+|ok+|okay+|aight|lol|lmao|😂|👍|🙂|🔥|na|nah|and\??|ar\??|আর\??)$/i,
    reply: 'হ্যাঁ, বলুন! কী জানতে চাইছেন?',
  },
];

// Product-aware stock/price pre-filter — performs a live DB lookup and returns
// a templated reply, or null if no named product is matched.
async function productPrefilter(
  normalizedText: string,
  shopId: string
): Promise<string | null> {
  const isStockCheck = /ache\??|আছে\??|available|stock|পাওয়া যাবে|পাবো|পাব|asbe|আসবে|আছে কি|in stock/i.test(normalizedText);
  const isPriceCheck = /price|dam|দাম|কত|koto|কত টাকা|rate\??|cost|মূল্য/i.test(normalizedText);

  if (!isStockCheck && !isPriceCheck) return null;

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, price, stock_quantity, currency')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .eq('draft', false);

  if (!products || products.length === 0) return null;

  // Try to find a product whose name appears in the message
  const matched = products.find(p =>
    normalizedText.includes(p.name.toLowerCase())
  );

  if (!matched) return null;

  if (isPriceCheck) {
    return `${matched.name} এর দাম ${matched.price} ${matched.currency ?? 'BDT'}।`;
  }
  if (isStockCheck) {
    const inStock = (matched.stock_quantity ?? 0) > 0;
    return inStock
      ? `হ্যাঁ, ${matched.name} এখন স্টকে আছে! অর্ডার করতে চাইলে বলুন।`
      : `দুঃখিত, ${matched.name} এখন স্টকে নেই। নতুন স্টক এলে জানাতে পারব।`;
  }
  return null;
}



export async function processIncomingMessage(
  shopSlug: string,
  customerPhone: string,
  text: string,
  channel: string = 'messenger'
) {
  // Resolve shop with all tuning columns
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return { success: false, message: "Shop not found.", cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // If bot is disabled, skip
  if (!shop.agent_enabled) {
    return { success: false, message: null, cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // Check fraud flag
  const hashedPhone = crypto.createHash('sha256').update(customerPhone).digest('hex');
  const { data: fraudFlag } = await supabaseAdmin
    .from('fraud_flags')
    .select('id')
    .eq('shop_id', shop.id)
    .eq('hashed_customer_id', hashedPhone)
    .single();

  if (fraudFlag) {
    return { success: false, message: null, cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // Ensure conversation exists
  const conversation = await getOrCreateConversation(shop.id, customerPhone, channel);
  if (!conversation) {
    return { success: false, message: "Could not create conversation.", cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // If conversation is in human takeover, don't reply
  if (conversation.status === 'human_takeover') {
    return { success: false, message: null, cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // Save incoming customer message
  await persistMessage(conversation.id, 'customer', text);

  // Check for payment verification claims first (before pre-filters or Gemini)
  const paymentReply = await processPaymentVerification(conversation.id, shop.id, text);
  if (paymentReply) {
    await persistMessage(conversation.id, 'bot', paymentReply);
    return { success: true, message: paymentReply, cacheHit: false, preFilterHit: true, geminiCalled: false };
  }

  // 1. Pre-filter: static patterns (zero cost — no DB, no Gemini)
  const rawText = text.trim();
  const normalizedText = rawText.toLowerCase().replace(/\s+/g, ' ');

  for (const entry of STATIC_PREFILTER) {
    if (entry.trigger.test(normalizedText)) {
      await persistMessage(conversation.id, 'bot', entry.reply);
      await billGeminiCall(shop.id, conversation.id, 0, 0, false, true);
      return { success: true, message: entry.reply, cacheHit: false, preFilterHit: true, geminiCalled: false };
    }
  }

  // 1b. Pre-filter: product-aware stock/price lookup (DB hit, but no Gemini)
  const productReply = await productPrefilter(normalizedText, shop.id);
  if (productReply) {
    await persistMessage(conversation.id, 'bot', productReply);
    await billGeminiCall(shop.id, conversation.id, 0, 0, false, true);
    return { success: true, message: productReply, cacheHit: false, preFilterHit: true, geminiCalled: false };
  }

  // 2. Check credit balance — block if zero
  if ((shop.credit_balance ?? 0) <= 0) {
    const fallback = "We'll get back to you shortly.";
    await persistMessage(conversation.id, 'bot', fallback);
    // Flag conversation for human takeover
    await supabaseAdmin
      .from('conversations')
      .update({ status: 'human_takeover' })
      .eq('id', conversation.id);
    return { success: true, message: fallback, cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // 3. Check Supabase response cache (60-min expiry)
  const cacheKey = `${shopSlug}:${normalizedText}`;
  const { data: cached } = await supabaseAdmin
    .from('response_cache')
    .select('response_text')
    .eq('shop_id', shop.id)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (cached) {
    await persistMessage(conversation.id, 'bot', cached.response_text);
    await billGeminiCall(shop.id, conversation.id, 0, 0, true, false);
    return { success: true, message: cached.response_text, cacheHit: true, preFilterHit: false, geminiCalled: false };
  }

  // 4. Fetch scoped live inventory (products + variants) or services for AI context
  let productsWithId: any[] = [];
  
  if (shop.business_type === 'service') {
    const { data: services } = await supabaseAdmin
      .from('services')
      .select('id, name, description, price, duration_minutes, active')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .limit(15);
      
    productsWithId = (services || []).map(s => ({
      id: s.id,
      name: s.name,
      description: `${s.description || ''} (Duration: ${s.duration_minutes} minutes)`.trim(),
      price: s.price,
      currency: 'BDT',
      stock_quantity: 1,
      image_url: null,
      sku: null
    }));
  } else {
    // Extract keywords from user message to perform simple search
    const keywords = normalizedText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    
    let productQuery = supabaseAdmin
      .from('products')
      .select('id, name, description, price, stock_quantity, currency, sku, image_url')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .eq('draft', false)
      .gt('stock_quantity', 0);

    if (keywords.length > 0) {
      const orClauses = keywords.map(k => `name.ilike.%${k}%,description.ilike.%${k}%`).join(',');
      productQuery = productQuery.or(orClauses).limit(10);
    } else {
      productQuery = productQuery.limit(5); // generic fallback limit
    }

    let { data: fetchedProducts } = await productQuery;
    productsWithId = fetchedProducts || [];
    
    // If no matches found with keywords, fallback to top 5 products to provide some generic context
    if (productsWithId.length === 0 && keywords.length > 0) {
      const { data: fallbackProducts } = await supabaseAdmin
        .from('products')
        .select('id, name, description, price, stock_quantity, currency, sku, image_url')
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .eq('draft', false)
        .gt('stock_quantity', 0)
        .limit(5);
      productsWithId = fallbackProducts || [];
    }

    let variantsByProduct: Record<string, { name: string; sku?: string | null; price_override?: number | null; stock: number }[]> = {};

    if (productsWithId && productsWithId.length > 0) {
      const ids = productsWithId.map(p => p.id);
      const { data: allVariants } = await supabaseAdmin
        .from('product_variants')
        .select('product_id, name, sku, price_override, stock')
        .in('product_id', ids)
        .gt('stock', 0);

      for (const v of allVariants ?? []) {
        if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
        variantsByProduct[v.product_id].push(v);
      }
    }

    productsWithId = productsWithId.map(p => ({
      ...p,
      variants: variantsByProduct[p.id] ?? [],
    }));
  }

  const productsForPrompt = (productsWithId ?? []).map(p => ({
    ...p,
    variants: p.variants ?? [],
  }));

  const { data: exampleReplies } = await supabaseAdmin
    .from('example_replies')
    .select('customer_message, ideal_reply')
    .eq('shop_id', shop.id)
    .limit(10);

  let persona = null;
  if (shop.persona_id) {
    const { data: pData } = await supabaseAdmin
      .from('agent_personas')
      .select('*')
      .eq('id', shop.persona_id)
      .single();
    if (pData) {
      if (shop.persona_custom_name) pData.name = shop.persona_custom_name;
      persona = pData;
    }
  }

  // 5. Build dynamic system prompt (with variant-level context)
  const { data: activeOrders } = await supabaseAdmin
    .from('orders')
    .select('*, products(price)')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false });

  const systemPrompt = buildSystemPrompt(
    shop,
    persona,
    productsForPrompt ?? [],
    exampleReplies ?? [],
    activeOrders ?? []
  );

  // 5.5 Check Gemini Prompt Cache
  let promptCacheRef = shop.prompt_cache_ref;
  if (!promptCacheRef || !shop.prompt_cache_expires_at || new Date(shop.prompt_cache_expires_at) <= new Date()) {
    // Generate new cache
    const cacheData = await createPromptCache(systemPrompt);
    if (cacheData) {
      promptCacheRef = cacheData.name;
      await supabaseAdmin.from('shops').update({
        prompt_cache_ref: cacheData.name,
        prompt_cache_expires_at: cacheData.expiresAt,
      }).eq('id', shop.id);
    } else {
      promptCacheRef = null;
    }
  }

  // 6. Load conversation history from Supabase, applying tuning timestamp gate
  const history = await getConversationHistory(shop.id, conversation.id, shop.persona_updated_at || shop.tuning_updated_at);

  // 7. Call Gemini
  const response = await invokeGemini(systemPrompt, text, history, promptCacheRef);

  if (response.success && response.text) {
    let aiMessage = response.text.trim();

    // Intercept [CREATE_ORDER: ...] tag
    const intercept = await handleOrderCreationIntercept(conversation.id, shop.id, aiMessage);
    aiMessage = intercept.cleanedText;

    // Persist bot reply
    await persistMessage(conversation.id, 'bot', aiMessage);

    // Write to response cache (60 minutes)
    await supabaseAdmin.from('response_cache').upsert({
      shop_id: shop.id,
      cache_key: cacheKey,
      response_text: aiMessage,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'shop_id,cache_key' });

    // Bill the call
    await billGeminiCall(shop.id, conversation.id, response.inputTokens ?? 0, response.outputTokens ?? 0, false, false);

    return { success: true, message: aiMessage, cacheHit: false, preFilterHit: false, geminiCalled: true };
  }

  return {
    success: false,
    message: response.text || "Sorry, system issue. Try again later.",
    cacheHit: false,
    preFilterHit: false,
    geminiCalled: false
  };
}


