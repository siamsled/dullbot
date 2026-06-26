import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VERIFY_TOKEN = process.env.META_GLOBAL_VERIFY_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id;
        
        // Find the shop associated with this page
        const { data: shop } = await supabaseAdmin
          .from('shops')
          .select('id, name')
          .eq('meta_page_id', pageId)
          .single();

        if (!shop) {
          console.warn(`No shop found for page ID: ${pageId}`);
          continue;
        }

        // Loop through messaging events
        if (entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            const senderId = webhookEvent.sender?.id;

            if (webhookEvent.message && webhookEvent.message.text && senderId) {
              const messageText = webhookEvent.message.text;

              // 1. Find or create conversation (using senderId as customer_phone for Messenger)
              let { data: conversation } = await supabaseAdmin
                .from('conversations')
                .select('*')
                .eq('shop_id', shop.id)
                .eq('customer_phone', senderId)
                .single();

              if (!conversation) {
                const { data: newConv } = await supabaseAdmin
                  .from('conversations')
                  .insert({
                    shop_id: shop.id,
                    customer_phone: senderId, // Storing Meta PSID here
                    channel: 'messenger',
                    status: 'bot_active'
                  })
                  .select()
                  .single();
                conversation = newConv;
              }

              if (!conversation) continue;

              // 2. Insert message
              await supabaseAdmin
                .from('messages')
                .insert({
                  conversation_id: conversation.id,
                  sender: 'customer',
                  content: messageText
                });

              // 3. Update conversation last activity
              await supabaseAdmin
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversation.id);
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
