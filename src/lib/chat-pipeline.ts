import { invokeGemini } from './gemini';
import { supabaseAdmin } from './supabase-admin';

// Gemini Flash Lite pricing (USD per million tokens) as of 2025
const GEMINI_INPUT_COST_PER_M = 0.075;
const GEMINI_OUTPUT_COST_PER_M = 0.30;

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

async function getConversationHistory(conversationId: string) {
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('sender, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(12);

  if (!messages) return [];

  return messages
    .filter(m => m.sender === 'customer' || m.sender === 'bot')
    .map(m => ({
      role: m.sender === 'customer' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));
}

async function persistMessage(conversationId: string, sender: 'customer' | 'bot' | 'human_agent', content: string) {
  await supabaseAdmin.from('messages').insert({ conversation_id: conversationId, sender, content });
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function billGeminiCall(
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

const QUICK_REPLIES = [
  { trigger: /hello|hi|hey/i, reply: "Hello. Tell me what product you want to buy. I do not do small talk." },
  { trigger: /thank/i, reply: "You are welcome. Goodbye." },
  { trigger: /negotiate|discount|less price/i, reply: "Prices are fixed. No discounts. Take it or leave it." }
];

export async function processIncomingMessage(
  shopSlug: string,
  customerPhone: string,
  text: string,
  channel: string = 'messenger'
) {
  // Resolve shop
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, credit_balance, agent_enabled')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return { success: false, message: "Shop not found.", cacheHit: false, preFilterHit: false, geminiCalled: false };
  }

  // If bot is disabled, skip
  if (!shop.agent_enabled) {
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

  const normalizedText = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ");

  // 1. Pre-filter quick replies (zero cost)
  for (const qr of QUICK_REPLIES) {
    if (qr.trigger.test(normalizedText)) {
      await persistMessage(conversation.id, 'bot', qr.reply);
      await billGeminiCall(shop.id, conversation.id, 0, 0, false, true);
      return { success: true, message: qr.reply, cacheHit: false, preFilterHit: true, geminiCalled: false };
    }
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

  // 4. Fetch shop system instructions and live inventory
  const { data: shopDetails } = await supabaseAdmin
    .from('shops')
    .select('name, ai_instructions')
    .eq('id', shop.id)
    .single();

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, description, price, stock_quantity, currency')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  const productList = products && products.length > 0
    ? products.map(p => `  * ${p.name}: ${p.price} ${p.currency ?? 'BDT'}${p.description ? ` — ${p.description}` : ''} (${p.stock_quantity} in stock)`).join('\n')
    : '  * No products currently listed.';

  const systemPrompt = `You are DullBot, a deadpan, cynical, ruthlessly efficient AI sales assistant for ${shopDetails?.name ?? 'this shop'}.
Your brand voice:
- Never cheerful, never use exclamation marks.
- Never say "Hi! How can I help you today" or use emojis.
- Talk like a competent and slightly bored employee who just wants to get the job done and go home.
- Keep responses short, direct, and factual.
- Current products in shop inventory:
${productList}

If the customer wants to buy, collect their delivery details: Name, Phone Number, and Address.
If they ask for other products, tell them we only carry what's listed.
${shopDetails?.ai_instructions ? `\nAdditional shop instructions:\n${shopDetails.ai_instructions}` : ''}`;

  // 5. Load conversation history from Supabase
  const history = await getConversationHistory(conversation.id);

  // 6. Call Gemini
  const response = await invokeGemini(systemPrompt, text, history);

  if (response.success && response.text) {
    const aiMessage = response.text.trim();

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


