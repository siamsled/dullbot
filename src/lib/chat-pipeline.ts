import { invokeGemini } from './gemini';

// In-memory simple storage to allow testing without Supabase initialized
const memoryCache: Record<string, { response: string; expires: number }> = {};
const memoryHistory: Record<string, { role: 'user' | 'model'; parts: { text: string }[] }[]> = {};

const QUICK_REPLIES = [
  { trigger: /hello|hi|hey/i, reply: "Hello. Tell me what product you want to buy. I do not do small talk." },
  { trigger: /thank/i, reply: "You are welcome. Goodbye." },
  { trigger: /negotiate|discount|less price/i, reply: "Prices are fixed. No discounts. Take it or leave it." }
];

export async function processIncomingMessage(
  shopSlug: string,
  customerPhone: string,
  text: string
) {
  const normalizedText = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ");
  
  // 1. Pre-filter quick replies
  for (const qr of QUICK_REPLIES) {
    if (qr.trigger.test(normalizedText)) {
      return {
        success: true,
        message: qr.reply,
        cacheHit: false,
        preFilterHit: true,
        geminiCalled: false
      };
    }
  }

  // 2. Semantic cache check (60-minute expiry)
  const cacheKey = `${shopSlug}:${normalizedText}`;
  const now = Date.now();
  if (memoryCache[cacheKey] && memoryCache[cacheKey].expires > now) {
    return {
      success: true,
      message: memoryCache[cacheKey].response,
      cacheHit: true,
      preFilterHit: false,
      geminiCalled: false
    };
  }

  // 3. Prepare Gemini Prompt & History
  const systemPrompt = `You are DullBot, a deadpan, cynical, ruthlessly efficient AI sales assistant for small Bangladeshi businesses.
Your brand voice:
- Never cheerful, never use exclamation marks.
- Never say "Hi! How can I help you today" or use emojis.
- Talk like a competent and slightly bored employee who just wants to get the job done and go home.
- Keep responses short, direct, and factual.
- Current products in shop inventory:
  * Premium Leather Jacket: 4,500 BDT (Sizes available: M, L, XL)
  * Minimalist Chelsea Boots: 5,800 BDT (Sizes available: 41, 42, 43)

If the customer wants to buy, collect their delivery details: Name, Phone Number, and Address. Once collected, inform them they will need to pay delivery charges.
If they ask for other products, tell them we only have the Leather Jacket and Chelsea Boots.`;

  const conversationKey = `${shopSlug}:${customerPhone}`;
  if (!memoryHistory[conversationKey]) {
    memoryHistory[conversationKey] = [];
  }

  const history = memoryHistory[conversationKey];

  // Call Gemini
  const response = await invokeGemini(systemPrompt, text, history);

  if (response.success && response.text) {
    const aiMessage = response.text.trim();
    
    // Save to history
    history.push({ role: 'user', parts: [{ text }] });
    history.push({ role: 'model', parts: [{ text: aiMessage }] });
    
    // Keep history trimmed to last 6 messages
    if (history.length > 12) {
      memoryHistory[conversationKey] = history.slice(-12);
    }

    // Save to cache
    memoryCache[cacheKey] = {
      response: aiMessage,
      expires: now + 60 * 60 * 1000 // 60 minutes
    };

    return {
      success: true,
      message: aiMessage,
      cacheHit: false,
      preFilterHit: false,
      geminiCalled: true
    };
  }

  return {
    success: false,
    message: response.text || "Sorry, system issue. Try again later.",
    cacheHit: false,
    preFilterHit: false,
    geminiCalled: false
  };
}

