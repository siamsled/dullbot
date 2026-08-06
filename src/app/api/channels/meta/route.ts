import { NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/chat-pipeline';
import { sendMetaMessage } from '@/lib/meta-api';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET handler for Webhook Verification (Meta requires this during setup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const globalVerifyToken = process.env.META_GLOBAL_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === globalVerifyToken) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// POST handler for receiving incoming messages from Meta
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id; // The Facebook Page ID
        
        // Look up via shop_meta_pages for multi-page routing
        const { data: pageRow } = await supabaseAdmin
          .from('shop_meta_pages')
          .select('shop_id')
          .eq('meta_page_id', pageId)
          .single();

        let shop: { id: string; slug: string } | null = null;
        if (pageRow) {
          const { data: shopData } = await supabaseAdmin
            .from('shops')
            .select('id, slug')
            .eq('id', pageRow.shop_id)
            .single();
          shop = shopData;
        } else {
          // Fallback: direct shops lookup (backward compat)
          const { data: shopData } = await supabaseAdmin
            .from('shops')
            .select('id, slug')
            .eq('meta_page_id', pageId)
            .single();
          shop = shopData;
        }

        if (!shop) {
          console.error(`Received message for unlinked page ID: ${pageId}`);
          continue;
        }

        const shopSlug = shop.slug;

        for (const webhook_event of entry.messaging) {
          // Ignore echo messages (messages sent by the page/bot itself)
          if (webhook_event.message?.is_echo) {
            console.log("Ignoring echo message");
            continue;
          }

          if (webhook_event.message && webhook_event.message.text) {
            const senderPsid = webhook_event.sender.id;
            const messageText = webhook_event.message.text;

            console.log(`Received message from PSID: ${senderPsid} for shop: ${shopSlug} (Page ID: ${pageId})`);

            // Pass the custom shopSlug to the core chat pipeline
            const result = await processIncomingMessage(shopSlug, senderPsid, messageText);
            
            // Send reply via Meta API, explicitly passing the shopSlug so we fetch the right page token
            if (result.success && result.message) {
              const sendResult = await sendMetaMessage(senderPsid, result.message, shopSlug);
              if (!sendResult.success) {
                console.error(`Failed to send message via Meta API: ${sendResult.error}`);
                
                // Fetch conversation ID to store the system error
                const { data: conversation } = await supabaseAdmin
                  .from('conversations')
                  .select('id')
                  .eq('shop_id', shop.id)
                  .eq('customer_phone', senderPsid)
                  .single();

                if (conversation) {
                  await supabaseAdmin
                    .from('messages')
                    .insert({
                      conversation_id: conversation.id,
                      sender: 'bot',
                      content: `[SYSTEM ERROR] Failed to send via Meta API: ${sendResult.error}`
                    });
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Meta webhook processing error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
  }
}
