import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';
import { invokeGemini } from '../src/lib/gemini';

async function testBiplob() {
  const { data: persona } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('id', '59e4eaa3-1e1d-484d-9d94-74d6226a9e3b')
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

  console.log('--- Testing Biplob on "hi" ---');
  const resHi = await invokeGemini(systemPrompt, 'hi', [], null);
  console.log('Biplob Reply:', resHi.text);

  console.log('\n--- Testing Biplob on "আসসালামু আলাইকুম" ---');
  const resSalam = await invokeGemini(systemPrompt, 'আসসালামু আলাইকুম', [], null);
  console.log('Biplob Reply:', resSalam.text);
}

testBiplob().catch(console.error);
