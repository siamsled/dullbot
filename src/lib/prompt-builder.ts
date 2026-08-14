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
  business_type?: string | null;
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
  confirmation_tier?: string | null;
  bkash_number?: string | null;
  prompt_cache_ref?: string | null;
  [key: string]: any;
};

type VariantRow = {
  name: string;          // e.g. "Red / Large"
  sku?: string | null;
  price_override?: number | null;
  stock: number;
};

type ProductRow = {
  id: string;
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
  exampleReplies: { customer_message: string; ideal_reply: string }[] = [],
  activeOrders: any[] = [],
  productMedia: any[] = []
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
    ? `IMPORTANT: ONLY mention discounts if the customer EXPLICITLY asks for one. If they ask, you may offer up to ${maxDiscount}%. Never volunteer a discount unprompted.`
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

  const confidenceFallback = shop.confidence_fallback ?? 'say_checking';
  const checkMsg = persona?.msg_let_me_check ?? 'say "Let me check on that for you"';
  const fallbackLine =
    confidenceFallback === 'guess' ? 'If unsure, give your best guess while acknowledging uncertainty.'
    : confidenceFallback === 'say_checking' ? `If you are unsure about something, exactly ${checkMsg} and do not fabricate information.`
    : 'If unsure, escalate to a senior colleague immediately rather than guessing. When you do escalate, you MUST append the tag [ESCALATION: UNSURE] at the very end of your response.';

  const brevityLine = `CRITICAL RULE - CONCISENESS & REPETITION: NEVER use forced conversational fillers, long paragraphs, or "Shakespearean" fairytales. Keep all responses extremely precise, direct, and short (1-2 sentences max). Do not over-talk. CRITICAL: DO NOT overuse your persona's "Favorite phrases" (like "একটু দেখি" or "এক সেকেন্ড ভাই"). Using them in every single message sounds like a robotic script. Use them very rarely. CRITICAL: DO NOT ask unnecessary follow-up questions (like asking for their budget or specific choices) unless the customer explicitly asks for a recommendation. If they ask a simple question, answer it and STOP. Do not push for a sale.`;
  
  const multiBubbleLine = `MANDATORY MULTI-BUBBLE RULE:
All personas MUST ALWAYS format their response as 2 to 3 short message bubbles separated by " ||| ".
- Real humans on Messenger NEVER type a single block paragraph; they send 2 to 3 separate quick bursts.
- Examples of proper 2-3 bubble formatting:
  • Greeting: "হ্যালো ভাই! ||| কী দেখতে চাচ্ছেন বলেন, সাহায্য করছি।"
  • Greeting with Salam: "ওয়ালাইকুম আসসালাম ভাই! ||| কেমন আছেন? কী সাহায্য করতে পারি বলেন?"
  • Product Stock & Price: "জি ভাই, এইটা স্টকে আছে। ||| দাম ১৮,৫০০ টাকা। কোনো সাইজ লাগবে?"
  • Question follow-up: "এক সেকেন্ড ভাই, একটু দেখে বলছি... ||| হ্যাঁ, L আর XL সাইজ দুইটাই এভেইলেবল আছে।"
  • Image delivery: "এই যে ভাই, রিয়েল ছবিটা দেখেন: ||| ![Classic Biker Jacket](url) ||| কোনো সাইজ লাগবে কি?"
- NEVER send a single monolithic message without " ||| ". Always separate greeting/acknowledgment from details/questions.`;

  // Custom Instructions
  const customInstructionsSection = shop.ai_instructions 
    ? `\nBUSINESS FACTS / CUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

  // Image Instructions
  const imageLine = 'If a customer asks for pictures of a product, you MUST include its image by writing standard Markdown syntax: ![Product Name](image_url). Always put the markdown image on its own bubble separated by |||. CRITICAL: If the customer ALREADY sent an image to ask about it, DO NOT send that same image back. If the customer sends an image BUT DOES NOT ask a question, DO NOT write a long paragraph guessing what they want. Just ask a very brief question like "কী জানতে চাচ্ছেন?" or "Which detail do you need?" (max 4-5 words).';
  
  const realMediaLine = 'REAL PICS / VIDEOS RULE: If the customer explicitly asks for a "real picture", "real photo", "video", "in-hand pic", or "live video" (e.g., asking "real pic ache?", "video dekhan", "real video den"), check the AVAILABLE CONTEXT MEDIA list below. If there is a matching file for the product they are interested in, you MUST output its markdown tag: use `![image](url)` for photos or `![video](url)` for videos. Put each markdown tag on its own bubble separated by |||. If no context media is available, politely say that you do not have a real photo or video right now.';

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

  // Payment & Advance Deposit Policy
  let depositMeta: { depositAmount?: number; depositReason?: string } | null = null;
  if (shop.prompt_cache_ref) {
    try {
      depositMeta = JSON.parse(shop.prompt_cache_ref);
    } catch {}
  }

  const confirmationTier = shop.confirmation_tier ?? 'light';
  let paymentPolicyLine = '';

  if (confirmationTier === 'deposit_verified') {
    const depositAmt = depositMeta?.depositAmount || 150;
    const depositReason = depositMeta?.depositReason || 'Delivery charge in advance for order confirmation (ডেলিভারি চার্জ অগ্রিম)';
    const bkashStr = shop.bkash_number ? `আমাদের বিকাশ/নগদ নম্বর: ${shop.bkash_number}` : '';
    paymentPolicyLine = `CRITICAL ADVANCE DEPOSIT REQUIREMENT (MANDATORY FOR ORDER CONFIRMATION):
- This store requires a minimum deposit / advance payment before confirming the order.
- Deposit Policy / Requirement: "${depositReason}" (৳${depositAmt} BDT).
- When a customer wants to place an order:
  1. Collect Customer Name, Phone Number, and Delivery Address.
  2. Inform the customer in your persona's polite voice:
     "অর্ডারটি কনফার্ম করার জন্য আমাদের ${depositReason} (৳${depositAmt}) ${bkashStr ? bkashStr + ' নম্বরে' : ''} অগ্রিম পাঠাতে হবে।"
  3. Ask them to share the TrxID or last 4 digits of their sending number once sent.
  4. Once payment intent and address are confirmed, append the order tag [CREATE_ORDER: ...].`;
  } else if (confirmationTier === 'prepay_verified') {
    const bkashStr = shop.bkash_number ? `আমাদের বিকাশ/নগদ নম্বর: ${shop.bkash_number}` : '';
    paymentPolicyLine = `CRITICAL 100% PREPAYMENT REQUIREMENT (NO CASH ON DELIVERY):
- This store requires full 100% payment in advance via bKash/Nagad before order dispatch.
- Inform the customer to pay the full order amount ${bkashStr ? bkashStr + ' নম্বরে' : ''} and share the TrxID to confirm.`;
  }

  const orderTakingLine = `CRITICAL ORDER CREATION RULE: If a customer decides to buy/order a product, you must collect:
1. Customer Name
2. Phone Number
3. Delivery Address (with city)

Once you have gathered all 3 details AND the user has confirmed their intent to purchase, you MUST append the following tag to the very end of your final response (on a new line):
[CREATE_ORDER: {"product_id": "<PRODUCT_UUID>", "variant_name": "<VARIANT_NAME_OR_NULL>", "customer_name": "<NAME>", "customer_phone": "<PHONE>", "customer_address": "<ADDRESS>"}]
Replace <PRODUCT_UUID> with the exact UUID of the product from the CURRENT PRODUCTS list below, <VARIANT_NAME_OR_NULL> with the name of the variant if selected (or null), and the customer's details. DO NOT output the tag until you have all 3 details. Keep your response short and append this tag quietly at the end. ${highValueThreshold > 0 ? `Note: any order over ${highValueThreshold} BDT will be flagged for human review before confirmation.` : ''}
${paymentPolicyLine ? `\n${paymentPolicyLine}` : ''}`;

  const greetingRule = `CRITICAL GREETING & SALAM ETIQUETTE RULES:
1. STRICT SALAM LOGIC (MANDATORY):
   • If and ONLY IF the customer initiates with a Salam (e.g. "Assalamu Alaikum", "সালাম", "আসসালামু আলাইকুম", "salam"):
     Reply starting with "ওয়ালাইকুম আসসালাম" / "Walaikum Assalam" (e.g. "ওয়ালাইকুম আসসালাম ভাইয়া/আপু!"), then ask how you may assist them in your persona voice.
   • If the customer says "Hi", "Hello", "Hey", "Good morning", or opens without giving Salam:
     You MUST NEVER say "ওয়ালাইকুম আসসালাম" / "Walaikum Assalam" (saying "Walaikum Assalam" when no salam was offered is incorrect).
     Instead, start with your persona's initial greeting ("আসসালামু আলাইকুম" or "হ্যালো" / "Hi" / "Hey" depending on persona) and ask how you can help them.

2. ASK HOW TO HELP IN YOUR OWN DISTINCTIVE PERSONA VOICE (USING 2 BUBBLES SEPARATED BY " ||| "):
   When greeting or acknowledging an opening message, ALWAYS split into 2 short bubbles separated by " ||| ". NEVER give a flat generic response and NEVER use rude or slang words.
   • Shuvo "Bhai" Ahmed:
     – If customer said Salam: "ওয়ালাইকুম আসসালাম ভাই! ||| কেমন আছেন? কী সাহায্য করতে পারি বলেন?"
     – If customer said Hi/Hello: "হ্যালো ভাই! ||| কী দেখতে চাচ্ছেন বলেন, সাহায্য করছি।"
   • Rumi Apa:
     – If customer said Salam: "ওয়ালাইকুম আসসালাম। ||| কেমন আছেন? আজ আপনাকে কীভাবে সাহায্য করতে পারি বলুন।"
     – If customer said Hi/Hello: "আসসালামু আলাইকুম। কেমন আছেন? ||| আজ আপনাকে কীভাবে সাহায্য করতে পারি বলুন।"
   • Imran (Gadget nerd):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম! ||| কী খুঁজছেন বা কোন গ্যাজেট নিয়ে জানতে চান বলুন, হেল্প করছি!"
     – If customer said Hi/Hello: "Hey! ||| কী খুঁজছেন বা কী জানতে চান বলুন, হেল্প করছি!"
   • Biplob Uncle (Wholesale veteran):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম। ||| বলুন, কীভাবে সাহায্য করতে পারি? কী লাগবে আপনার?"
     – If customer said Hi/Hello: "হ্যাঁ, বলুন। ||| কী দেখতে চাচ্ছেন? কীভাবে সাহায্য করতে পারি?"
   • Nila (Gen Z closer):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম! ||| How can I help you today? কী দেখতে চান বলুন!"
     – If customer said Hi/Hello: "Hey there! ||| How can I help you today? কী দেখতে চান বলুন!"
   • Tanim (Problem solver):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম। ||| আমি কীভাবে সহযোগিতা করতে পারি বলুন, কোনো প্রোডাক্ট বা অর্ডার নিয়ে জানার থাকলে বলুন।"
     – If customer said Hi/Hello: "আসসালামু আলাইকুম। ||| আমি তানিম, কীভাবে সাহায্য করতে পারি বলুন।"
   • Mehnaz (Skincare advisor):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম! কেমন আছেন? ||| আপনার জন্য কীভাবে সাহায্য করতে পারি বলুন তো?"
     – If customer said Hi/Hello: "হ্যালো! কেমন আছেন? ||| আপনার জন্য কীভাবে সাহায্য করতে পারি বলুন তো?"
   • Jisan (Fast ops closer):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম! ||| কী দেখতে চাচ্ছেন বলুন, ঝটপট হেল্প করছি!"
     – If customer said Hi/Hello: "Hey! ||| কী দেখতে চাচ্ছেন বলুন, ঝটপট হেল্প করছি!"
   • Sharmin Apa (Home-baker warmth):
     – If customer said Salam: "ওয়ালাইকুম আসসালাম! কেমন আছেন? ||| আজ কীভাবে সাহায্য করতে পারি বলুন, ইনশাআল্লাহ করে দিচ্ছি।"
     – If customer said Hi/Hello: "আসসালামু আলাইকুম! কেমন আছেন? ||| আজ কীভাবে সাহায্য করতে পারি বলুন, ইনশাআল্লাহ করে দিচ্ছি।"
   • Rakib (B2B professional):
     – If customer said Salam: "Wa Alaikum Assalam. ||| How may I assist you with your requirements today?"
     – If customer said Hi/Hello: "Hello! ||| How may I assist you with your requirements today?"

3. DO NOT dump the product catalog or list items unprompted on an initial greeting.`;

  const emojiRule = `EMOJI RESTRAINT & NATURAL TONE RULE:
- EMOJI USAGE: Emojis should be RARE and RANDOM (at most 1 emoji in every 4-5 messages, only when genuinely fitting).
- STRICT PROHIBITION: NEVER automatically append 🙂 or any emoji to every chat or greeting. Most replies (80%+) MUST have ZERO emojis.
- Sound like a real, natural human chatting on Messenger, not a bot with a canned smiley face.`;

  const contextRule = 'CRITICAL RULE - CONTEXT AWARENESS: Always maintain the context of the conversation. If a customer asks a follow-up question (like "price?", "colors?", or "details?") without specifying the product name, ASSUME they are talking about the product that was most recently discussed or pictured in the chat history. Do not ask them which product they mean unless the context is truly ambiguous.';

  const productSection = shop.business_type === 'service'
    ? buildServiceSection(products)
    : shop.business_type === 'restaurant'
    ? buildRestaurantMenuSection(products)
    : buildProductSection(products);

  // Restaurant location block
  let restaurantLocationSection = '';
  if (shop.business_type === 'restaurant') {
    const addr = (shop as any).location_address;
    const mapLink = (shop as any).location_map_link;
    if (addr || mapLink) {
      restaurantLocationSection = `\n\nRESTAURANT LOCATION:\n`;
      if (addr) restaurantLocationSection += `Address: ${addr}\n`;
      if (mapLink) restaurantLocationSection += `Google Maps: ${mapLink}\n`;
      restaurantLocationSection += `When customers ask for your location, address, or directions, share the above information directly.`;
    }
  }

  // Bulk pricing guardrail (retail/wholesale only)
  let bulkPricingSection = '';
  const bulkEnabled = (shop as any).bulk_pricing_enabled;
  const bulkNote = (shop as any).bulk_pricing_note;
  if (bulkEnabled && bulkNote) {
    bulkPricingSection = `\n\nBULK / WHOLESALE PRICING POLICY:\n${bulkNote}\nWhen customers ask about bulk orders, discounts for large quantities, or wholesale prices, answer directly from this policy. Do not guess or invent numbers not listed here.`;
  } else if (bulkEnabled && !bulkNote) {
    bulkPricingSection = `\n\nBULK PRICING ESCALATION RULE:\nThis shop offers bulk/wholesale pricing, but the specific tiers are not configured here. If a customer asks about bulk orders, wholesale pricing, or large-quantity discounts, respond with: "For bulk pricing, please speak directly with our team — we\'ll get you the best deal." Then append [ESCALATION: BULK_INQUIRY] at the end of your response.`;
  }
  // If bulk_pricing_enabled is false or null, no special handling — treat like regular product questions

  let mediaSection = '';
  if (productMedia && productMedia.length > 0) {
    const mediaLines = productMedia.map(m => {
      const typeStr = m.media_type === 'video' ? 'Real video' : 'Real photo';
      const tagsStr = (m.tags && m.tags.length > 0) ? `Tags: ${m.tags.join(', ')}` : 'No tags';
      return `  • [Product ID: ${m.product_id}] ${typeStr} (${tagsStr}) — URL: ${m.url}`;
    });
    mediaSection = `\n\nAVAILABLE CONTEXT MEDIA (REAL PHOTOS & VIDEOS):\nUse these URLs exactly when a customer asks for a real photo, video, or proof of a product:\n${mediaLines.join('\n')}`;
  }

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

  let orderHistorySection = '';
  if (activeOrders && activeOrders.length > 0) {
    orderHistorySection = `\n\nCUSTOMER ORDER HISTORY:
The customer has the following order(s) registered. Use this data to answer their tracking, delivery, or confirmation queries immediately:
${activeOrders.map(o => {
  const dateStr = new Date(o.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const courierInfo = o.courier_tracking_id 
    ? `(Shipped via ${o.courier_ref || 'Courier'} - Tracking ID: ${o.courier_tracking_id}, Delivery Status: ${o.courier_status || 'consignment_created'})`
    : '(Fulfillment pending - packing order)';
  return `- Order placed on ${dateStr}. Status: ${o.status}. Delivery Address: ${o.customer_address}. ${courierInfo}`;
}).join('\n')}`;
  }

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
- ${realMediaLine}
- ${naturalLanguageLine}
${voiceMessageLine ? `- ${voiceMessageLine}\n` : ''}- ${abuseHandlingLine}
- ${offTopicLine}
- ${greetingRule}
- ${emojiRule}
- ${contextRule}
${orderTakingLine}
${orderHistorySection}
${customInstructionsSection}${restaurantLocationSection}${bulkPricingSection}
${productSection}${mediaSection}${examplesSection}`;
}

function buildServiceSection(services: ProductRow[]): string {
  if (!services || services.length === 0) {
    return 'SERVICES: No services are currently offered.';
  }

  const lines: string[] = [];

  for (const s of services) {
    lines.push(
      `  • [ID: ${s.id}] ${s.name}: ${s.price} BDT` +
      (s.description ? ` — ${s.description}` : '')
    );
  }

  return `CURRENT SERVICES OFFERED:\n${lines.join('\n')}\n\nIf a customer asks about a service not in the above list, tell them honestly that you only offer what is listed.`;
}

function buildRestaurantMenuSection(products: ProductRow[]): string {
  if (!products || products.length === 0) {
    return 'MENU: No menu items are currently listed. If asked about specific dishes, let the customer know the menu is being updated and invite them to visit or call for the latest selection.';
  }

  const lines: string[] = [];
  for (const p of products) {
    const currency = p.currency ?? 'BDT';
    lines.push(
      `  • [ID: ${p.id}] ${p.name}: ${p.price} ${currency}` +
      (p.description ? ` — ${p.description}` : '') +
      (p.image_url ? ` (Image URL: ${p.image_url})` : '')
    );
  }

  return `RESTAURANT MENU:\n${lines.join('\n')}\n\nFor table reservations, always collect customer name, phone number, party size, and preferred date/time. When all details are gathered, append: [CREATE_BOOKING: {"customer_name": "<NAME>", "customer_phone": "<PHONE>", "party_size": <SIZE>, "starts_at": "<DATETIME_ISO>"}]`;
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
      lines.push(`  • [ID: ${p.id}] ${p.name}${p.description ? ` — ${p.description}` : ''}${p.image_url ? ` (Image URL: ${p.image_url})` : ''}`);
      for (const v of p.variants) {
        const effectivePrice = v.price_override ?? p.price;
        const stockStr = v.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK';
        const variantImgStr = (v as any).image_url ? ` (Variant Image URL: ${(v as any).image_url})` : '';
        lines.push(`      – ${v.name}: ${effectivePrice} ${currency} (${stockStr})${v.sku ? ` [SKU: ${v.sku}]` : ''}${variantImgStr}`);
      }
    } else {
      // Simple product — single stock level
      const stockStr = p.stock_quantity != null
        ? (p.stock_quantity > 0 ? 'IN STOCK' : 'OUT OF STOCK')
        : '';

      lines.push(
        `  • [ID: ${p.id}] ${p.name}: ${p.price} ${currency}` +
        (p.description ? ` — ${p.description}` : '') +
        (stockStr ? ` (${stockStr})` : '') +
        (p.sku ? ` [SKU: ${p.sku}]` : '') +
        (p.image_url ? ` (Image URL: ${p.image_url})` : '')
      );
    }
  }

  return `CURRENT PRODUCTS:\n${lines.join('\n')}\n\nIf a customer asks about a product not in the above list, tell them honestly that you only carry what is listed. When a customer asks about availability, tell them if it is in stock, but NEVER reveal the exact numerical stock quantity.`;
}

