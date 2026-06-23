import { NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/chat-pipeline';
import { sendMetaMessage } from '@/lib/meta-api';

// GET handler for Webhook Verification (Meta requires this during setup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    if (mode === 'subscribe' && token === verifyToken) {
      // Respond with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// POST handler for receiving incoming messages from Meta
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is an event from a page subscription
    if (body.object === 'page') {
      
      // Iterate over each entry - there may be multiple if batched
      for (const entry of body.entry) {
        
        // We will use the page ID as the shop slug for mapping purposes
        const pageId = entry.id;
        
        // Iterate over each messaging event
        for (const webhook_event of entry.messaging) {
          
          // Check if the event is a text message
          if (webhook_event.message && webhook_event.message.text) {
            const senderPsid = webhook_event.sender.id;
            const messageText = webhook_event.message.text;

            console.log(`Received message from PSID: ${senderPsid}: ${messageText}`);

            // Pass to our core chat pipeline
            // Note: We use senderPsid as the unique customer identifier instead of a phone number
            const result = await processIncomingMessage(pageId, senderPsid, messageText);
            
            // If the pipeline successfully generated a reply, send it back via Meta API
            if (result.success && result.message) {
              await sendMetaMessage(senderPsid, result.message);
            }
          }
        }
      }

      // Return a '200 OK' response to all requests
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Return a '404 Not Found' if event is not from a page subscription
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Meta webhook processing error:', error);
    // Always return 200 to Meta so they don't retry failed deliveries endlessly unless we want them to
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
  }
}
