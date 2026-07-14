import { supabaseAdmin } from '../src/lib/supabase-admin.js';

const SHOP_NAME = 'Dull Store';
const META_PAGE_ID = '1246008781920134';
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/messenger';

const PERSONAS_TO_TEST = [
  'Biplob Uncle', 'Shuvo "Bhai" Ahmed', 'Rumi Apa', 'Jisan',
  'Imran', 'Nila', 'Rakib', 'Tanim', 'Mehnaz', 'Sharmin Apa'
];

const SCENARIOS = [
  { name: 'Discount', text: 'ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন' },
  { name: 'Complaint/Escalation', text: 'আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি' },
  { name: 'Unsure', text: 'এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?' },
  { name: 'Abuse', text: 'ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?' },
  { name: 'Greeting', text: 'hi' }
];

async function sendWebhookPost(senderId: string, text: string) {
  const payload = {
    object: 'page',
    entry: [
      {
        id: META_PAGE_ID,
        messaging: [
          {
            sender: { id: senderId },
            message: { text }
          }
        ]
      }
    ]
  };

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}`);
  }
}

async function getLatestBotMessage(senderId: string) {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('customer_phone', senderId)
      .single();
      
    if (conv) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .eq('sender', 'bot')
        .order('created_at', { ascending: false });
        
      if (msgs && msgs.length > 0) {
        // Find the most recent non-system-error message
        const realReply = msgs.find(m => !m.content.startsWith('[SYSTEM ERROR]'));
        if (realReply) return realReply;
      }
    }
  }
  return null;
}

async function run() {
  const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('name', SHOP_NAME).single();
  if (!shop) throw new Error('Shop not found');

  const { data: personas } = await supabaseAdmin.from('agent_personas').select('id, name');
  
  console.log('# Real Webhook A/B Test Results (Post-Migration)\\n');

  for (const pName of PERSONAS_TO_TEST) {
    const persona = personas?.find(p => p.name === pName);
    if (!persona) continue;

    await supabaseAdmin.from('shops').update({ persona_id: persona.id }).eq('id', shop.id);
    console.log(`## Persona: ${pName}\\n`);

    for (const scen of SCENARIOS) {
      console.log(`### Scenario: ${scen.name}`);
      console.log(`**Customer:** ${scen.text}`);
      
      const senderId = `TEST_${pName.replace(/\\s+/g, '')}_${scen.name.replace(/\\W+/g, '')}_${Date.now()}`;
      
      await sendWebhookPost(senderId, scen.text);
      
      const botMsg = await getLatestBotMessage(senderId);
      if (botMsg) {
        let reply = botMsg.content;
        if (botMsg.is_escalated) reply += ' `[is_escalated=true]`';
        console.log(`**Bot:** ${reply}\\n`);
      } else {
        console.log(`**Bot:** (No response or timeout)\\n`);
      }
    }
  }
}

run().catch(console.error);
