import { NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/chat-pipeline';
import { sendMetaMessage } from '@/lib/meta-api';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET handler for Webhook Verification (Meta requires this during setup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopSlug = searchParams.get('shop');
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!shopSlug) {
    return new NextResponse('Missing shop parameter', { status: 400 });
  }

  // Fetch the shop's specific verify token
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_verify_token')
    .eq('slug', shopSlug)
    .single();

  const verifyToken = shop?.meta_verify_token;

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED for shop:', shopSlug);
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
    const { searchParams } = new URL(request.url);
    const shopSlug = searchParams.get('shop');

    if (!shopSlug) {
      return new NextResponse('Missing shop parameter', { status: 400 });
    }

    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        // Here, entry.id is the Facebook Page ID, but our pipeline needs the internal shopSlug.
        
        for (const webhook_event of entry.messaging) {
          if (webhook_event.message && webhook_event.message.text) {
            const senderPsid = webhook_event.sender.id;
            const messageText = webhook_event.message.text;

            console.log(`Received message from PSID: ${senderPsid} for shop: ${shopSlug}`);

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
