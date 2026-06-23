import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with the platform API key
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenerativeAI(apiKey || 'MOCK_KEY');
};

export async function invokeGemini(
  systemPrompt: string, 
  customerMessage: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt 
  });


  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(customerMessage);
    
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
      text: "Something went wrong on my end. I'm taking a break.",
    };
  }
}

