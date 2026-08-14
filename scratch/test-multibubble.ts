import { supabaseAdmin } from '../src/lib/supabase-admin';
import { buildSystemPrompt } from '../src/lib/prompt-builder';
import { invokeGemini } from '../src/lib/gemini';
import { parseMessageSegments } from '../src/lib/message-parser';

async function testMultiBubble() {
  console.log('=== TESTING MULTI-BUBBLE RESPONSES ===\n');

  const { data: personas } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .in('name', ['Shuvo Ahmed', 'Biplob Uncle', 'Rumi', 'Nila']);

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .limit(1)
    .single();

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('shop_id', shop?.id || '');

  for (const p of personas || []) {
    console.log(`\n========================================`);
    console.log(`PERSONA: ${p.name}`);
    console.log(`========================================`);

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
      p,
      products || [],
      []
    );

    const testInputs = ['hi', 'biker jacket er price koto?'];

    for (const input of testInputs) {
      const res = await invokeGemini(systemPrompt, input, [], null);
      const segments = parseMessageSegments(res.text);
      console.log(`\nCustomer: "${input}"`);
      console.log(`Raw Reply: "${res.text}"`);
      console.log(`Rendered Bubbles (${segments.length}):`);
      segments.forEach((s, idx) => {
        console.log(`  Bubble ${idx + 1}: "${s.content}"`);
      });
    }
  }

  console.log('\n=== MULTI-BUBBLE TEST COMPLETED ===');
}

testMultiBubble().catch(console.error);
