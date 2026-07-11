// Builds a dynamic system prompt from shop tuning settings
// Called by chat-pipeline.ts instead of using a hardcoded string

type ShopTuningSettings = {
  name?: string | null;
  tone_formal_casual?: number | null;          // 0 = formal, 100 = casual
  tone_concise_detailed?: number | null;       // 0 = concise, 100 = detailed
  tone_professional_warm?: number | null;      // 0 = professional, 100 = warm
  language_mix?: string | null;               // 'bn' | 'en' | 'bn_en_mix'
  emoji_frequency?: string | null;            // 'none' | 'light' | 'heavy'
  max_discount_pct?: number | null;
  auto_escalate_on_complaint?: boolean | null;
  confidence_fallback?: string | null;        // 'guess' | 'say_checking' | 'escalate'
  disclose_ai_if_asked?: boolean | null;
  ai_instructions?: string | null;           // optional advanced override
};

type VariantRow = {
  name: string;          // e.g. "Red / Large"
  sku?: string | null;
  price_override?: number | null;
  stock: number;
};

type ProductRow = {
  name: string;
  description?: string | null;
  price: number;
  currency?: string | null;
  stock_quantity?: number | null;
  sku?: string | null;
  image_url?: string | null;
  variants?: VariantRow[];
};

export function buildSystemPrompt(
  shop: ShopTuningSettings,
  products: ProductRow[],
  exampleReplies: { customer_message: string; ideal_reply: string }[] = []
): string {
  const shopName = shop.name ?? 'this shop';



  // --- Tone directives ---
  const formalCasual = shop.tone_formal_casual ?? 50;
  const conciseDetailed = shop.tone_concise_detailed ?? 30;
  const professionalWarm = shop.tone_professional_warm ?? 20;
  const language = shop.language_mix ?? 'en';
  const emoji = shop.emoji_frequency ?? 'none';
  const maxDiscount = shop.max_discount_pct ?? 0;
  const escalateOnComplaint = shop.auto_escalate_on_complaint ?? true;
  const confidenceFallback = shop.confidence_fallback ?? 'say_checking';
  const discloseAi = shop.disclose_ai_if_asked ?? true;

  const toneLine = formalCasual < 30
    ? 'CRITICAL: You MUST use strictly formal, professional language. NEVER use slang, informal greetings (e.g. "bhai", "bro", "mate"), or casual phrasing.'
    : formalCasual > 70
    ? 'CRITICAL: You MUST use extremely casual, friendly language. Slang, informal phrasing, and contractions are highly encouraged.'
    : 'Use neutral, clear language — not too formal, not too casual.';

  const detailLine = conciseDetailed < 30
    ? 'Keep replies extremely short. One or two sentences maximum.'
    : conciseDetailed > 70
    ? 'Provide thorough, detailed responses when helpful.'
    : 'Be concise but complete. Answer the question directly.';

  const warmthLine = professionalWarm < 30
    ? 'CRITICAL: You MUST maintain a strictly professional, efficient, and detached tone. NEVER use unnecessary pleasantries, excessive apologies, or emotional language.'
    : professionalWarm > 70
    ? 'CRITICAL: You MUST be extremely warm, empathetic, and personable. Show genuine care and emotion for the customer.'
    : 'Be polite but efficient.';

  // Language (moved to top of prompt)
  const languageLine =
    language === 'bn' ? 'CRITICAL: You MUST reply exclusively in Bengali script (বাংলা). NEVER use English letters.'
    : language === 'bn_en_mix' ? 'CRITICAL: You MUST reply in casual Banglish (Bangla words written with English alphabet). NEVER use Bengali script.'
    : 'CRITICAL: You MUST reply exclusively in English. NEVER use Bengali words.';

  // Emoji
  const emojiLine =
    emoji === 'none' ? 'Do not use any emojis. Ever.'
    : emoji === 'light' ? 'Use emojis sparingly — max one or two per message, only when genuinely appropriate.'
    : 'Feel free to use emojis to make replies feel friendly and expressive.';

  // Discount policy
  const discountLine = maxDiscount > 0
    ? `You may offer up to ${maxDiscount}% discount if the customer explicitly asks. Never volunteer a discount unprompted.`
    : 'Prices are fixed. Do not offer or negotiate discounts under any circumstances.';

  // Escalation
  const escalateLine = escalateOnComplaint
    ? 'If a customer expresses serious dissatisfaction, frustration, or makes a complaint, immediately escalate the chat. Tell the customer you are transferring them to a senior colleague or manager (NEVER say "human agent"). Do not try to resolve serious complaints yourself. You MUST append the tag [ESCALATION: COMPLAINT] at the very end of your response.'
    : 'Try to handle complaints politely. Escalate to a senior colleague only if you genuinely cannot help. When you do escalate, you MUST append the tag [ESCALATION: COMPLAINT] at the very end of your response.';

  // Confidence fallback
  const fallbackLine =
    confidenceFallback === 'guess' ? 'If unsure, give your best guess while acknowledging uncertainty.'
    : confidenceFallback === 'say_checking' ? 'If you are unsure about something, say "Let me check on that for you" and do not fabricate information.'
    : 'If unsure, escalate to a senior colleague immediately rather than guessing. When you do escalate, you MUST append the tag [ESCALATION: UNSURE] at the very end of your response.';

  // AI disclosure
  const disclosureLine = discloseAi
    ? 'If a customer directly asks whether you are an AI or a bot, confirm honestly that you are an AI assistant.'
    : 'CRITICAL: You MUST act exactly like a real human agent. NEVER reveal that you are an AI. If asked, confirm you are a human representative.';

  // Custom Instructions
  const customInstructionsSection = shop.ai_instructions 
    ? `\nCUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

  // Image Instructions
  const imageLine = 'If a customer asks for pictures of a product, or if you are recommending a specific product, you MUST include its image by writing standard Markdown syntax: ![Product Name](image_url). Always put the markdown image on its own line.';

  // Product section
  const productSection = buildProductSection(products);

  // Few-shot examples
  const examplesSection = exampleReplies.length > 0
    ? `\n\nHere are example conversations that show the ideal reply style for this shop:\n${
        exampleReplies.map(e => `Customer: ${e.customer_message}\nYou: ${e.ideal_reply}`).join('\n\n')
      }`
    : '';

  return `You are an AI sales assistant for ${shopName}.
${languageLine}

TONE & STYLE:
- ${toneLine}
- ${detailLine}
- ${warmthLine}
- ${emojiLine}

BUSINESS RULES:
- ${discountLine}
- ${escalateLine}
- ${fallbackLine}
- ${disclosureLine}
- ${imageLine}
- If a customer wants to place an order, collect: Name, Phone Number, and Delivery Address.
${customInstructionsSection}
${productSection}${examplesSection}`;
}

function buildProductSection(products: ProductRow[]): string {
  if (!products || products.length === 0) {
    return 'PRODUCTS: No products are currently listed in the catalogue.';
  }

  const lines: string[] = [];

  for (const p of products) {
    const currency = p.currency ?? 'BDT';

    if (p.variants && p.variants.length > 0) {
      // Product with variants — emit each variant's stock and price
      lines.push(`  • ${p.name}${p.description ? ` — ${p.description}` : ''}${p.image_url ? ` (Image URL: ${p.image_url})` : ''}`);
      for (const v of p.variants) {
        const effectivePrice = v.price_override ?? p.price;
        const stockStr = v.stock > 0 ? `${v.stock} in stock` : 'OUT OF STOCK';
        lines.push(`      – ${v.name}: ${effectivePrice} ${currency} (${stockStr})${v.sku ? ` [SKU: ${v.sku}]` : ''}`);
      }
    } else {
      // Simple product — single stock level
      const stockStr = p.stock_quantity != null
        ? (p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'OUT OF STOCK')
        : '';

      lines.push(
        `  • ${p.name}: ${p.price} ${currency}` +
        (p.description ? ` — ${p.description}` : '') +
        (stockStr ? ` (${stockStr})` : '') +
        (p.sku ? ` [SKU: ${p.sku}]` : '') +
        (p.image_url ? ` (Image URL: ${p.image_url})` : '')
      );
    }
  }

  return `CURRENT PRODUCTS:\n${lines.join('\n')}\n\nIf a customer asks about a product not in the above list, tell them honestly that you only carry what is listed. When a customer asks about availability, be specific about variant stock levels.`;
}
