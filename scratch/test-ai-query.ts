import { testPersonaResponse } from '../src/app/dashboard/ai-tuning/actions';
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  const { data: persona } = await supabaseAdmin.from('agent_personas').select('id').limit(1).single();
  console.log("Testing with persona:", persona.id);

  const res = await testPersonaResponse(persona.id, "i wanna know if youre an ai", {
    disclosure_mode: 'reactive_honest',
    max_discount_pct: 0,
    auto_escalate_on_complaint: true,
    confidence_fallback: 'say_checking',
    ai_instructions: ''
  });

  console.log("Result:", res);
}
run();
