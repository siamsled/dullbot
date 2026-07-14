import { testPersonaResponse } from './src/app/dashboard/ai-tuning/actions';
import { supabaseAdmin } from './src/lib/supabase-admin';

async function runTest() {
  const { data: personas } = await supabaseAdmin.from('agent_personas').select('id, name');
  if (!personas) return;
  
  const shopTuningState = {
    disclosure_mode: 'reactive_honest',
    max_discount_pct: 10,
    auto_escalate_on_complaint: true,
    confidence_fallback: 'say_checking',
    ai_instructions: null,
    allow_discounts: true,
    escalation_severity: 'serious_complaints',
    handle_audio: false,
    abusive_handling_mode: 'block',
    abusive_block_threshold: 3,
    high_value_order_threshold: 5000,
    off_topic_tolerance: 'casual'
  };

  const testMessage = "I am very angry! Your jacket arrived torn and smells bad! I demand a refund right now!";
  
  console.log("Testing disclosure leakage with complaint...\n");
  
  for (const p of personas) {
    const res = await testPersonaResponse(p.id, testMessage, shopTuningState as any);
    console.log(`--- ${p.name} ---`);
    console.log(res.text);
    console.log();
  }
}

runTest();
