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
        
        // Find the shop that connected this page
        const { data: shop } = await supabaseAdmin
          .from('shops')
          .select('slug')
          .eq('meta_page_id', pageId)
          .single();

        if (!shop) {
          console.error(`Received message for unlinked page ID: ${pageId}`);
          continue;
        }

        const shopSlug = shop.slug;

        for (const webhook_event of entry.messaging) {
          if (webhook_event.message && webhook_event.message.text) {
            const senderPsid = webhook_event.sender.id;
            const messageText = webhook_event.message.text;

            console.log(`Received message from PSID: ${senderPsid} for shop: ${shopSlug} (Page ID: ${pageId})`);

            // Pass the custom shopSlug to the core chat pipeline
            const result = await processIncomingMessage(shopSlug, senderPsid, messageText);
            
            // Send reply via Meta API, explicitly passing the shopSlug so we fetch the right page token
            if (result.success && result.message) {
              await sendMetaMessage(senderPsid, result.message, shopSlug);
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
