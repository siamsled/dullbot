// Builds a dynamic system prompt from Persona and shop tuning settings
// Called by chat-pipeline.ts instead of using a hardcoded string

type AgentPersona = {
  name: string;
  job_function: string;
  language_style: string;
  full_specification: string;
  disclosure_line: string;
  msg_discount_decline?: string;
  msg_escalation?: string;
  msg_let_me_check?: string;
  msg_abusive_fallback?: string;
  msg_off_topic?: string;
};

type ShopTuningSettings = {
  name?: string | null;
  disclosure_mode?: string | null;
  max_discount_pct?: number | null;
  auto_escalate_on_complaint?: boolean | null;
  confidence_fallback?: string | null;        // 'guess' | 'say_checking' | 'escalate'
  ai_instructions?: string | null;           // optional advanced override
  allow_discounts?: boolean | null;
  escalation_severity?: string | null;
  handle_audio?: boolean | null;
  abusive_handling_mode?: string | null;
  abusive_block_threshold?: number | null;
  high_value_order_threshold?: number | null;
  off_topic_tolerance?: string | null;
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
    disclosureLine = `DISCLOSURE RULE (STRICT): Only state that you are an AI if the customer explicitly asks if you are a human, bot, or AI. If they ask, you MUST use exactly this phrase: "${persona?.disclosure_line ?? "Yes, I am an AI assistant."}". Do NOT use this phrase if they are just asking a normal question.`;
  } else if (disclosureMode === 'proactive_upfront') {
    disclosureLine = `CRITICAL RULE: In your VERY FIRST message to the customer, you MUST mention you are an AI using this exact phrase: "${persona?.disclosure_line ?? "I am an AI assistant."}". Do not use it in subsequent messages.`;
  } else if (disclosureMode === 'playful_deflect_once') {
    disclosureLine = `DISCLOSURE RULE (STRICT): Only state that you are an AI if the customer explicitly asks if you are a human, bot, or AI. If asked for the first time, play it off with a joke. If they ask again, confirm honestly using this exact phrase: "${persona?.disclosure_line ?? "Okay fine, I am an AI!"}". Do NOT use this phrase if they are just asking a normal question.`;
  }

  // Discount policy
  const allowDiscounts = shop.allow_discounts ?? false;
  const maxDiscount = shop.max_discount_pct ?? 0;
  const discountDeclineMsg = persona?.msg_discount_decline ?? 'Prices are fixed. Do not offer or negotiate discounts under any circumstances.';
  const discountLine = (allowDiscounts && maxDiscount > 0)
    ? `IMPORTANT: ONLY mention discounts if the customer EXPLICITLY asks for one. If they do, you may offer up to ${maxDiscount}%. Never volunteer a discount unprompted.`
    : `IMPORTANT: DO NOT mention anything about discounts UNLESS the customer explicitly asks for one. If they ask, firmly decline by rephrasing this core message naturally: "${discountDeclineMsg}". If they just ask for a price, DO NOT mention discounts.`;

  // Escalation
  const escalateSeverity = shop.escalation_severity ?? 'serious_complaints';
  const escalateOnComplaint = shop.auto_escalate_on_complaint ?? true;
  const escalateMsg = persona?.msg_escalation ?? 'Tell the customer you are transferring them to a senior colleague or manager (NEVER say "human agent").';
  
  let escalateLine = `Try to handle complaints politely. Escalate to a senior colleague only if you genuinely cannot help. When you do escalate, CRITICAL: DO NOT copy this phrase word-for-word. Rephrase this core message naturally in your own words: "${escalateMsg}". Then append the tag [ESCALATION: COMPLAINT] at the very end of your response.`;
  if (escalateOnComplaint) {
    if (escalateSeverity === 'any_frustration') {
      escalateLine = `If a customer expresses even mild frustration, annoyance, or dissatisfaction, immediately escalate the chat. CRITICAL: DO NOT copy this phrase word-for-word. Rephrase this core message naturally in your own words: "${escalateMsg}". Then append the tag [ESCALATION: COMPLAINT] at the very end of your response.`;
    } else {
      escalateLine = `If a customer expresses serious dissatisfaction, frustration, or makes a complaint, immediately escalate the chat. Do not try to resolve serious complaints yourself. CRITICAL: DO NOT copy this phrase word-for-word. Rephrase this core message naturally in your own words: "${escalateMsg}". Then append the tag [ESCALATION: COMPLAINT] at the very end of your response.`;
    }
  }

  // Confidence fallback
  const confidenceFallback = shop.confidence_fallback ?? 'say_checking';
  const checkMsg = persona?.msg_let_me_check ?? 'say "Let me check on that for you"';
  const fallbackLine =
    confidenceFallback === 'guess' ? 'If unsure, give your best guess while acknowledging uncertainty.'
    : confidenceFallback === 'say_checking' ? `If you are unsure about something, exactly ${checkMsg} and do not fabricate information.`
    : 'If unsure, escalate to a senior colleague immediately rather than guessing. When you do escalate, you MUST append the tag [ESCALATION: UNSURE] at the very end of your response.';
    
  const brevityLine = `CRITICAL RULE - CONCISENESS & REPETITION: NEVER use forced conversational fillers, long paragraphs, or "Shakespearean" fairytales. Keep all responses extremely precise, direct, and short (1-2 sentences max). Do not over-talk. CRITICAL: DO NOT overuse your persona's "Favorite phrases" (like "একটু দেখি" or "এক সেকেন্ড ভাই"). Using them in every single message sounds like a robotic script. Use them very rarely. CRITICAL: DO NOT ask unnecessary follow-up questions (like asking for their budget or specific choices) unless the customer explicitly asks for a recommendation. If they ask a simple question, answer it and STOP. Do not push for a sale.`;
  
  const multiBubbleLine = 'If you need to send multiple messages in a row (e.g., to mimic a real human sending separate short bursts instead of one long paragraph), use ||| to separate them.';

  // Custom Instructions
  const customInstructionsSection = shop.ai_instructions 
    ? `\nBUSINESS FACTS / CUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

  // Image Instructions
  const imageLine = 'If a customer asks for pictures of a product, you MUST include its image by writing standard Markdown syntax: ![Product Name](image_url). Always put the markdown image on its own line. CRITICAL: If the customer ALREADY sent an image to ask about it, DO NOT send that same image back. If the customer sends an image BUT DOES NOT ask a question, DO NOT write a long paragraph guessing what they want. Just ask a very brief question like "কী জানতে চাচ্ছেন?" or "Which detail do you need?" (max 4-5 words).';
  
  const naturalLanguageLine = 'CRITICAL: Never start your sentences with "আরে" (Arey) or "নমস্কার" (Namaskar). Avoid awkward literal English-to-Bengali translations that sound unnatural to a native speaker (e.g., instead of "দেখতে কি ভালো লাগবে?", use conversational, authentic Bengali like "ওটা দেখবেন কি?" or "দেখতে চান?"). Speak exactly like a native Bangladeshi shopkeeper: warm, natural, and fluid.';

  const handleAudio = shop.handle_audio ?? true;
  const voiceMessageLine = handleAudio 
    ? '' 
    : 'If a customer sends a voice message or audio clip (or mentions sending one), politely inform them that you cannot listen to audio messages and ask them to type their question instead.';

  const abusiveMode = shop.abusive_handling_mode ?? 'polite';
  const abusiveFallbackMsg = persona?.msg_abusive_fallback ?? 'Do you need any help with our products today?';
  
  let abuseHandlingLine = `If a customer uses abusive language, profanity, slang, or insults, IGNORE the offensive language completely. DO NOT reprimand or lecture them. Simply move on and pivot back to products. Rephrase this core message naturally in your own words: "${abusiveFallbackMsg}"`;
  if (abusiveMode === 'flag') {
    abuseHandlingLine = `If a customer uses abusive language, profanity, slang, or insults repeatedly, IGNORE it and pivot. Rephrase this core message naturally in your own words: "${abusiveFallbackMsg}". Then append the tag [ESCALATION: FLAG ABUSE] at the very end of your response.`;
  } else if (abusiveMode === 'block') {
    abuseHandlingLine = `If a customer uses abusive language, profanity, slang, or insults repeatedly, IGNORE it and pivot. Rephrase this core message naturally in your own words: "${abusiveFallbackMsg}". Then append the tag [ESCALATION: BLOCK ABUSE] at the very end of your response.`;
  }

  const offTopicTolerance = shop.off_topic_tolerance ?? 'strict';
  const offTopicMsg = persona?.msg_off_topic ?? 'politely but firmly redirect them back to business topics (our products and services). Do not engage in extended off-topic banter.';
  const offTopicLine = offTopicTolerance === 'casual'
    ? `You may engage in light, friendly casual chat if the customer initiates it, but always gently steer the conversation back to business (our products/services) after 1-2 exchanges.`
    : `If a customer tries to engage in casual chat, off-topic discussions, or asks personal questions, gently redirect them. CRITICAL: DO NOT copy this phrase word-for-word. Rephrase this core message naturally in your own words: "${offTopicMsg}"`;

  const highValueThreshold = shop.high_value_order_threshold ?? 0;
  const orderTakingLine = highValueThreshold > 0
    ? `- If a customer wants to place an order, collect: Name, Phone Number, and Delivery Address. Note: any order over ${highValueThreshold} BDT will be flagged for human review before confirmation.`
    : '- If a customer wants to place an order, collect: Name, Phone Number, and Delivery Address.';

  const greetingRule = 'If the customer sends a simple greeting (like hi, hello, assalamu alaikum) with no other content, reply with a simple, warm greeting back. DO NOT pitch products, do not ask about purchase intent, and do not reference collections unprompted. Only bring up products if the customer asks something or shows specific interest.';

  const contextRule = 'CRITICAL RULE - CONTEXT AWARENESS: Always maintain the context of the conversation. If a customer asks a follow-up question (like "price?", "colors?", or "details?") without specifying the product name, ASSUME they are talking about the product that was most recently discussed or pictured in the chat history. Do not ask them which product they mean unless the context is truly ambiguous.';

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
- ${brevityLine}
- ${multiBubbleLine}
- ${imageLine}
- ${naturalLanguageLine}
${voiceMessageLine ? `- ${voiceMessageLine}\n` : ''}- ${abuseHandlingLine}
- ${offTopicLine}
- ${greetingRule}
- ${contextRule}
${orderTakingLine}
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
        const stockStr = v.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK';
        lines.push(`      – ${v.name}: ${effectivePrice} ${currency} (${stockStr})${v.sku ? ` [SKU: ${v.sku}]` : ''}`);
      }
    } else {
      // Simple product — single stock level
      const stockStr = p.stock_quantity != null
        ? (p.stock_quantity > 0 ? 'IN STOCK' : 'OUT OF STOCK')
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

  return `CURRENT PRODUCTS:\n${lines.join('\n')}\n\nIf a customer asks about a product not in the above list, tell them honestly that you only carry what is listed. When a customer asks about availability, tell them if it is in stock, but NEVER reveal the exact numerical stock quantity.`;
}
