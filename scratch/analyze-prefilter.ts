import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  // Get last 100 real customer messages
  const { data } = await supabaseAdmin
    .from('messages')
    .select('content, sender')
    .eq('sender', 'customer')
    .order('created_at', { ascending: false })
    .limit(100);

  const messages = data?.map(m => m.content) ?? [];
  console.log(`Total messages fetched: ${messages.length}`);
  console.log('--- All messages ---');
  messages.forEach((m, i) => console.log(`${i + 1}: ${m}`));

  // Simulate current pre-filter
  const currentFilters = [
    /hello|hi|hey/i,
    /thank/i,
    /negotiate|discount|less price/i,
  ];

  // Simulate expanded pre-filter
  const expandedFilters = [
    // Greetings
    /^(hello|hi|hey|salam|assalamualaikum|walaikum|helo|helo bhai|কি|কি হলো|ভালো আছেন)/i,
    // Thanks / closing
    /^(thank|thanks|dhonnobad|ধন্যবাদ|shukriya|জাজাকাল্লাহ|ok|okay|okok|tnx|thx|বাই|bye|আচ্ছা)/i,
    // Discounts
    /negotiate|discount|less price|কম দামে|ছাড়|দাম কমান/i,
    // Stock check
    /ache\?|ache ?!|আছে\?|আছে ?!|available|stock|পাওয়া যাবে|পাবো|পাব|asbe|আসবে/i,
    // Price check
    /price|dam|দাম|কত|koto|কত টাকা|rate/i,
    // Delivery
    /delivery|deliver|courier|পৌঁছাবে|পাঠাবেন|charge|shipping/i,
    // Business hours
    /open|closed|khulan|খোলা|বন্ধ|hours|time|সময়/i,
  ];

  let currentHits = 0;
  let expandedHits = 0;
  const expandedMisses: string[] = [];

  for (const msg of messages) {
    const norm = msg.trim().toLowerCase();
    if (currentFilters.some(r => r.test(norm))) currentHits++;
    if (expandedFilters.some(r => r.test(norm))) {
      expandedHits++;
    } else {
      expandedMisses.push(msg);
    }
  }

  console.log('\n--- RESULTS ---');
  console.log(`Current pre-filter hits: ${currentHits}/${messages.length} (${((currentHits/messages.length)*100).toFixed(1)}%)`);
  console.log(`Expanded pre-filter hits: ${expandedHits}/${messages.length} (${((expandedHits/messages.length)*100).toFixed(1)}%)`);
  console.log(`Still needs Gemini: ${messages.length - expandedHits}/${messages.length}`);
  console.log('\n--- Messages still needing Gemini ---');
  expandedMisses.forEach((m, i) => console.log(`${i + 1}: ${m}`));

  // Also get usage_logs stats
  const { data: usageLogs } = await supabaseAdmin
    .from('usage_logs')
    .select('prefilter_hit, cache_hit, output_tokens, input_tokens')
    .order('created_at', { ascending: false })
    .limit(200);

  if (usageLogs) {
    const prefilterHits = usageLogs.filter(l => l.prefilter_hit).length;
    const cacheHits = usageLogs.filter(l => l.cache_hit).length;
    const geminiCalls = usageLogs.filter(l => !l.prefilter_hit && !l.cache_hit).length;
    const avgOutput = usageLogs.filter(l => !l.prefilter_hit && !l.cache_hit)
      .reduce((sum, l) => sum + (l.output_tokens || 0), 0) / Math.max(1, geminiCalls);
    const avgInput = usageLogs.filter(l => !l.prefilter_hit && !l.cache_hit)
      .reduce((sum, l) => sum + (l.input_tokens || 0), 0) / Math.max(1, geminiCalls);

    console.log('\n--- USAGE LOGS BASELINE (last 200) ---');
    console.log(`Prefilter hits: ${prefilterHits} (${((prefilterHits/usageLogs.length)*100).toFixed(1)}%)`);
    console.log(`Cache hits: ${cacheHits} (${((cacheHits/usageLogs.length)*100).toFixed(1)}%)`);
    console.log(`Real Gemini calls: ${geminiCalls} (${((geminiCalls/usageLogs.length)*100).toFixed(1)}%)`);
    console.log(`Avg output tokens per Gemini call: ${avgOutput.toFixed(1)}`);
    console.log(`Avg input tokens per Gemini call: ${avgInput.toFixed(1)}`);
  }
}

main().catch(console.error);
