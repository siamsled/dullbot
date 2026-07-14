import { testPersonaResponse } from './src/app/dashboard/ai-tuning/actions';
import { supabaseAdmin } from './src/lib/supabase-admin';

async function runTest() {
  const { data: personas } = await supabaseAdmin.from('agent_personas').select('id, name').limit(1);
  if (!personas || personas.length === 0) return;
  const p = personas[0];
  
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

  const testMessage = "posh leather jackets khujtesilam. apnader kache valo leather jacket ache ki?";
  
  console.log("Testing raw Gemini output for multi-product query...\n");
  
  const res = await testPersonaResponse(p.id, testMessage, shopTuningState as any);
  console.log(`--- ${p.name} ---`);
  console.log(res.text);
  console.log("\nRAW GEMINI OUTPUT (if available):", (res as any).rawOutput || res.text);
}

runTest();
