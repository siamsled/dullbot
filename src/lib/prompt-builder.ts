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

type ProductRow = {
  name: string;
  description?: string | null;
  price: number;
  currency?: string | null;
  stock_quantity?: number | null;
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
    ? 'Use formal, professional language. No slang.'
    : formalCasual > 70
    ? 'Use casual, friendly language. Contractions are fine.'
    : 'Use neutral, clear language — not too formal, not too casual.';

  const detailLine = conciseDetailed < 30
    ? 'Keep replies extremely short. One or two sentences maximum.'
    : conciseDetailed > 70
    ? 'Provide thorough, detailed responses when helpful.'
    : 'Be concise but complete. Answer the question directly.';

  const warmthLine = professionalWarm < 30
    ? 'Maintain a professional, efficient tone. No pleasantries.'
    : professionalWarm > 70
    ? 'Be warm and personable. Show genuine care for the customer.'
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
    ? 'If a customer expresses serious dissatisfaction, frustration, or makes a complaint, immediately escalate to a human agent. Do not try to resolve serious complaints yourself.'
    : 'Try to handle complaints politely. Escalate to a human only if you genuinely cannot help.';

  // Confidence fallback
  const fallbackLine =
    confidenceFallback === 'guess' ? 'If unsure, give your best guess while acknowledging uncertainty.'
    : confidenceFallback === 'say_checking' ? 'If you are unsure about something, say "Let me check on that for you" and do not fabricate information.'
    : 'If unsure, escalate to a human agent immediately rather than guessing.';

  // AI disclosure
  const disclosureLine = discloseAi
    ? 'If a customer directly asks whether you are an AI or a bot, confirm honestly that you are.'
    : 'Do not volunteer information about being an AI. If directly asked, you may deflect by saying "I\'m here to help you with your order."';

  // Custom Instructions
  const customInstructionsSection = shop.ai_instructions 
    ? `\nCUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

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
- If a customer wants to place an order, collect: Name, Phone Number, and Delivery Address.
${customInstructionsSection}
${productSection}${examplesSection}`;
}

function buildProductSection(products: ProductRow[]): string {
  if (!products || products.length === 0) {
    return 'PRODUCTS: No products are currently listed in the catalogue.';
  }
  const lines = products.map(p =>
    `  • ${p.name}: ${p.price} ${p.currency ?? 'BDT'}${p.description ? ` — ${p.description}` : ''}${p.stock_quantity !== undefined ? ` (${p.stock_quantity} in stock)` : ''}`
  );
  return `CURRENT PRODUCTS:\n${lines.join('\n')}\n\nIf a customer asks about a product not in the above list, tell them honestly that you only carry what is listed.`;
}
