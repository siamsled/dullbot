// Test Imran persona and all 10 personas against a 400 token cap
// Run BEFORE implementing the cap to get baseline output token counts

import { supabaseAdmin } from '../src/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '../src/lib/prompt-builder';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PERSONA_TEST_PROMPTS: Record<string, string[]> = {
  'Shuvo "Bhai" Ahmed': ['dam koto?', 'jacket ache?', 'delivery time koto?', 'kono discount diben?'],
  'Rumi Apa': ['এই শাড়িটা কেমন হবে?', 'দাম কত?', 'ডেলিভারি কতদিনে হবে?', 'রিটার্ন পলিসি কি?'],
  'Imran': ['এই phone ta ki ভালো? আমাকে বিস্তারিত বলো processor থেকে শুরু করে সব কিছু', 'RAM কতটুকু লাগে gaming এর জন্য? আর কেন?', 'কোনটা best value?'],
  'Biplob Uncle': ['শেষ দাম?', 'পাইকারি কিনলে কত?'],
  'Nila': ['stock ase?', 'delivery?', 'price?'],
  'Tanim "Problem Solver"': ['পণ্য নষ্ট পাইছি', 'ডেলিভারি আসেনি তিনদিন হয়ে গেছে'],
  'Mehnaz': ['কোনটা ভালো স্কিনের জন্য?', 'oily skin এর জন্য কি নেব?'],
  'Jisan': ['এখন order দিলে কতক্ষণে পাব?', 'আজ পাব?'],
  'Sharmin Apa': ['কাল সকালে cake লাগবে', 'কাস্টম cake হয়?'],
  'Rakib': ['what are the technical specifications?', 'why is this so expensive compared to competitors?'],
};

async function testPersona(personaName: string, prompts: string[]) {
  const { data: persona } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('name', personaName)
    .single();

  if (!persona) {
    console.log(`  [SKIP] Persona not found: ${personaName}`);
    return;
  }

  const shopSettings = {
    name: 'Test Shop',
    disclosure_mode: 'reactive_honest',
    max_discount_pct: 0,
    auto_escalate_on_complaint: false,
    confidence_fallback: 'say_checking',
    ai_instructions: null,
  };

  const systemPrompt = buildSystemPrompt(shopSettings, persona, [], []);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: systemPrompt,
  });

  console.log(`\n--- ${personaName} ---`);

  for (const prompt of prompts) {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400 },
    });
    const text = result.response.text();
    const tokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;
    const truncated = !text.endsWith('.') && !text.endsWith('।') && !text.endsWith('?') && !text.endsWith('!') && !text.endsWith('।') && tokens >= 390;
    console.log(`  Q: "${prompt}"`);
    console.log(`  A: "${text.trim()}"`);
    console.log(`  Tokens: ${tokens} | Truncated: ${truncated ? 'POSSIBLY YES ⚠️' : 'No ✓'}`);
  }
}

async function main() {
  for (const [personaName, prompts] of Object.entries(PERSONA_TEST_PROMPTS)) {
    await testPersona(personaName, prompts);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
