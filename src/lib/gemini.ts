import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAICacheManager } from '@google/generative-ai/server';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'MOCK_KEY');
const cacheManager = new GoogleAICacheManager(apiKey || 'MOCK_KEY');

export async function createPromptCache(systemPrompt: string): Promise<{ name: string; expiresAt: string } | null> {
  try {
    const ttlSeconds = 3600; // 1 hour
    const cache = await cacheManager.create({
      model: 'models/gemini-3.5-flash',
      systemInstruction: systemPrompt,
      ttlSeconds,
      contents: [{ role: 'user', parts: [{ text: 'Initialize context.' }] }]
    });
    return {
      name: cache.name as string,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Failed to create Gemini cache:", error);
    return null;
  }
}

export async function invokeGemini(
  systemPrompt: string, 
  customerMessage: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  promptCacheRef?: string | null
) {
  console.log("=== GEMINI INVOCATION ===");
  if (promptCacheRef) {
    console.log(`Using Cache: ${promptCacheRef}`);
  } else {
    console.log("SYSTEM INSTRUCTION:");
    console.log(systemPrompt);
  }
  console.log("=========================");

  let model;
  if (promptCacheRef) {
    try {
      model = genAI.getGenerativeModelFromCachedContent({ name: promptCacheRef } as any);
    } catch (e) {
      console.error("Failed to load cached content, falling back to full prompt:", e);
      model = genAI.getGenerativeModel({ 
        model: 'gemini-3.5-flash',
        systemInstruction: systemPrompt 
      });
    }
  } else {
    model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      systemInstruction: systemPrompt 
    });
  }

  try {
    const chat = model.startChat({
      history,
      generationConfig: { maxOutputTokens: 400 },
    });
    const result = await chat.sendMessage(customerMessage);
    const usage = result.response.usageMetadata;

    return {
      success: true,
      text: result.response.text(),
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  } catch (error: any) {
    console.error("Gemini invocation failed:", error);
    
    let cleanError = "An unknown error occurred.";
    if (error?.message) {
      if (error.message.includes('API key not valid')) {
        cleanError = "Invalid Gemini API Key. Please update your .env file.";
      } else if (error.message.toLowerCase().includes('quota')) {
        cleanError = "Gemini API Quota Exceeded. Please check your plan and billing details.";
      } else {
        cleanError = error.message.split('[{')[0].trim() || "Gemini API error.";
      }
    }

    if (error?.status === 429 || error?.message?.includes('429')) {
      return {
        success: false,
        isRateLimit: true,
        text: "Give me a second, let me check that for you.",
        inputTokens: 0,
        outputTokens: 0,
        error: cleanError
      };
    }
    return {
      success: false,
      isRateLimit: false,
      text: "Something went wrong on my end. I'm taking a break.",
      inputTokens: 0,
      outputTokens: 0,
      error: cleanError
    };
  }
}
