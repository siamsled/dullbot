import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const VERIFY_TOKEN = process.env.META_GLOBAL_VERIFY_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
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
          .select('id, name, meta_page_access_token')
          .eq('meta_page_id', pageId)
          .single();

        if (!shop) {
          console.warn(`No shop found for page ID: ${pageId}`);
          continue;
        }

        if (entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            const senderId = webhookEvent.sender?.id;

            if (webhookEvent.message && webhookEvent.message.text && senderId) {
              const messageText = webhookEvent.message.text;

              // 1. Find or create conversation
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
                    customer_phone: senderId,
                    channel: 'messenger',
                    status: 'bot_active'
                  })
                  .select()
                  .single();
                conversation = newConv;
              }

              if (!conversation) continue;

              // 2. Insert incoming message
              await supabaseAdmin
                .from('messages')
                .insert({
                  conversation_id: conversation.id,
                  sender: 'customer',
                  content: messageText
                });

              // 3. If bot is active, trigger AI
              if (conversation.status === 'bot_active') {
                // Fetch last 5 messages for context
                const { data: history } = await supabaseAdmin
                  .from('messages')
                  .select('sender, content')
                  .eq('conversation_id', conversation.id)
                  .order('created_at', { ascending: true })
                  .limit(10);
                
                let chatHistory = '';
                if (history) {
                  history.forEach(msg => {
                    chatHistory += `${msg.sender}: ${msg.content}\n`;
                  });
                }

                const prompt = `You are a helpful customer service AI for a shop named "${shop.name}". 
                A customer just sent a message. Respond politely and concisely. 
                Here is the recent chat history:\n${chatHistory}\n
                Please generate your reply directly without formatting it as 'bot: ...'.`;

                try {
                  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                  const result = await model.generateContent(prompt);
                  const aiResponseText = result.response.text().trim();

                  if (aiResponseText) {
                    // Send to Meta Graph API
                    if (shop.meta_page_access_token) {
                      const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          recipient: { id: senderId },
                          message: { text: aiResponseText }
                        })
                      });
                      
                      if (!fbRes.ok) {
                        const fbErr = await fbRes.json();
                        console.error("Facebook API Error:", fbErr);
                      }
                    }

                    // Insert AI message into database
                    await supabaseAdmin
                      .from('messages')
                      .insert({
                        conversation_id: conversation.id,
                        sender: 'bot',
                        content: aiResponseText
                      });
                  }
                } catch (aiError) {
                  console.error("AI Generation or Sending Error:", aiError);
                  // We intentionally swallow this error so we still return 200 OK to Facebook
                  // otherwise Facebook will infinitely retry sending the same message!
                }
              }

              // Update last_message_at
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
