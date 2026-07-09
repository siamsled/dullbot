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

            if (webhookEvent.message && senderId) {
              const messageText = webhookEvent.message.text || '';
              const attachments = webhookEvent.message.attachments || [];
              const imageAttachment = attachments.find((att: any) => att.type === 'image');
              const imageUrl = imageAttachment?.payload?.url;

              if (!messageText && !imageUrl) continue;

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

              // 2. Insert incoming message (use IMAGE:url prefix for rendering in client)
              const dbContent = imageUrl ? `IMAGE:${imageUrl}` : messageText;
              await supabaseAdmin
                .from('messages')
                .insert({
                  conversation_id: conversation.id,
                  sender: 'customer',
                  content: dbContent
                });

              // 3. If bot is active, trigger AI
              if (conversation.status === 'bot_active') {
                // Fetch last 10 messages for context
                const { data: history } = await supabaseAdmin
                  .from('messages')
                  .select('sender, content')
                  .eq('conversation_id', conversation.id)
                  .order('created_at', { ascending: true })
                  .limit(10);
                
                let chatHistory = '';
                if (history) {
                  history.forEach(msg => {
                    const textContent = msg.content.startsWith('IMAGE:') ? '[Sent an image]' : msg.content;
                    chatHistory += `${msg.sender}: ${textContent}\n`;
                  });
                }

                // Fetch custom AI instructions
                const { data: customInstructions } = await supabaseAdmin
                  .from('quick_replies')
                  .select('response_text')
                  .eq('shop_id', shop.id)
                  .eq('trigger_pattern', '__ai_instructions__')
                  .maybeSingle();

                let prompt = `You are a friendly, polite, and helpful AI customer service assistant for a shop named "${shop.name}".
                Your goal is to assist the customer with their order or query while matching their language and writing style (Banglish vs Bengali vs English) in a warm, respectful way.
                
                CRITICAL RULES:
                1. Match the language exactly: If they speak English, use English. If they speak Bengali script, use Bengali script.
                2. BANGLISH SUPPORT: If the customer writes Bengali using English letters ("Banglish" e.g., "kire", "kam kor", "bujos nai"), reply in casual Banglish using English letters.
                3. RESPECT & PROFESSIONALISM: Even if you are being casual or using Banglish, you must remain polite and helpful. Never insult, mock, or say dismissive things (like "ki jalaite asho"). If the customer complains, demands respect ("somman"), or gets angry, immediately apologize politely and de-escalate (e.g., "Sorry boss/bhai, bolen ki dorkar?").
                4. NO BOT EXCUSES: Never claim you were "busy" or "away" (you are an instant assistant, so saying you were busy sounds fake/unprofessional). Keep responses concise, natural, and helpful.`;

                if (customInstructions?.response_text) {
                  prompt += `\n\nCRITICAL WORKSPACE CUSTOM RULES & INFORMATION (Follow these rules strictly):\n${customInstructions.response_text}`;
                }
                
                prompt += `\n\nHere is the recent chat history:\n${chatHistory}\n`;

                if (imageUrl) {
                  prompt += `\nNote: The customer has sent an image which is attached to this request. Analyze the image to answer their query if relevant.`;
                }

                prompt += `\n\nPlease generate your reply directly without any prefixes (do not output 'bot:' or your name).`;

                let imagePart: any = null;
                if (imageUrl) {
                  try {
                    const imgRes = await fetch(imageUrl);
                    if (imgRes.ok) {
                      const buffer = await imgRes.arrayBuffer();
                      const base64 = Buffer.from(buffer).toString('base64');
                      const mime = imgRes.headers.get('content-type') || 'image/jpeg';
                      imagePart = {
                        inlineData: {
                          data: base64,
                          mimeType: mime
                        }
                      };
                    }
                  } catch (err) {
                    console.error("Failed to fetch image for Gemini:", err);
                  }
                }

                try {
                  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
                  const promptParts: any[] = [prompt];
                  if (imagePart) {
                    promptParts.push(imagePart);
                  }
                  
                  const result = await model.generateContent(promptParts);
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
                        throw new Error(`Meta API Rejected: ${fbErr.error?.message || 'Unknown error'}`);
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
                  // Insert the error directly into the chat so we can see what's wrong without Vercel logs!
                  await supabaseAdmin
                    .from('messages')
                    .insert({
                      conversation_id: conversation.id,
                      sender: 'bot',
                      content: `[SYSTEM ERROR] Failed to reply: ${aiError instanceof Error ? aiError.message : String(aiError)}`
                    });
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
