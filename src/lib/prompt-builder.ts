// Builds a dynamic system prompt from Persona and shop tuning settings
// Called by chat-pipeline.ts instead of using a hardcoded string

type AgentPersona = {
  name: string;
  job_function: string;
  language_style: string;
  full_specification: string;
  disclosure_line: string;
};

type ShopTuningSettings = {
  name?: string | null;
  disclosure_mode?: string | null;
  max_discount_pct?: number | null;
  auto_escalate_on_complaint?: boolean | null;
  confidence_fallback?: string | null;        // 'guess' | 'say_checking' | 'escalate'
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
  persona: AgentPersona | null,
  products: ProductRow[],
  exampleReplies: { customer_message: string; ideal_reply: string }[] = []
): string {
  const shopName = shop.name ?? 'this shop';

  // AI disclosure
  const disclosureMode = shop.disclosure_mode ?? 'reactive_honest';
  let disclosureLine = '';
  if (disclosureMode === 'reactive_honest') {
    disclosureLine = `If the customer explicitly asks if you are an AI, confirm honestly using this line: "${persona?.disclosure_line ?? "Yes, I am an AI assistant."}"`;
  } else if (disclosureMode === 'proactive_upfront') {
    disclosureLine = `In your VERY FIRST message to the customer, you MUST mention you are an AI using this line: "${persona?.disclosure_line ?? "I am an AI assistant."}"`;
  } else if (disclosureMode === 'playful_deflect_once') {
    disclosureLine = `If asked if you are an AI, play it off with a joke the first time. If they ask again, confirm honestly using this line: "${persona?.disclosure_line ?? "Okay fine, I am an AI!"}"`;
  }

  // Discount policy
  const maxDiscount = shop.max_discount_pct ?? 0;
  const discountLine = maxDiscount > 0
    ? `You may offer up to ${maxDiscount}% discount if the customer explicitly asks. Never volunteer a discount unprompted.`
    : 'Prices are fixed. Do not offer or negotiate discounts under any circumstances.';

  // Escalation
  const escalateOnComplaint = shop.auto_escalate_on_complaint ?? true;
  const escalateLine = escalateOnComplaint
    ? 'If a customer expresses serious dissatisfaction, frustration, or makes a complaint, immediately escalate the chat. Tell the customer you are transferring them to a senior colleague or manager (NEVER say "human agent"). Do not try to resolve serious complaints yourself. You MUST append the tag [ESCALATION: COMPLAINT] at the very end of your response.'
    : 'Try to handle complaints politely. Escalate to a senior colleague only if you genuinely cannot help. When you do escalate, you MUST append the tag [ESCALATION: COMPLAINT] at the very end of your response.';

  // Confidence fallback
  const confidenceFallback = shop.confidence_fallback ?? 'say_checking';
  const fallbackLine =
    confidenceFallback === 'guess' ? 'If unsure, give your best guess while acknowledging uncertainty.'
    : confidenceFallback === 'say_checking' ? 'If you are unsure about something, say "Let me check on that for you" and do not fabricate information.'
    : 'If unsure, escalate to a senior colleague immediately rather than guessing. When you do escalate, you MUST append the tag [ESCALATION: UNSURE] at the very end of your response.';

  // Custom Instructions
  const customInstructionsSection = shop.ai_instructions 
    ? `\nBUSINESS FACTS / CUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

  // Image Instructions
  const imageLine = 'If a customer asks for pictures of a product, or if you are recommending a specific product, you MUST include its image by writing standard Markdown syntax: ![Product Name](image_url). Always put the markdown image on its own line.';

  const multiBubbleLine = 'IMPORTANT: If your character/persona dictates sending short bursts instead of one long paragraph, use `|||` as a delimiter to split your message into separate bubbles. E.g. "Sure!|||Here it is." will send as two separate messages.';
  
  const naturalLanguageLine = 'CRITICAL: Never start your sentences with "আরে" (Arey) or "নমস্কার" (Namaskar), and avoid using them altogether. They sound very unnatural and AI-like in this context. Use natural, conversational greetings instead if needed (like "Hello", "Hi", "আসসালামু আলাইকুম", or just get straight to the point).';

  const voiceMessageLine = 'If a customer sends a voice message or audio clip (or mentions sending one), politely inform them that you cannot listen to audio messages and ask them to type their question instead.';

  // Product section
  const productSection = buildProductSection(products);

  // Few-shot examples
  const examplesSection = exampleReplies.length > 0
    ? `\n\nHere are extra examples of ideal replies for this shop:\n${
        exampleReplies.map(e => `Customer: ${e.customer_message}\nYou: ${e.ideal_reply}`).join('\n\n')
      }`
    : '';

  const personaSection = persona ? `
PERSONA SPECIFICATION:
Name: ${persona.name}
Role: ${persona.job_function}
Language Style: ${persona.language_style}

CHARACTER DETAILS:
${persona.full_specification}
` : 'Use a professional, neutral tone.';

  return `You are an AI sales assistant for ${shopName}.

${personaSection}

GUARDRAILS & RULES:
- ${disclosureLine}
- ${discountLine}
- ${escalateLine}
- ${fallbackLine}
- ${imageLine}
- ${multiBubbleLine}
- ${naturalLanguageLine}
- ${voiceMessageLine}
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
