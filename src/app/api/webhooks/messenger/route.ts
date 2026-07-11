import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/prompt-builder';

const VERIFY_TOKEN = process.env.META_GLOBAL_VERIFY_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const webhookProfileCache = new Map<string, { first_name: string; last_name: string; gender?: string }>();

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
          .select('id, name, slug, meta_page_access_token, agent_enabled, credit_balance, ai_instructions, tone_formal_casual, tone_concise_detailed, tone_professional_warm, language_mix, emoji_frequency, max_discount_pct, auto_escalate_on_complaint, confidence_fallback, disclose_ai_if_asked, tuning_updated_at')
          .eq('meta_page_id', pageId)
          .single();

        if (!shop) {
          console.warn(`No shop found for page ID: ${pageId}`);
          continue;
        }

        if (entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            // Ignore echo messages (messages sent by the page/bot itself)
            if (webhookEvent.message?.is_echo) {
              console.log("Ignoring echo message");
              continue;
            }

            const senderId = webhookEvent.sender?.id;

            if (webhookEvent.message && senderId) {
              const messageText = webhookEvent.message.text || '';
              const attachments = webhookEvent.message.attachments || [];
              const imageAttachment = attachments.find((att: any) => att.type === 'image');
              const imageUrl = imageAttachment?.payload?.url;
              const audioAttachment = attachments.find((att: any) => att.type === 'audio');
              const audioUrl = audioAttachment?.payload?.url;
              const replyToMid = webhookEvent.message.reply_to?.mid;

              if (!messageText && !imageUrl && !audioUrl) continue;

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
              } else if (conversation.status === 'closed') {
                const { data: updatedConv } = await supabaseAdmin
                  .from('conversations')
                  .update({ status: 'bot_active' })
                  .eq('id', conversation.id)
                  .select()
                  .single();
                conversation = updatedConv || conversation;
              }

              if (!conversation) continue;

              // 2. Insert incoming message (use IMAGE:url or AUDIO:url prefix for rendering in client)
              let dbContent = imageUrl ? `IMAGE:${imageUrl}` : (audioUrl ? `AUDIO:${audioUrl}` : messageText);
              
              if (replyToMid) {
                const { data: repliedMsg } = await supabaseAdmin
                  .from('messages')
                  .select('content')
                  .contains('fb_message_ids', [replyToMid])
                  .single();
                  
                if (repliedMsg) {
                  dbContent = `[Replying to bot's message: "${repliedMsg.content}"] ${dbContent}`;
                }
              }

              await supabaseAdmin
                .from('messages')
                .insert({
                  conversation_id: conversation.id,
                  sender: 'customer',
                  content: dbContent
                });

              // 3. If bot is active, trigger AI
              if (conversation.status === 'bot_active') {
                // Fetch last 10 messages for context, gated by shop's tuning update timestamp
                let historyQuery = supabaseAdmin
                  .from('messages')
                  .select('sender, content, created_at')
                  .eq('conversation_id', conversation.id)
                  .order('created_at', { ascending: false });

                if (shop.tuning_updated_at) {
                  historyQuery = historyQuery.gt('created_at', shop.tuning_updated_at);
                }

                const { data: rawHistory } = await historyQuery.limit(10);
                const history = rawHistory ? [...rawHistory].reverse() : [];
                
                let chatHistory = '';
                if (history) {
                  history.forEach(msg => {
                    const textContent = msg.content.startsWith('IMAGE:') 
                      ? '[Sent an image]' 
                      : msg.content.startsWith('AUDIO:') 
                        ? '[Sent a voice message]' 
                        : msg.content;
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

                 // Fetch live inventory + example replies
                const { data: products } = await supabaseAdmin
                  .from('products')
                  .select('name, description, price, stock_quantity, currency, image_url')
                  .eq('shop_id', shop.id)
                  .eq('is_active', true)
                  .eq('draft', false)
                  .gt('stock_quantity', 0);

                const { data: exampleReplies } = await supabaseAdmin
                  .from('example_replies')
                  .select('customer_message, ideal_reply')
                  .eq('shop_id', shop.id)
                  .limit(10);

                // Get customer name and gender from cache or Meta API
                let customerProfile: { first_name: string; last_name: string; gender?: string } = { first_name: 'Customer', last_name: '', gender: 'unknown' };
                if (shop.meta_page_access_token) {
                  if (webhookProfileCache.has(senderId)) {
                    customerProfile = webhookProfileCache.get(senderId)!;
                  } else {
                    try {
                      const res = await fetch(`https://graph.facebook.com/v19.0/${senderId}?fields=first_name,last_name,gender&access_token=${shop.meta_page_access_token}`);
                      if (res.ok) {
                        const data = await res.json();
                        customerProfile = {
                          first_name: data.first_name || 'Customer',
                          last_name: data.last_name || '',
                          gender: data.gender || 'unknown'
                        };
                        webhookProfileCache.set(senderId, customerProfile);
                      }
                    } catch (err) {
                      console.error("Error fetching webhook user profile:", err);
                    }
                  }
                }
                const customerName = `${customerProfile.first_name} ${customerProfile.last_name}`.trim();
                const customerGender = customerProfile.gender;

                const shopWithInstructions = {
                  ...shop,
                  ai_instructions: customInstructions?.response_text || shop.ai_instructions
                };

                let systemPrompt = buildSystemPrompt(shopWithInstructions, products || [], exampleReplies || []);

                // Customer context
                systemPrompt += `\n\nCUSTOMER DETAILS:
                - Name: ${customerName}
                - Gender: ${customerGender}`;

                let prompt = systemPrompt;
                prompt += `\n\nHere is the recent chat history:\n${chatHistory}\n`;

                if (imageUrl) {
                  prompt += `\nNote: The customer has sent an image which is attached to this request. Analyze the image to answer their query if relevant.`;
                }
                if (audioUrl) {
                  prompt += `\nNote: The customer has sent a voice message which is attached to this request. Listen to the audio to understand and answer their query.`;
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

                let audioPart: any = null;
                if (audioUrl) {
                  try {
                    const audioRes = await fetch(audioUrl);
                    if (audioRes.ok) {
                      const buffer = await audioRes.arrayBuffer();
                      const base64 = Buffer.from(buffer).toString('base64');
                      const mime = audioRes.headers.get('content-type') || 'audio/mp4';
                      audioPart = {
                        inlineData: {
                          data: base64,
                          mimeType: mime
                        }
                      };
                    }
                  } catch (err) {
                    console.error("Failed to fetch audio for Gemini:", err);
                  }
                }

                try {
                  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
                  const promptParts: any[] = [prompt];
                  if (imagePart) {
                    promptParts.push(imagePart);
                  }
                  if (audioPart) {
                    promptParts.push(audioPart);
                  }
                  
                  const result = await model.generateContent(promptParts);
                  let aiResponseText = result.response.text().trim();

                  if (aiResponseText) {
                    let ticketReason: string | null = null;
                    if (aiResponseText.includes('[ESCALATION: COMPLAINT]')) {
                      ticketReason = 'complaint';
                      aiResponseText = aiResponseText.replace('[ESCALATION: COMPLAINT]', '').trim();
                    } else if (aiResponseText.includes('[ESCALATION: UNSURE]')) {
                      ticketReason = 'unsure';
                      aiResponseText = aiResponseText.replace('[ESCALATION: UNSURE]', '').trim();
                    } else if (isEscalationResponse(aiResponseText)) {
                      ticketReason = 'complaint';
                    }

                    // Parse out Markdown images
                    const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;
                    const imageUrls: string[] = [];
                    let messengerText = aiResponseText;

                    let match;
                    while ((match = markdownImageRegex.exec(aiResponseText)) !== null) {
                      if (match[1]) imageUrls.push(match[1]);
                    }
                    // Remove markdown tags for plain text Messenger
                    messengerText = messengerText.replace(markdownImageRegex, '').trim();

                    let capturedMids: string[] = [];

                    // Send to Meta Graph API
                    if (shop.meta_page_access_token) {
                      if (messengerText) {
                        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipient: { id: senderId },
                            message: { text: messengerText }
                          })
                        });
                        
                        if (!fbRes.ok) {
                          const fbErr = await fbRes.json();
                          throw new Error(`Meta API Rejected: ${fbErr.error?.message || 'Unknown error'}`);
                        } else {
                          const fbData = await fbRes.json();
                          if (fbData.message_id) capturedMids.push(fbData.message_id);
                        }
                      }

                      // Send image attachments separately
                      for (const url of imageUrls) {
                        const fbImgRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipient: { id: senderId },
                            message: {
                              attachment: {
                                type: "image",
                                payload: { url: url, is_reusable: true }
                              }
                            }
                          })
                        });
                        if (!fbImgRes.ok) {
                          console.error("Failed to send image attachment to Messenger:", await fbImgRes.json());
                        } else {
                          const fbImgData = await fbImgRes.json();
                          if (fbImgData.message_id) capturedMids.push(fbImgData.message_id);
                        }
                      }
                    }

                    // Insert AI message into database
                    await supabaseAdmin
                      .from('messages')
                      .insert({
                        conversation_id: conversation.id,
                        sender: 'bot',
                        content: aiResponseText,
                        fb_message_ids: capturedMids.length > 0 ? capturedMids : null
                      });

                    // Check if the bot response indicates escalation/takeover
                    if (ticketReason) {
                      const { error: updateErr } = await supabaseAdmin
                        .from('conversations')
                        .update({ status: 'human_takeover', ticket_reason: ticketReason })
                        .eq('id', conversation.id);
                      
                      if (updateErr) {
                        throw new Error(`Failed to update conversation status: ${updateErr.message}`);
                      }
                    }
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

function isEscalationResponse(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('human representative') ||
    lower.includes('human agent') ||
    lower.includes('human support') ||
    lower.includes('transferring you') ||
    lower.includes('escalat') ||
    lower.includes('manob protinidhir') ||
    lower.includes('manob protinidhi') ||
    lower.includes('hostantor') ||
    lower.includes('sthanantor') ||
    lower.includes('মানব প্রতিনিধি') ||
    lower.includes('স্থানান্তর') ||
    lower.includes('হস্তান্তর')
  );
}
