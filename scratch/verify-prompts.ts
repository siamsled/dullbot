import { buildSystemPrompt } from '../src/lib/prompt-builder.js';

const mockPersona = {
  id: 'test',
  name: 'Test Agent',
  tagline: 'A test agent',
  avatar_url: '',
  job_function: 'Test',
  personality_traits: ['Helpful'],
  best_for: [],
  language_style: 'english',
  full_specification: 'You are a test agent.',
  preview_dialogue: [],
  disclosure_line: 'I am an AI.'
};

function testPrompt(shopConfig: any) {
  const shop = {
    id: 'test-shop',
    name: 'Test Shop',
    persona_id: 'test',
    persona_custom_name: null,
    disclosure_mode: 'reactive_honest',
    max_discount_pct: 0,
    auto_escalate_on_complaint: true,
    confidence_fallback: 'say_checking',
    ...shopConfig
  };

  const prompt = buildSystemPrompt(shop, mockPersona, [], []);
  const lines = prompt.split('\n');
  const guardrailsIdx = lines.findIndex(l => l.includes('GUARDRAILS & RULES:'));
  return lines.slice(guardrailsIdx).join('\n');
}

console.log("--- PROMPT GENERATION TEST ---");

console.log("\n[Test 1: Allow Discounts = false]");
console.log(testPrompt({ allow_discounts: false, max_discount_pct: 10 }));

console.log("\n[Test 2: Allow Discounts = true]");
console.log(testPrompt({ allow_discounts: true, max_discount_pct: 10 }));

console.log("\n[Test 3: Voice Messages = true]");
console.log(testPrompt({ handle_audio: true }));

console.log("\n[Test 4: Voice Messages = false]");
console.log(testPrompt({ handle_audio: false }));

console.log("\n[Test 5: Abusive Customer = polite]");
console.log(testPrompt({ abusive_handling_mode: 'polite' }));

console.log("\n[Test 6: Abusive Customer = block (Threshold 2)]");
console.log(testPrompt({ abusive_handling_mode: 'block', abusive_block_threshold: 2 }));

console.log("\n[Test 7: Escalation Severity = serious_complaints]");
console.log(testPrompt({ auto_escalate_on_complaint: true, escalation_severity: 'serious_complaints' }));

console.log("\n[Test 8: Escalation Severity = any_frustration]");
console.log(testPrompt({ auto_escalate_on_complaint: true, escalation_severity: 'any_frustration' }));

console.log("\n[Test 9: High Value Order Threshold = 5000]");
console.log(testPrompt({ high_value_order_threshold: 5000 }));
