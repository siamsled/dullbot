import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: shop } = await supabase.from('shops').select('id, meta_page_id').eq('slug', 'dull-store').single();

  // Insert a mock bot message with a fake fb_message_id
  const { data: conv } = await supabase.from('conversations').select('id').eq('shop_id', shop.id).limit(1).single();
  
  if (!conv) {
    console.log("No conversation found");
    return;
  }

  const { data: mockBotMsg } = await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender: 'bot',
    content: '![Test Jacket](https://example.com/test.jpg)',
    fb_message_ids: ['m_test_123']
  }).select().single();

  console.log("Inserted mock bot message:", mockBotMsg);

  // Simulate webhook POST request payload parsing locally using the snippet logic
  const replyToMid = 'm_test_123';
  const messageText = 'etar dam koto?';

  let dbContent = messageText;
  
  if (replyToMid) {
    const { data: repliedMsg, error } = await supabase
      .from('messages')
      .select('content')
      .contains('fb_message_ids', [replyToMid])
      .single();
      
    if (error) {
      console.log("Query Error:", error);
    }
      
    if (repliedMsg) {
      dbContent = `[Replying to bot's message: "${repliedMsg.content}"] ${dbContent}`;
    }
  }

  console.log("Simulated Customer Message Content to be Saved:", dbContent);
}

run();
