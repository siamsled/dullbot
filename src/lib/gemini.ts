import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with shared pool key
const sharedGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function invokeGemini(
  shopId: string, 
  keyMode: 'shared_pool' | 'byo_key', 
  encryptedKey: string | null, 
  systemPrompt: string, 
  customerMessage: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
) {
  let genAI = sharedGenAI;
  
  if (keyMode === 'byo_key' && encryptedKey) {
    // In a real app, we would decrypt the key here
    const decryptedKey = encryptedKey; 
    genAI = new GoogleGenerativeAI(decryptedKey);
  }

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt 
  });

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(customerMessage);
    
    // In a real app, we should increment the gemini_usage_log for this shopId here
    // Supabase RPC or direct DB update logic to increment usage counter goes here.

    return {
      success: true,
      text: result.response.text(),
    };
  } catch (error: any) {
    console.error("Gemini invocation failed:", error);
    if (error?.status === 429 || error?.message?.includes('429')) {
      return {
        success: false,
        isRateLimit: true,
        text: "Give me a second, let me check that for you.",
      };
    }
    return {
      success: false,
      isRateLimit: false,
      text: "Something went wrong on my end.",
    };
  }
}
