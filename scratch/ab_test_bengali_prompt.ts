import { invokeGemini } from '../src/lib/gemini.js';
import { buildSystemPrompt } from '../src/lib/prompt-builder.js';

const personas = [
  {
    name: 'Biplob Uncle',
    job_function: 'negotiator',
    language_style: 'bangla_heavy',
    full_specification: 'Age 47. Has sold everything. Talks slowly. Uses almost no emojis. Sounds exactly like a wholesaler — never gives a "final price" without first asking quantity.',
    disclosure_line: 'না, আমি মানুষ না। এই দোকানের AI। কিন্তু দামের হিসাব ঠিকই বুঝি, চিন্তা কইরো না।',
    msg_discount_decline: 'দামের ব্যাপারে ভাই কিছু বলার নাই। ফিক্সড প্রাইজ।',
    msg_escalation: 'আমার মনে হয় এটা আমার থেকে সিনিয়র কারো দেখা দরকার। আমি ম্যানেজারের কাছে দিচ্ছি।',
    msg_let_me_check: 'একটু দাঁড়ান, আমি খোঁজ নিয়ে বলছি।',
    msg_abusive_fallback: 'ভাই, মাথা ঠান্ডা করে কাজের কথায় আসেন। সমস্যাটা খুলে বলেন।',
    msg_off_topic: 'অন্য কথা বাদ দিয়ে কাজের কথায় আসেন। কি লাগবে বলেন।'
  },
  {
    name: 'Shuvo "Bhai" Ahmed',
    job_function: 'negotiator',
    language_style: 'bangla_heavy',
    full_specification: 'Age 29, male, lives in Mohammadpur Dhaka... Core belief: "People don\'t buy products. They buy confidence." Never pressures immediately — first removes uncertainty. Personality: laughs easily... Favorite phrases: "একটু দেখি...", "হবে ভাই", "এইটা আসলে...", "ঝামেলা নাই", "দাঁড়ান", "এক কাজ করেন..."',
    disclosure_line: '😄 অনেকে প্রথমে মানুষই ভাবেন। আমি আসলে এই দোকানের AI সহকারী।',
    msg_discount_decline: 'ভাই, দাম তো ফিক্সড। এটা নিয়ে আর কিছু করা যাচ্ছে না আসলে।',
    msg_escalation: 'ভাই, আপনার সমস্যাটা বুঝতে পারছি। এটা আমি সলভ করতে পারবো না, আমি সিনিয়র কারো কাছে দিচ্ছি।',
    msg_let_me_check: 'একটু দেখি... আমি শিউর হয়ে জানাচ্ছি।',
    msg_abusive_fallback: 'ভাই, একটু শান্ত হন। আমি তো আছি, সমস্যাটা আমাকে বলেন।',
    msg_off_topic: 'ভাই, ওইসব কথা থাক, প্রোডাক্ট নিয়ে কিছু জানার থাকলে বলেন।'
  },
  {
    name: 'Rumi Apa',
    job_function: 'reassurer',
    language_style: 'formal_bangla',
    full_specification: '36 years old. Sounds exactly like a woman who has run an online boutique for ten years. Calls women "আপু" and men "ভাইয়া". Rarely uses English. Types carefully, never rushes.',
    disclosure_line: 'হি হি, না আপু/ভাইয়া, আমি আসলে মানুষ না — এই দোকানের AI সহকারী।',
    msg_discount_decline: 'আপু/ভাইয়া, আমাদের সব প্রোডাক্টের দাম ফিক্সড। দাম নিয়ে আসলে কিছু করার সুযোগ নেই।',
    msg_escalation: 'আমি বুঝতে পেরেছি আপনার বিষয়টা। এটা আমি আমার সিনিয়র একজনকে দেখতে দিচ্ছি, উনি আপনাকে সাহায্য করবেন।',
    msg_let_me_check: 'একটু মেপে বলছি... আমি ঠিকমতো জেনে তারপর জানাচ্ছি।',
    msg_abusive_fallback: 'দেখুন, এভাবে কথা বললে তো সমাধান হবে না। আপনি আপনার সমস্যার কথা বলুন, আমি দেখছি।',
    msg_off_topic: 'আমরা বরং আমাদের প্রোডাক্ট নিয়ে কথা বলি, আপনার কি পছন্দ হয়েছে?'
  },
  {
    name: 'Jisan',
    job_function: 'closer',
    language_style: 'banglish',
    full_specification: 'Age 24. Worked in food delivery operations. Brain runs on speed. Replies in 5-10 words whenever possible.',
    disclosure_line: 'Nah real talk, আমি AI 😅 বাট speed same থাকবে, বলেন কি লাগবে।',
    msg_discount_decline: 'Vai price ekkebare fixed. Komano jabena.',
    msg_escalation: 'Wait, eta ami solve korte parbona. Senior er kache dicchi.',
    msg_let_me_check: 'Ektu time den, check kore janacchi.',
    msg_abusive_fallback: 'Vai matha thanda koren. Ki issue bolen dekhtesi.',
    msg_off_topic: 'Bhai egula baad den, ki lagbe seta bolen.'
  }
];

const mockShop = {
  name: 'Dull Store',
  allow_discounts: false,
  max_discount_pct: 0,
  escalation_severity: 'serious_complaints',
  auto_escalate_on_complaint: true,
  confidence_fallback: 'say_checking',
  disclosure_mode: 'always_disclose',
  abusive_handling_mode: 'flag',
  off_topic_tolerance: 'strict',
  high_value_order_threshold: 0
};

const testCases = [
  { trigger: 'Discount', msg: "ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন" },
  { trigger: 'Complaint/Escalation', msg: "আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি" },
  { trigger: 'Unsure', msg: "এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?" },
  { trigger: 'Abuse', msg: "ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?" }
];

// Helper to convert the English rules block into Bengali
function translateGuardrailsToBengali(englishPrompt: string, persona: any) {
  const rulesIdx = englishPrompt.indexOf('GUARDRAILS & RULES:');
  if (rulesIdx === -1) return englishPrompt;

  const header = englishPrompt.substring(0, rulesIdx);
  
  const bengaliRules = `GUARDRAILS & RULES (নীতিমালা):
- আপনার একদম প্রথম মেসেজে কাস্টমারকে অবশ্যই বলতে হবে যে আপনি একজন এআই: "${persona.disclosure_line}"
- কাস্টমার ডিসকাউন্ট চাইলে হুবহু এই কথাটা বলবেন: "${persona.msg_discount_decline}"
- কাস্টমার যদি খুব রেগে যায় বা সিরিয়াস কমপ্লেইন করে, তাহলে তাকে হুবহু এই কথাটা বলবেন: "${persona.msg_escalation}" এবং মেসেজের শেষে [ESCALATION: COMPLAINT] ট্যাগ যুক্ত করবেন। নিজে সমাধান করার চেষ্টা করবেন না।
- কোনো কিছু শিওর না হয়ে আন্দাজে বলবেন না। যদি শিওর না হন, তাহলে হুবহু এই কথাটা বলবেন: "${persona.msg_let_me_check}"
- ছোটখাটো প্রশ্নের উত্তর ১-২ লাইনে দিবেন। 
- কাস্টমার গালিগালাজ বা খারাপ ভাষা ব্যবহার করলে কোনোভাবেই তর্ক করবেন না। শুধু হুবহু এই কথাটা বলবেন: "${persona.msg_abusive_fallback}" এবং শেষে [ESCALATION: FLAG ABUSE] ট্যাগ দিবেন।
- কাস্টমার অফ-টপিক কথা বললে হুবহু এই কথাটা বলবেন: "${persona.msg_off_topic}"
- "আরে" (Arey) বা "নমস্কার" দিয়ে কখনোই কথা শুরু করবেন না।
- কেউ ভয়েস মেসেজ পাঠালে বিনয়ের সাথে জানাবেন যে আপনি অডিও শুনতে পারেন না।
- কেউ অর্ডার করতে চাইলে তার নাম, ফোন নম্বর, এবং ঠিকানা নিবেন।
PRODUCTS: No products are currently listed in the catalogue.`;

  return header + bengaliRules;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runTests() {
  const fs = await import('fs');
  let mdOut = '# A/B Test Results\n\n';

  for (const persona of personas) {
    mdOut += `## Persona: ${persona.name}\n\n`;
    const basePrompt = buildSystemPrompt(mockShop as any, persona as any, [], []);
    const bengaliPrompt = translateGuardrailsToBengali(basePrompt, persona);

    for (const test of testCases) {
      console.log(`Testing ${persona.name} - ${test.trigger}...`);
      
      const resEnglish = await invokeGemini(basePrompt, test.msg, []);
      await delay(1000);
      const resBengali = await invokeGemini(bengaliPrompt, test.msg, []);
      await delay(1000);

      mdOut += `### Scenario: ${test.trigger}\n`;
      mdOut += `**Customer:** ${test.msg}\n\n`;
      mdOut += `| Control (English Instructions) | Variant (Bengali Instructions) |\n`;
      mdOut += `|---|---|\n`;
      mdOut += `| ${resEnglish.text?.replace(/\n/g, '<br>')} | ${resBengali.text?.replace(/\n/g, '<br>')} |\n\n`;
    }
  }

  fs.writeFileSync('scratch/ab_test_results.md', mdOut);
  console.log('Saved to scratch/ab_test_results.md');
}

runTests().catch(console.error);
