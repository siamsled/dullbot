import { testPersonaResponse } from '../src/app/dashboard/ai-tuning/actions';

async function run() {
  const res = await testPersonaResponse('dull-store', 'hi', {
    disclosure_mode: 'reactive_honest',
    max_discount_pct: 0,
    auto_escalate_on_complaint: true,
    confidence_fallback: 'say_checking',
    ai_instructions: ''
  });
  console.log('Result:', res);
}
run();
