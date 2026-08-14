import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';
import { invokeGemini } from '../src/lib/gemini';

async function testShuvo() {
  console.log('=== TESTING SHUVO EMOJI RESTRAINT ===\n');

  const { data: persona } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('id', 'd66d5da5-084b-4711-94b4-83f0e9b07925')
    .single();

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .limit(1)
    .single();

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('shop_id', shop?.id || '');

  const systemPrompt = buildSystemPrompt(
    {
      name: shop?.name || 'Jacket Shaket',
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

  const testQueries = [
    'hi',
    'biker jacket er price koto?',
    'delivery charge koto?',
    'leather ta ki genuine?',
    'order korbo kivabe?'
  ];

  for (const q of testQueries) {
    const res = await invokeGemini(systemPrompt, q, [], null);
    console.log(`User: "${q}"`);
    console.log(`Shuvo: "${res.text}"`);
    console.log('---------------------------------');
  }

  console.log('\n=== SHUVO TEST COMPLETED ===');
}

testShuvo().catch(console.error);
