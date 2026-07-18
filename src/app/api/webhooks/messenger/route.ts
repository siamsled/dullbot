import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { billGeminiCall } from '@/lib/chat-pipeline';
import { invokeGemini, fetchAndCompressImagePart } from '@/lib/gemini';
import { handleOrderCreationIntercept, processPaymentVerification } from '@/lib/order-manager';
import { sendMetaMessage } from '@/lib/meta-api';
import sharp from 'sharp';


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
          .select('*')
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

              // 1. Insert incoming message (use IMAGE:url or AUDIO:url prefix for rendering in client)
              let dbContent = imageUrl ? `IMAGE:${imageUrl}` : (audioUrl ? `AUDIO:${audioUrl}` : messageText);
              
              // If both image and text exist, preserve the text!
              if (imageUrl && messageText) {
                dbContent = `[IMAGE_WITH_CAPTION] ${messageText} ||| IMAGE:${imageUrl}`;
              }

              let repliedMsgContent: string | null = null;
              if (replyToMid) {
                const { data: repliedMsg } = await supabaseAdmin
                  .from('messages')
                  .select('content')
                  .contains('fb_message_ids', [replyToMid])
                  .single();
                  
                if (repliedMsg) {
                  repliedMsgContent = repliedMsg.content;
                  dbContent = `[Replying to bot's message: "${repliedMsg.content}"] ${dbContent}`;
                }
              }

              // Deduplicate: Facebook will retry webhooks if they timeout or fail.
              if (webhookEvent.message.mid) {
                const { data: existingMsg } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .contains('fb_message_ids', [webhookEvent.message.mid])
                  .single();

                if (existingMsg) {
                  console.log(`[Webhook] Duplicate message mid ${webhookEvent.message.mid} detected. Skipping.`);
                  continue;
                }
              }

              const { data: insertedMsg } = await supabaseAdmin
                .from('messages')
                .insert({
                  conversation_id: conversation.id,
                  sender: 'customer',
                  content: dbContent,
                  fb_message_ids: webhookEvent.message.mid ? [webhookEvent.message.mid] : null
                })
                .select('id, created_at')
                .single();

              // 1.5. Wait for text if it's just an image
              if (imageUrl && !messageText) {
                await new Promise(res => setTimeout(res, 8000)); // wait 8 seconds

                const { data: newerMessages } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .eq('conversation_id', conversation.id)
                  .eq('sender', 'customer')
                  .gt('created_at', insertedMsg?.created_at || new Date().toISOString())
                  .limit(1);

                if (newerMessages && newerMessages.length > 0) {
                  console.log("Newer text message detected after image. Aborting image webhook to let text webhook handle it.");
                  continue; // Skip the rest of this webhook entry, the newer webhook will handle it!
                }
              }

              // 2. Queue / Lock system to prevent interleaving race condition
              const lockKey = `webhook_lock_${conversation.id}`;
              let isLocked = true;
              let lockAttempts = 0;

              while (isLocked && lockAttempts < 15) {
                const { data: lockRecord } = await supabaseAdmin
                  .from('response_cache')
                  .select('expires_at')
                  .eq('shop_id', shop.id)
                  .eq('cache_key', lockKey)
                  .maybeSingle();
                  
                if (!lockRecord || new Date(lockRecord.expires_at) < new Date()) {
                  isLocked = false;
                  break;
                }
                
                // wait 1 second
                await new Promise(res => setTimeout(res, 1000));
                lockAttempts++;
              }

              // Acquire the lock
              await supabaseAdmin.from('response_cache').upsert({
                shop_id: shop.id,
                cache_key: lockKey,
                response_text: 'locked',
                expires_at: new Date(Date.now() + 30000).toISOString()
              }, { onConflict: 'shop_id,cache_key' });

              try {
                // 3. If bot is active, trigger AI
                if (conversation.status === 'bot_active') {
                  // Intercept for payment claims first
                  const paymentReply = await processPaymentVerification(conversation.id, shop.id, dbContent);
                  if (paymentReply) {
                    const { data: insertedMsg } = await supabaseAdmin
                      .from('messages')
                      .insert({
                        conversation_id: conversation.id,
                        sender: 'bot',
                        content: paymentReply
                      })
                      .select('id')
                      .single();

                    const metaRes = await sendMetaMessage(senderId, paymentReply, shop.slug);
                    if (metaRes.success && metaRes.messageId && insertedMsg) {
                      await supabaseAdmin
                        .from('messages')
                        .update({ fb_message_ids: [metaRes.messageId] })
                        .eq('id', insertedMsg.id);
                    }
                    continue;
                  }

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
                
                if (history && history.length > 0) {
                  // Pop the last message because it's the current one being processed
                  history.pop();
                }
                
                const historyParts = await Promise.all(history.map(async msg => {
                  if (msg.content.startsWith('IMAGE:')) {
                    const url = msg.content.replace('IMAGE:', '').trim();
                    const imgPart = await fetchAndCompressImagePart(url);
                    const parts: any[] = [{ text: '[Sent an image]' }];
                    if (imgPart) parts.push(imgPart);
                    return {
                      role: (msg.sender === 'bot' ? 'model' : 'user') as 'user' | 'model',
                      parts
                    };
                  }
                  const textContent = msg.content.startsWith('AUDIO:') 
                    ? '[Sent a voice message]' 
                    : msg.content;
                  return {
                    role: (msg.sender === 'bot' ? 'model' : 'user') as 'user' | 'model',
                    parts: [{ text: textContent }]
                  };
                }));


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
                  .select('id, name, description, price, stock_quantity, currency, image_url')
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

                let persona = null;
                if (shop.persona_id) {
                  const { data: pData } = await supabaseAdmin
                    .from('agent_personas')
                    .select('*')
                    .eq('id', shop.persona_id)
                    .single();
                  if (pData) {
                    if (shop.persona_custom_name) pData.name = shop.persona_custom_name;
                    persona = pData;
                  }
                }

                 const { data: activeOrders } = await supabaseAdmin
                  .from('orders')
                  .select('*, products(price)')
                  .eq('conversation_id', conversation.id)
                  .order('created_at', { ascending: false });

                let systemPrompt = buildSystemPrompt(shopWithInstructions, persona, products || [], exampleReplies || [], activeOrders || []);

                // Customer context
                systemPrompt += `\n\nCUSTOMER DETAILS:
                - Name: ${customerName}
                - Gender: ${customerGender}
                
                GENDER AND HONORIFICS RULE:
                If the gender is "unknown", you must deduce the gender based on the customer's name (e.g., Anik is male, Sadia is female). Use the appropriate honorific (bhaiya/apu) if your persona requires it. If the name is ambiguous, do NOT use gender-specific honorifics like "bhaiya" or "apu", simply speak politely without them. NEVER use both at the same time (e.g. "apu/bhaiya").`;

                let prompt = systemPrompt;

                if (imageUrl) {
                  prompt += `\nNote: The customer has sent an image which is attached to this request. Analyze the image to answer their query if relevant.`;
                }
                if (audioUrl) {
                  prompt += `\nNote: The customer has sent a voice message which is attached to this request. Listen to the audio to understand and answer their query.`;
                }

                let imagePart: any = null;
                if (imageUrl) {
                  try {
                    const imgRes = await fetch(imageUrl);
                    if (imgRes.ok) {
                      const buffer = await imgRes.arrayBuffer();
                      
                      // Compress image to a max of 256x256 to ensure it only takes 1 Gemini tile (258 tokens instead of 1032)
                      const compressedBuffer = await sharp(buffer)
                        .resize({ width: 256, height: 256, fit: 'inside' })
                        .webp({ quality: 80 })
                        .toBuffer();

                      const base64 = compressedBuffer.toString('base64');
                      const mime = 'image/webp';
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
                if (audioUrl && (shop.handle_audio !== false)) {
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
                  const mediaParts: any[] = [];
                  if (imagePart) mediaParts.push(imagePart);
                  if (audioPart) mediaParts.push(audioPart);

                  let geminiMessageText = messageText;
                  if (repliedMsgContent) {
                    geminiMessageText = `[Customer is replying to the following specific message from you: "${repliedMsgContent}"]\n\nCustomer's response: ${geminiMessageText || '(Sent an attachment)'}`;
                  }

                  const aiResponse = await invokeGemini(prompt, geminiMessageText, historyParts, null, mediaParts);

                  if (aiResponse.success) {
                    await billGeminiCall(
                      shop.id,
                      conversation.id,
                      aiResponse.inputTokens ?? 0,
                      aiResponse.outputTokens ?? 0,
                      false,
                      false
                    );
                  }

                  let aiResponseText = aiResponse.success ? (aiResponse.text || '') : (aiResponse.error || "Error occurred.");
                  aiResponseText = aiResponseText.trim();

                  if (aiResponse.success && aiResponseText) {
                    const intercept = await handleOrderCreationIntercept(conversation.id, shop.id, aiResponseText);
                    aiResponseText = intercept.cleanedText;
                  }

                  if (aiResponseText) {
                    let ticketReason: string | null = null;
                    if (aiResponseText.includes('[ESCALATION: COMPLAINT]')) {
                      ticketReason = 'complaint';
                      aiResponseText = aiResponseText.replace('[ESCALATION: COMPLAINT]', '').trim();
                    } else if (aiResponseText.includes('[ESCALATION: UNSURE]')) {
                      ticketReason = 'unsure';
                      aiResponseText = aiResponseText.replace('[ESCALATION: UNSURE]', '').trim();
                    } else if (aiResponseText.includes('[ESCALATION: FLAG ABUSE]')) {
                      ticketReason = 'abusive_customer';
                      aiResponseText = aiResponseText.replace('[ESCALATION: FLAG ABUSE]', '').trim();
                      
                      // Also flag internally
                      const { flagCustomerAsFraud } = await import('@/app/dashboard/inbox/actions');
                      await flagCustomerAsFraud(conversation.id, 'Repeated abusive language');
                    } else if (aiResponseText.includes('[ESCALATION: BLOCK ABUSE]')) {
                      ticketReason = 'abusive_customer';
                      aiResponseText = aiResponseText.replace('[ESCALATION: BLOCK ABUSE]', '').trim();
                      
                      // Flag and block
                      const { flagCustomerAsFraud } = await import('@/app/dashboard/inbox/actions');
                      await flagCustomerAsFraud(conversation.id, 'Repeated abusive language - Auto Blocked');
                    } else if (isEscalationResponse(aiResponseText)) {
                      ticketReason = 'complaint';
                    }

                    // Parse out Markdown images and text bubbles in precise order
                    const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
                    const markdownImageExtractRegex = /!\[.*?\]\((.*?)\)/;
                    
                    const cleanedText = aiResponseText.trim();
                    const chunks = cleanedText ? cleanedText.split('|||').map(s => s.trim()).filter(Boolean) : [];
                    
                    const segments: { type: 'text' | 'image', content: string }[] = [];
                    for (const chunk of chunks) {
                      const parts = chunk.split(markdownImageSplitRegex);
                      for (const part of parts) {
                        if (!part) continue;
                        
                        const imgMatch = part.match(markdownImageExtractRegex);
                        if (imgMatch) {
                          segments.push({ type: 'image', content: imgMatch[1] });
                        } else {
                          const trimmedText = part.trim();
                          if (trimmedText) {
                            segments.push({ type: 'text', content: trimmedText });
                          }
                        }
                      }
                    }

                    // Insert AI message into database FIRST so we don't lose it if Meta API fails
                    const { data: insertedMsg } = await supabaseAdmin
                      .from('messages')
                      .insert({
                        conversation_id: conversation.id,
                        sender: 'bot',
                        content: aiResponseText,
                        fb_message_ids: null // Will update later if needed
                      })
                      .select()
                      .single();

                    let capturedMids: string[] = [];

                    // Send to Meta Graph API
                    if (shop.meta_page_access_token) {
                      for (const segment of segments) {
                        if (segment.type === 'text') {
                          const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              messaging_type: "RESPONSE",
                              recipient: { id: senderId },
                              message: { text: segment.content }
                            })
                          });
                          
                          if (!fbRes.ok) {
                            const fbErr = await fbRes.json();
                            throw new Error(`Meta API Rejected: ${JSON.stringify(fbErr.error) || 'Unknown error'}`);
                          } else {
                            const fbData = await fbRes.json();
                            if (fbData.message_id) capturedMids.push(fbData.message_id);
                          }
                        } else if (segment.type === 'image') {
                          const fbImgRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              messaging_type: "RESPONSE",
                              recipient: { id: senderId },
                              message: {
                                attachment: {
                                  type: "image",
                                  payload: { url: segment.content, is_reusable: true }
                                }
                              }
                            })
                          });
                          if (!fbImgRes.ok) {
                            console.error("Failed to send image attachment to Messenger:", await fbImgRes.json());
                            // Fallback to sending the URL as text
                            const fbFallbackRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                messaging_type: "RESPONSE",
                                recipient: { id: senderId },
                                message: { text: `[Image]: ${segment.content}` }
                              })
                            });
                            if (fbFallbackRes.ok) {
                               const fbData = await fbFallbackRes.json();
                               if (fbData.message_id) capturedMids.push(fbData.message_id);
                            }
                          } else {
                            const fbImgData = await fbImgRes.json();
                            if (fbImgData.message_id) capturedMids.push(fbImgData.message_id);
                          }
                        }
                      }

                      if (capturedMids.length > 0 && insertedMsg) {
                        await supabaseAdmin
                          .from('messages')
                          .update({ fb_message_ids: capturedMids })
                          .eq('id', insertedMsg.id);
                      }
                    }

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
                    
                  // Gracefully escalate to human ONLY if it's an AI failure, not a Meta API rejection
                  const isMetaError = aiError instanceof Error && aiError.message.includes('Meta API Rejected');
                  if (!isMetaError) {
                    await supabaseAdmin
                      .from('conversations')
                      .update({ status: 'human_takeover', ticket_reason: 'System Error: AI failed' })
                      .eq('id', conversation.id);
                  }
                }
              }

              // Update last_message_at
              await supabaseAdmin
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversation.id);
                
              } finally {
                // Release the lock
                await supabaseAdmin
                  .from('response_cache')
                  .delete()
                  .eq('shop_id', shop.id)
                  .eq('cache_key', lockKey);
              }
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
