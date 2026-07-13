import { supabaseAdmin } from '../src/lib/supabase-admin';
import fs from 'fs';

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  const shopId = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';
  const pageId = '1246008781920134';

  const { data: personas } = await supabaseAdmin.from('agent_personas').select('*').order('name');
  if (!personas) return;

  const testMessage = "classic biker er stock ache? kemon quality etar? ami nite chai jodi valo hoy.";
  let report = "# Persona Webhook Test Report\n\n";

  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    console.log(`Testing Persona: ${p.name}`);
    
    // Update shop to use this persona
    await supabaseAdmin.from('shops').update({ persona_id: p.id }).eq('id', shopId);

    const senderId = `TEST_SENDER_V2_PERSONA_${i}_${Date.now()}`;

    // Fire webhook
    await fetch('http://localhost:3000/api/webhooks/messenger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'page',
        entry: [{
          id: pageId,
          messaging: [{
            sender: { id: senderId },
            message: { text: testMessage }
          }]
        }]
      })
    });

    // Wait for Gemini to generate and DB to update (10 seconds)
    await delay(10000);

    // Fetch conversation
    const { data: conv } = await supabaseAdmin.from('conversations').select('id').eq('customer_phone', senderId).single();
    if (conv) {
      // Fetch latest bot message
      const { data: msgs } = await supabaseAdmin.from('messages').select('content').eq('conversation_id', conv.id).eq('sender', 'bot').order('created_at', { ascending: false }).limit(1);
      
      // Fetch usage log
      const { data: usage } = await supabaseAdmin.from('usage_logs').select('input_tokens, output_tokens, billed_credits').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1);
      
      const botReply = msgs && msgs.length > 0 ? msgs[0].content : "NO REPLY FOUND";
      const usageStats = usage && usage.length > 0 ? usage[0] : { input_tokens: 0, output_tokens: 0, billed_credits: 0 };
      
      console.log(`Reply: ${botReply}\nTokens: ${usageStats.input_tokens} in / ${usageStats.output_tokens} out\n`);

      report += `## ${p.name}\n`;
      report += `**Spec Snippet:** ${p.full_specification.substring(0, 100)}...\n\n`;
      report += `**Customer:** ${testMessage}\n\n`;
      report += `**Bot Reply (Raw DB Content):**\n\`\`\`\n${botReply}\n\`\`\`\n\n`;
      report += `**Tokens:** ${usageStats.input_tokens} In | ${usageStats.output_tokens} Out\n`;
      report += `---\n\n`;
    }
  }

  // Restore Nila to the shop
  const nila = personas.find(p => p.name === 'Nila');
  if (nila) {
    await supabaseAdmin.from('shops').update({ persona_id: nila.id }).eq('id', shopId);
  }

  fs.writeFileSync('/Users/shah/.gemini/antigravity-ide/brain/9c7da53e-bebb-4ccb-bd1b-275f1f84091d/persona_test_report.md', report);
  console.log("Done! Saved report.");
}

runTest().catch(console.error);
