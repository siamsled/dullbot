import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { billGeminiCall } from '@/lib/chat-pipeline';
import { invokeGemini, fetchAndCompressImagePart } from '@/lib/gemini';
import { handleOrderCreationIntercept, processPaymentVerification } from '@/lib/order-manager';
import { sendMetaMessage, replyToComment, sendPrivateReply, deleteComment } from '@/lib/meta-api';
import sharp from 'sharp';


function getRepliedSegment(content: string, fbMessageIds: string[] | null, replyToMid: string): string {
  if (!fbMessageIds || !fbMessageIds.includes(replyToMid)) {
    return content;
  }
  const idx = fbMessageIds.indexOf(replyToMid);
  const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
  const markdownImageExtractRegex = /!\[.*?\]\((.*?)\)/;
  const chunks = content ? content.split('|||').map(s => s.trim()).filter(Boolean) : [];

  const segments: { raw: string; isImage: boolean }[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(markdownImageSplitRegex);
    for (const part of parts) {
      if (!part) continue;
      const imgMatch = part.match(markdownImageExtractRegex);
      if (imgMatch) {
        segments.push({ raw: part, isImage: true });
      } else {
        const trimmedText = part.trim();
        if (trimmedText) {
          segments.push({ raw: trimmedText, isImage: false });
        }
      }
    }
  }

  if (idx >= 0 && idx < segments.length) {
    const seg = segments[idx];
    return seg.isImage ? `[Product Image] ${seg.raw}` : seg.raw;
  }
  return content;
}

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
    console.log('[Meta Webhook Incoming Payload]:', JSON.stringify(body, null, 2));

    // Accept both 'page' (Messenger + Facebook feed) and 'instagram' (Instagram DM) objects
    if (body.object === 'page' || body.object === 'instagram') {
      const incomingChannel: 'messenger' | 'instagram' = body.object === 'instagram' ? 'instagram' : 'messenger';

      for (const entry of body.entry) {
        const pageId = entry.id;

        // Look up via shop_meta_pages for multi-page routing (matches meta_page_id OR instagram_business_id)
        // ORDER by instagram_business_id nulls-last so the row WITH IG wins when the same page exists in multiple shops
        const { data: pageRows } = await supabaseAdmin
          .from('shop_meta_pages')
          .select('shop_id, meta_page_access_token, instagram_business_id, instagram_access_token')
          .or(`meta_page_id.eq.${pageId},instagram_business_id.eq.${pageId}`)
          .order('instagram_business_id', { ascending: false, nullsFirst: false });
        // For Instagram channel, prefer the row with instagram_business_id set; else pick first
        const pageRow = incomingChannel === 'instagram'
          ? (pageRows?.find(r => r.instagram_business_id) ?? pageRows?.[0] ?? null)
          : (pageRows?.[0] ?? null);

        let shop: any = null;
        if (pageRow) {
          const { data: shopData } = await supabaseAdmin
            .from('shops')
            .select('*')
            .eq('id', pageRow.shop_id)
            .single();
          if (shopData) {
            const tokenToUse = (incomingChannel === 'instagram' && pageRow.instagram_access_token)
              ? pageRow.instagram_access_token
              : pageRow.meta_page_access_token;
            shop = { ...shopData, meta_page_access_token: tokenToUse };
          }
        } else {
          // Fallback: direct shops lookup (matches meta_page_id OR instagram_business_id)
          const { data: shopDataRows } = await supabaseAdmin
            .from('shops')
            .select('*')
            .or(`meta_page_id.eq.${pageId},instagram_business_id.eq.${pageId}`)
            .order('instagram_business_id', { ascending: false, nullsFirst: false });
          const shopData = incomingChannel === 'instagram'
            ? (shopDataRows?.find(r => r.instagram_business_id) ?? shopDataRows?.[0] ?? null)
            : (shopDataRows?.[0] ?? null);
          if (shopData) {
            const tokenToUse = (incomingChannel === 'instagram' && shopData.instagram_access_token)
              ? shopData.instagram_access_token
              : shopData.meta_page_access_token;
            shop = { ...shopData, meta_page_access_token: tokenToUse };
          }
        }

        if (!shop) {
          console.warn(`No shop found for page/IG ID: ${pageId} (channel: ${incomingChannel})`);
          try {
            await supabaseAdmin.from('webhook_dead_letters').insert({
              object: body.object,
              page_id: pageId,
              channel: incomingChannel,
              raw_payload: entry,
              error_reason: `No shop found for page/IG ID: ${pageId}`
            });
          } catch (dlErr) {
            console.error('Failed to log dead letter:', dlErr);
          }
          continue;
        }

        const eventsToProcess = [
          ...(entry.messaging || []),
          ...(entry.changes?.filter((c: any) => c.field === 'messages').map((c: any) => c.value) || [])
        ];

        if (eventsToProcess.length > 0) {
          for (const webhookEvent of eventsToProcess) {
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
                    channel: incomingChannel,
                    status: 'bot_active'
                  })
                  .select()
                  .single();
                conversation = newConv;
              } else {
                const updateData: any = {};
                if (conversation.channel !== incomingChannel) updateData.channel = incomingChannel;
                if (conversation.status === 'closed') updateData.status = 'bot_active';
                if (Object.keys(updateData).length > 0) {
                  const { data: updatedConv } = await supabaseAdmin
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversation.id)
                    .select()
                    .single();
                  conversation = updatedConv || { ...conversation, ...updateData };
                }
              }

              if (!conversation) continue;

              let dbContent = imageUrl ? `IMAGE:${imageUrl}` : (audioUrl ? `AUDIO:${audioUrl}` : messageText);

              if (imageUrl && messageText) {
                dbContent = `[IMAGE_WITH_CAPTION] ${messageText} ||| IMAGE:${imageUrl}`;
              }

              let repliedMsgContent: string | null = null;
              if (replyToMid) {
                const { data: repliedMsg } = await supabaseAdmin
                  .from('messages')
                  .select('content, fb_message_ids')
                  .contains('fb_message_ids', [replyToMid])
                  .single();

                if (repliedMsg) {
                  repliedMsgContent = getRepliedSegment(repliedMsg.content, repliedMsg.fb_message_ids, replyToMid);
                  dbContent = `[Replying to bot's message: "${repliedMsgContent}"] ${dbContent}`;
                }
              }

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

              if (imageUrl && !messageText) {
                await new Promise(res => setTimeout(res, 8000));
                const { data: newerMessages } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .eq('conversation_id', conversation.id)
                  .eq('sender', 'customer')
                  .gt('created_at', insertedMsg?.created_at || new Date().toISOString())
                  .limit(1);

                if (newerMessages && newerMessages.length > 0) {
                  console.log("Newer text message detected after image. Aborting image webhook to let text webhook handle it.");
                  continue;
                }
              }

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
                await new Promise(res => setTimeout(res, 1000));
                lockAttempts++;
              }

              await supabaseAdmin.from('response_cache').upsert({
                shop_id: shop.id,
                cache_key: lockKey,
                response_text: 'locked',
                expires_at: new Date(Date.now() + 30000).toISOString()
              }, { onConflict: 'shop_id,cache_key' });

              try {
                if (conversation.status === 'bot_active' || conversation.status === 'human_takeover') {
                  const isTakeover = conversation.status === 'human_takeover';

                  if (!isTakeover) {
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
                  }

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

                  const { data: customInstructions } = await supabaseAdmin
                    .from('quick_replies')
                    .select('response_text')
                    .eq('shop_id', shop.id)
                    .eq('trigger_pattern', '__ai_instructions__')
                    .maybeSingle();

                  const { data: products } = await supabaseAdmin
                    .from('products')
                    .select('id, name, description, price, stock_quantity, currency, image_url, product_images(url, position, variant_id)')
                    .eq('shop_id', shop.id)
                    .eq('is_active', true)
                    .eq('draft', false)
                    .gt('stock_quantity', 0);

                  const { data: productMedia } = await supabaseAdmin
                    .from('product_media')
                    .select('product_id, url, media_type, tags')
                    .eq('shop_id', shop.id);

                  const { data: exampleReplies } = await supabaseAdmin
                    .from('example_replies')
                    .select('customer_message, ideal_reply')
                    .eq('shop_id', shop.id)
                    .limit(10);

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

                  let systemPrompt = buildSystemPrompt(shopWithInstructions, persona, products || [], exampleReplies || [], activeOrders || [], productMedia || []);

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
                        const { flagCustomerAsFraud } = await import('@/app/dashboard/inbox/actions');
                        await flagCustomerAsFraud(conversation.id, 'Repeated abusive language');
                      } else if (aiResponseText.includes('[ESCALATION: BLOCK ABUSE]')) {
                        ticketReason = 'abusive_customer';
                        aiResponseText = aiResponseText.replace('[ESCALATION: BLOCK ABUSE]', '').trim();
                        const { flagCustomerAsFraud } = await import('@/app/dashboard/inbox/actions');
                        await flagCustomerAsFraud(conversation.id, 'Repeated abusive language - Auto Blocked');
                      } else if (isEscalationResponse(aiResponseText)) {
                        ticketReason = 'complaint';
                      }

                      const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
                      const markdownImageExtractRegex = /!\[(.*?)\]\((.*?)\)/;
                      const chunks = aiResponseText.split('|||').map(s => s.trim()).filter(Boolean);

                      const segments: { type: 'text' | 'image' | 'video', content: string }[] = [];
                      for (const chunk of chunks) {
                        const parts = chunk.split(markdownImageSplitRegex);
                        for (const part of parts) {
                          if (!part) continue;
                          const imgMatch = part.match(markdownImageExtractRegex);
                          if (imgMatch) {
                            const type = imgMatch[1] === 'video' ? 'video' : 'image';
                            segments.push({ type, content: imgMatch[2] });
                          } else {
                            const trimmedText = part.trim();
                            if (trimmedText) {
                              segments.push({ type: 'text', content: trimmedText });
                            }
                          }
                        }
                      }

                      if (isTakeover) {
                        await supabaseAdmin
                          .from('conversations')
                          .update({ suggested_reply: aiResponseText })
                          .eq('id', conversation.id);
                      } else {
                        const { data: insertedMsg } = await supabaseAdmin
                          .from('messages')
                          .insert({
                            conversation_id: conversation.id,
                            sender: 'bot',
                            content: aiResponseText,
                            fb_message_ids: null
                          })
                          .select()
                          .single();

                        let capturedMids: string[] = [];
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
                              if (fbRes.ok) {
                                const fbData = await fbRes.json();
                                if (fbData.message_id) capturedMids.push(fbData.message_id);
                              }
                            } else if (segment.type === 'image' || segment.type === 'video') {
                              const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  messaging_type: "RESPONSE",
                                  recipient: { id: senderId },
                                  message: {
                                    attachment: {
                                      type: segment.type,
                                      payload: { url: segment.content, is_reusable: true }
                                    }
                                  }
                                })
                              });
                              if (fbRes.ok) {
                                const fbData = await fbRes.json();
                                if (fbData.message_id) capturedMids.push(fbData.message_id);
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

                        if (ticketReason) {
                          await supabaseAdmin
                            .from('conversations')
                            .update({ status: 'human_takeover', ticket_reason: ticketReason })
                            .eq('id', conversation.id);
                        }
                      }
                    }
                  } catch (aiError) {
                    console.error("AI Generation or Sending Error:", aiError);
                    await supabaseAdmin
                      .from('messages')
                      .insert({
                        conversation_id: conversation.id,
                        sender: 'bot',
                        content: `[SYSTEM ERROR] Failed to reply: ${aiError instanceof Error ? aiError.message : String(aiError)}`
                      });

                    const isMetaError = aiError instanceof Error && aiError.message.includes('Meta API Rejected');
                    if (!isMetaError) {
                      await supabaseAdmin
                        .from('conversations')
                        .update({ status: 'human_takeover', ticket_reason: 'System Error: AI failed' })
                        .eq('id', conversation.id);
                    }
                  }
                }

                const { data: latestMsg } = await supabaseAdmin
                  .from('messages')
                  .select('content')
                  .eq('conversation_id', conversation.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                const snippet = latestMsg?.content || dbContent;

                await supabaseAdmin
                  .from('conversations')
                  .update({
                    last_message_at: new Date().toISOString(),
                    last_message_content: snippet,
                    unread_count: (conversation.unread_count || 0) + 1
                  })
                  .eq('id', conversation.id);

              } finally {
                await supabaseAdmin
                  .from('response_cache')
                  .delete()
                  .eq('shop_id', shop.id)
                  .eq('cache_key', lockKey);
              }
            }
          }
        }
        // ── Feed / Comment events ──────────────────────────────────────────
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value?.item === 'comment' && change.value?.verb === 'add') {
              await handleCommentEvent(shop, change.value);
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

// ── Normalise comment text for deduplication ───────────────────────────────
function normalizeCommentText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

// ── Comment automation handler (Phase 3-5) ────────────────────────────────
async function handleCommentEvent(shop: any, value: any) {
  try {
    const postId: string = value.post_id || value.parent_id;
    const commentId: string = value.comment_id;
    const commentText: string = value.message || '';
    const commenterPsid: string | null = value.sender?.id || null;
    const commentCreatedAt = new Date((value.created_time || 0) * 1000);

    if (!postId || !commentId || !commentText.trim()) return;

    // Look up automation config for this post
    const { data: automation } = await supabaseAdmin
      .from('post_automations')
      .select('*, products:product_ids')
      .eq('shop_id', shop.id)
      .eq('post_id', postId)
      .single();

    if (!automation) return; // No automation configured for this post

    const pageAccessToken: string = shop.meta_page_access_token;
    if (!pageAccessToken) return;

    // ── Idempotency: skip if we already processed this comment ────────────
    const { data: existingComment } = await supabaseAdmin
      .from('post_comments')
      .select('id, private_reply_sent, deleted_at')
      .eq('comment_id', commentId)
      .maybeSingle();

    if (existingComment?.deleted_at) return; // already deleted

    // ── Delete negative comments (Phase 5) ─────────────────────────────────
    if (automation.delete_negative && automation.delete_examples?.length > 0) {
      const examples = (automation.delete_examples as string[]).join('\n- ');
      const deletePrompt = `You are a content moderation classifier for a business page.

Example comments that SHOULD be deleted (spam, abuse, harassment):
- ${examples}

New comment to evaluate: "${commentText}"

Respond ONLY with a JSON object: { "delete": true/false, "confidence": 0.0-1.0 }
A confidence above 0.85 means delete. Default to not deleting if uncertain.`;

      const genAIForDelete = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const deleteModel = genAIForDelete.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const deleteResult = await deleteModel.generateContent(deletePrompt);
      const deleteRaw = deleteResult.response.text().trim();

      try {
        const jsonMatch = deleteRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.delete === true && (parsed.confidence || 0) >= 0.85) {
            await deleteComment(commentId, pageAccessToken);
            await supabaseAdmin.from('post_comments').upsert({
              shop_id: shop.id,
              post_id: postId,
              comment_id: commentId,
              commenter_psid: commenterPsid,
              comment_text: commentText,
              comment_text_normalized: normalizeCommentText(commentText),
              deleted_at: new Date().toISOString(),
            }, { onConflict: 'comment_id' });
            return; // deleted — no need to reply
          }
        }
      } catch {
        // JSON parse failed — leave comment alone
      }
    }

    if (!automation.reply_as_comment && !automation.send_as_messenger) return;

    // ── Deduplication ────────────────────────────────────────────────────────
    const normalized = normalizeCommentText(commentText);
    const dedupeWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour
    const { data: duplicate } = await supabaseAdmin
      .from('post_comments')
      .select('reply_text')
      .eq('post_id', postId)
      .eq('comment_text_normalized', normalized)
      .gte('created_at', dedupeWindow)
      .not('reply_text', 'is', null)
      .maybeSingle();

    let replyText: string;

    if (duplicate?.reply_text) {
      // Serve cached reply — no model call
      replyText = duplicate.reply_text;
    } else {
      // ── Build AI reply prompt ─────────────────────────────────────────────
      // Fetch attached products if any
      let productContext = '';
      if (automation.product_ids?.length > 0) {
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('name, price, currency')
          .in('id', automation.product_ids)
          .eq('is_active', true);
        if (products?.length) {
          productContext = `\n\nAttached products for this post:\n${products.map(p => `- ${p.name}: ${p.price} ${p.currency || 'BDT'}`).join('\n')}`;
        }
      }

      // SYSTEM GUARDRAIL — non-overridable
      const guardrail = `CRITICAL RULE (non-negotiable, overrides all other instructions):
Public comment replies must NEVER contain order details, payment status, transaction references, or any customer-specific personal information. If a reply would require any of that, end with "Please check your inbox for details 🙏" instead.`;

      const systemPrompt = `You are a helpful customer service assistant replying to a public comment on a Facebook/Instagram post.

${guardrail}

Owner instructions for this post:
${automation.instructions || 'Be helpful, friendly, and concise. Respond in the language of the comment.'}
${productContext}

Rules:
- Keep public replies SHORT (1-3 sentences max)
- Be warm and on-brand
- If the comment is a price inquiry ("pp", "price", "koto", "daam koto" etc.), give the price if you know it from the attached products, or ask them to DM
- Do not include any personal data in the public reply`;

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: `Comment: "${commentText}"` }] }],
      });
      replyText = result.response.text().trim();
      await billGeminiCall(
        shop.id,
        null,
        result.response.usageMetadata?.promptTokenCount || 0,
        result.response.usageMetadata?.candidatesTokenCount || 0,
        false,
        false
      );
    }

    // ── Store comment record ─────────────────────────────────────────────────
    await supabaseAdmin.from('post_comments').upsert({
      shop_id: shop.id,
      post_id: postId,
      comment_id: commentId,
      commenter_psid: commenterPsid,
      comment_text: commentText,
      comment_text_normalized: normalized,
      reply_text: replyText,
      replied_at: automation.reply_as_comment ? new Date().toISOString() : null,
    }, { onConflict: 'comment_id' });

    // ── Post public comment reply (Phase 3) ──────────────────────────────────
    if (automation.reply_as_comment) {
      await replyToComment(commentId, replyText, pageAccessToken);
    }

    // ── Send private Messenger reply (Phase 4) ────────────────────────────
    if (automation.send_as_messenger && commenterPsid) {
      const alreadySent = existingComment?.private_reply_sent;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const withinWindow = commentCreatedAt > sevenDaysAgo;

      if (!alreadySent && withinWindow) {
        // For private reply, we can be more specific (product prices, DM-appropriate detail)
        const privateReplyText = replyText.includes('check your inbox')
          ? `Hi! Thanks for your comment. ${replyText.replace('Please check your inbox for details 🙏', '')} We sent you more details here in your inbox!`
          : replyText;

        const prResult = await sendPrivateReply(commentId, privateReplyText, pageAccessToken);
        if (prResult.success) {
          await supabaseAdmin
            .from('post_comments')
            .update({ private_reply_sent: true, private_reply_sent_at: new Date().toISOString() })
            .eq('comment_id', commentId);
        }
      }
    }
  } catch (err) {
    console.error('[handleCommentEvent] Error processing comment:', err);
  }
}

