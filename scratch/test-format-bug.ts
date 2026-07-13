import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

async function run() {
  const shopId = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';
  const { data: shop } = await supabaseAdmin.from('shops').select('*').eq('id', shopId).single();
  const { data: persona } = await supabaseAdmin.from('agent_personas').select('*').eq('id', shop.persona_id).single();
  const { data: products } = await supabaseAdmin.from('products').select('*').eq('shop_id', shopId).eq('is_active', true).eq('draft', false).gt('stock_quantity', 0);
  
  const systemPrompt = buildSystemPrompt(shop, persona, products || [], []);
  
  let prompt = systemPrompt + "\n\nCUSTOMER DETAILS: Name: Customer, Gender: unknown\n\nHere is the recent chat history:\nCustomer: brown ki ache\n\nPlease generate your reply directly without any prefixes (do not output 'bot:' or your name).";
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{text: prompt}] }],
    generationConfig: { maxOutputTokens: 400 },
  });
  
  let aiResponseText = result.response.text().trim();
  console.log("=== RAW GEMINI OUTPUT ===");
  console.log(aiResponseText);
  console.log("=========================");
  
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;
  let messengerText = aiResponseText.replace(markdownImageRegex, '').trim();
  messengerText = messengerText.replace(/\n{3,}/g, '\n\n');
  
  console.log("=== FINAL MESSENGER TEXT ===");
  console.log(messengerText);
  console.log("============================");
}
run();
