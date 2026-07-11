import { processIncomingMessage } from '../src/lib/chat-pipeline';
import { supabaseAdmin } from '../src/lib/supabase-admin';
import { createPromptCache } from '../src/lib/gemini';

async function run() {
  const shopSlug = 'dull-store';
  const customerPhone = '+8801912345678';
  
  console.log("Processing incoming message...");
  const result = await processIncomingMessage(shopSlug, customerPhone, "eta koto din tikbe?");
  console.log("Result:", result);
}

run();
