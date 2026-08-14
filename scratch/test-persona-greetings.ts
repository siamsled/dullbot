import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';
import { invokeGemini } from '../src/lib/gemini';

async function testPersonaGreetings() {
  console.log('=== TESTING SALAM & GREETING LOGIC ===\n');

  const { data: personas, error: pErr } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('active', true)
    .in('name', ['Rumi Apa', 'Shuvo "Bhai" Ahmed', 'Sharmin Apa', 'Nila', 'Biplob Uncle']);

  if (pErr || !personas?.length) {
    throw new Error('Failed to load personas');
  }

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', 'dull-store')
    .single();

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('shop_id', shop?.id || '');

  for (const persona of personas) {
    console.log(`\n========================================`);
    console.log(`PERSONA: ${persona.name}`);
    console.log(`========================================`);

    const systemPrompt = buildSystemPrompt(
      {
        name: shop?.name || 'Dull Store',
        disclosure_mode: 'reactive_honest',
        max_discount_pct: 0,
        auto_escalate_on_complaint: true,
        confidence_fallback: 'say_checking',
        ai_instructions: '',
        allow_discounts: false,
        escalation_severity: 'serious_complaints',
        handle_audio: true,
        abusive_handling_mode: 'polite',
        abusive_block_threshold: 3,
        high_value_order_threshold: 0,
        off_topic_tolerance: 'strict',
      },
      persona,
      products || [],
      []
    );

    // Test 1: Customer says "hi"
    console.log('\n--- Case 1: Customer says "hi" (MUST NOT say Walaikum Assalam) ---');
    const resHi = await invokeGemini(systemPrompt, 'hi', [], null);
    console.log(`Reply to "hi":\n"${resHi.text}"`);

    // Test 2: Customer says "আসসালামু আলাইকুম"
    console.log('\n--- Case 2: Customer says "আসসালামু আলাইকুম" (MUST say Walaikum Assalam) ---');
    const resSalam = await invokeGemini(systemPrompt, 'আসসালামু আলাইকুম', [], null);
    console.log(`Reply to "আসসালামু আলাইকুম":\n"${resSalam.text}"`);
  }

  console.log('\n=== GREETING & SALAM TEST FINISHED ===');
}

testPersonaGreetings().catch(console.error);
