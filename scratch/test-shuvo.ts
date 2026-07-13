import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  const shopId = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';
  
  const { data: p } = await supabaseAdmin.from('agent_personas').select('id, name').eq('name', 'Shuvo "Bhai" Ahmed').single();
  if (!p) throw new Error("Shuvo not found");

  await supabaseAdmin.from('shops').update({ persona_id: p.id }).eq('id', shopId);

  for (let i = 0; i < 4; i++) {
    const senderId = `TEST_SENDER_SHUVO_${i}_${Date.now()}`;
    console.log(`Firing test ${i+1} for Shuvo...`);
    
    await fetch('http://localhost:3000/api/webhooks/messenger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'page',
        entry: [{
          id: '1246008781920134',
          messaging: [{
            sender: { id: senderId },
            message: { text: 'classic biker er stock ache? kemon quality etar? ami nite chai jodi valo hoy.' }
          }]
        }]
      })
    });
    
    await new Promise(r => setTimeout(r, 10000));
    
    const { data: conv } = await supabaseAdmin.from('conversations').select('id').eq('customer_phone', senderId).single();
    if (conv) {
      const { data: msgs } = await supabaseAdmin.from('messages').select('content').eq('conversation_id', conv.id).eq('sender', 'bot').not('content', 'like', '[SYSTEM ERROR]%').order('created_at', { ascending: false }).limit(1);
      if (msgs && msgs.length > 0) {
        console.log(`Result ${i+1}:`, msgs[0].content);
      }
    }
  }
}

run().catch(console.error);
