import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

function buildProductSection(products: any[]): string {
  if (!products || products.length === 0) {
    return 'PRODUCTS: No products are currently listed in the catalogue.';
  }
  const lines: string[] = [];
  for (const p of products) {
    const currency = p.currency ?? 'BDT';
    if (p.variants && p.variants.length > 0) {
      lines.push(`  • ${p.name}${p.description ? ` — ${p.description}` : ''}${p.image_url ? ` (Image URL: ${p.image_url})` : ''}`);
      for (const v of p.variants) {
        const effectivePrice = v.price_override ?? p.price;
        const stockStr = v.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK';
        lines.push(`      – ${v.name}: ${effectivePrice} ${currency} (${stockStr})${v.sku ? ` [SKU: ${v.sku}]` : ''}`);
      }
    } else {
      const stockStr = p.stock_quantity != null ? (p.stock_quantity > 0 ? 'IN STOCK' : 'OUT OF STOCK') : '';
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

async function analyze() {
  const shopId = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';
  const conversationId = 'f8b18b05-a382-4c8a-bdfd-7b4909fff979';

  const { data: shop } = await supabaseAdmin.from('shops').select('*').eq('id', shopId).single();
  const { data: persona } = await supabaseAdmin.from('agent_personas').select('*').eq('id', shop.persona_id).single();
  const { data: products } = await supabaseAdmin.from('products').select('*, variants(*)').eq('shop_id', shopId).eq('is_active', true).eq('draft', false).gt('stock_quantity', 0);
  const { data: exampleReplies } = await supabaseAdmin.from('example_replies').select('*').eq('shop_id', shopId).limit(10);
  
  const { data: messages } = await supabaseAdmin.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(12);
  const historyStr = (messages || []).reverse().map(m => `${m.sender === 'bot' ? 'Bot' : 'Customer'}: ${m.content}`).join('\n\n');

  console.log("=== TOKEN BREAKDOWN ===");
  
  const baseLine = `You are an AI sales assistant for ${shop.name ?? 'this shop'}.`;
  
  const personaSection = persona ? `
PERSONA SPECIFICATION:
Name: ${persona.name}
Role: ${persona.job_function}
Language Style: ${persona.language_style}

CHARACTER DETAILS:
${persona.full_specification}
` : 'Use a professional, neutral tone.';

  const guardrailsSection = `GUARDRAILS & RULES:
- If the customer explicitly asks if you are an AI, confirm honestly using this line: "${persona?.disclosure_line ?? "Yes, I am an AI assistant."}"
- Prices are fixed. Do not offer or negotiate discounts under any circumstances.
- If a customer expresses serious dissatisfaction, frustration, or makes a complaint, immediately escalate the chat. Tell the customer you are transferring them to a senior colleague or manager (NEVER say "human agent"). Do not try to resolve serious complaints yourself. You MUST append the tag [ESCALATION: COMPLAINT] at the very end of your response.
- If you are unsure about something, say "Let me check on that for you" and do not fabricate information.
- If a customer asks for pictures of a product, or if you are recommending a specific product, you MUST include its image by writing standard Markdown syntax: ![Product Name](image_url). Always put the markdown image on its own line.
- CRITICAL: Never start your sentences with "আরে" (Arey) or "নমস্কার" (Namaskar), and avoid using them altogether. They sound very unnatural and AI-like in this context. Use natural, conversational greetings instead if needed (like "Hello", "Hi", "আসসালামু আলাইকুম", or just get straight to the point).
- If a customer sends a voice message or audio clip (or mentions sending one), politely inform them that you cannot listen to audio messages and ask them to type their question instead.
- If a customer uses abusive language, profanity, slang, or insults (e.g., in English or Bengali), DO NOT get defensive, DO NOT argue back, and NEVER reprimand or lecture them (e.g., never say "this is not a place to joke"). Maintain a strictly polite, professional, and helpful tone. Ignore the insult entirely and focus only on resolving their core complaint or request.
- If a customer wants to place an order, collect: Name, Phone Number, and Delivery Address.`;

  const customInstructionsSection = shop.ai_instructions 
    ? `\nBUSINESS FACTS / CUSTOM INSTRUCTIONS:\n${shop.ai_instructions}\n`
    : '';

  const inventorySection = buildProductSection(products || []);
  
  const examplesSection = (exampleReplies || []).length > 0
    ? `\n\nHere are extra examples of ideal replies for this shop:\n${
        (exampleReplies || []).map(e => `Customer: ${e.customer_message}\nYou: ${e.ideal_reply}`).join('\n\n')
      }`
    : '';

  const historySection = `Here is the recent chat history:\n${historyStr}`;
  const currentMessage = "Customer: Can you help me?"; // Since we are only analyzing the historical prompt, not an incoming one

  const count = async (text: string) => {
    if (!text || text.trim() === '') return 0;
    const res = await model.countTokens(text);
    return res.totalTokens;
  };

  const c_base = await count(baseLine);
  const c_persona = await count(personaSection);
  const c_guard = await count(guardrailsSection);
  const c_custom = await count(customInstructionsSection);
  const c_inv = await count(inventorySection);
  const c_examples = await count(examplesSection);
  const c_hist = await count(historySection);
  const c_curr = await count(currentMessage);
  
  const fullPrompt = buildSystemPrompt(shop, persona, products || [], exampleReplies || []);
  const c_total_sys = await count(fullPrompt);

  const breakdownContent = `
# Gemini Prompt Token Analysis

## Token Breakdown

| Section | Tokens | Description |
|---------|--------|-------------|
| **Base Setup** | ${c_base} | Initial AI identity and shop name. |
| **Persona Details** | ${c_persona} | AI persona character, role, style, and instructions. |
| **Guardrails & Rules** | ${c_guard} | Standard safety and platform rules. |
| **Custom Knowledge** | ${c_custom} | Shop-specific custom instructions. |
| **Inventory Section** | ${c_inv} | Active product catalog with variants. |
| **Examples Section** | ${c_examples} | Custom few-shot Q&A pairs for the shop. |
| **Chat History** | ${c_hist} | Last 12 messages of conversation context. |
| **Current Message** | ${c_curr} | New incoming message. |
| **TOTAL SYSTEM PROMPT** | **${c_total_sys}** | (Calculated by SDK on full combined string) |
| **ESTIMATED TOTAL** | **${c_total_sys + c_hist + c_curr}** | Total prompt sent to Gemini |

---

## Actual Assembled Sections

### [BASE SETUP]
${baseLine}

### [PERSONA DETAILS]
${personaSection}

### [GUARDRAILS & RULES]
${guardrailsSection}

### [CUSTOM KNOWLEDGE]
${customInstructionsSection}

### [INVENTORY SECTION]
${inventorySection}

### [EXAMPLES SECTION]
${examplesSection}

### [CHAT HISTORY]
${historySection}
`;

  const fs = require('fs');
  fs.writeFileSync('token_analysis_results.md', breakdownContent);
  console.log("Analysis complete. Saved to token_analysis_results.md");
}

analyze().catch(console.error);
