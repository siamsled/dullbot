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

async function fetchAndSaveUserProfile(
  senderId: string,
  accessToken: string,
  incomingChannel: string,
  conversationId: string
) {
  try {
    const fields = incomingChannel === 'instagram' ? 'name,profile_pic' : 'first_name,last_name,name,profile_pic';
    const res = await fetch(`https://graph.facebook.com/v19.0/${senderId}?fields=${fields}&access_token=${accessToken}`);
    if (res.ok) {
      const data = await res.json();
      const name = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
      const isValid = name && !['facebook user', 'facebook customer', 'instagram user', 'not provided', 'unknown'].includes(name.toLowerCase());
      const updatePayload: any = {
        meta_checked_at: new Date().toISOString()
      };
      if (isValid) {
        updatePayload.meta_name = name;
      }
      if (data.profile_pic) {
        updatePayload.meta_profile_pic = data.profile_pic;
      }
      if (isValid || data.profile_pic) {
        await supabaseAdmin
          .from('conversations')
          .update(updatePayload)
          .eq('id', conversationId);
      }
    }
  } catch (err) {
    console.error('Error fetching user profile in webhook:', err);
  }
}

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
              const messageText = (webhookEvent.message.text || '').trim();
              const attachments = webhookEvent.message.attachments || [];

              const imageUrls: string[] = [];
              const audioUrls: string[] = [];
              const videoUrls: string[] = [];

              for (const att of attachments) {
                const url = att.payload?.url || att.url;
                if (att.type === 'image' || att.type === 'sticker') {
                  if (url) imageUrls.push(url);
                } else if (att.type === 'audio') {
                  if (url) audioUrls.push(url);
                } else if (att.type === 'video') {
                  if (url) videoUrls.push(url);
                } else if (att.type === 'fallback' || att.type === 'share' || att.type === 'file') {
                  if (url) {
                    if (/\.(mp4|mov|avi|webm)(\?.*)?$/i.test(url)) {
                      videoUrls.push(url);
                    } else if (/\.(mp3|wav|m4a|ogg)(\?.*)?$/i.test(url)) {
                      audioUrls.push(url);
                    } else {
                      imageUrls.push(url);
                    }
                  }
                }
              }

              const primaryImageUrl = imageUrls[0];
              const primaryAudioUrl = audioUrls[0];
              const primaryVideoUrl = videoUrls[0];
              const replyToMid = webhookEvent.message.reply_to?.mid;

              if (!messageText && imageUrls.length === 0 && audioUrls.length === 0 && videoUrls.length === 0) continue;

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

              // Proactively fetch and cache customer Meta/IG profile name & pfp if missing
              if (!conversation.meta_name || !conversation.meta_profile_pic || !conversation.meta_checked_at) {
                fetchAndSaveUserProfile(senderId, shop.meta_page_access_token, incomingChannel, conversation.id).catch(() => {});
              }

              const mediaParts = [
                ...imageUrls.map(u => `IMAGE:${u}`),
                ...videoUrls.map(u => `VIDEO:${u}`),
                ...audioUrls.map(u => `AUDIO:${u}`),
              ].join(' ||| ');

              let dbContent = mediaParts || messageText;
              if (mediaParts && messageText) {
                dbContent = `${messageText} ||| ${mediaParts}`;
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

              if (imageUrls.length > 0 && !messageText) {
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

                  if (primaryImageUrl) {
                    prompt += `\nNote: The customer has sent an image which is attached to this request. Analyze the image to answer their query if relevant.`;
                  }
                  if (primaryAudioUrl) {
                    prompt += `\nNote: The customer has sent a voice message which is attached to this request. Listen to the audio to understand and answer their query.`;
                  }

                  let imagePart: any = null;
                  if (primaryImageUrl) {
                    try {
                      const imgRes = await fetch(primaryImageUrl);
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
                  if (primaryAudioUrl && (shop.handle_audio !== false)) {
                    try {
                      const audioRes = await fetch(primaryAudioUrl);
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
            const isFacebookComment = change.field === 'feed' && change.value?.item === 'comment' && (change.value?.verb === 'add' || !change.value?.verb);
            const isInstagramComment = (change.field === 'comments' || change.field === 'live_comments') && (change.value?.verb === 'add' || !change.value?.verb);

            // Debug: log ALL feed changes to DB so we can inspect what Meta sends
            if (change.field === 'feed' || change.field === 'comments' || change.field === 'live_comments') {
              console.log('[Webhook Feed Change]', JSON.stringify({ field: change.field, value: change.value }));
              // Persist incoming comment payload immediately regardless of automation state
              if ((isFacebookComment || isInstagramComment) && change.value?.comment_id) {
                const v = change.value;
                const commentId = v.comment_id || v.id;
                const postId = v.post_id || v.parent_id || v.media?.id || '';
                const commentText = v.message || v.text || '';
                const senderName = v.from?.name || v.from?.username || 'Customer';
                const senderId = v.from?.id || null;
                if (commentId && commentText.trim()) {
                  await supabaseAdmin.from('post_comments').upsert({
                    shop_id: shop.id,
                    post_id: postId,
                    comment_id: commentId,
                    sender_id: senderId,
                    sender_name: senderName,
                    comment_text: commentText,
                    created_at: new Date((v.created_time || v.timestamp || 0) * 1000 || Date.now()).toISOString(),
                  }, { onConflict: 'comment_id' });
                }
              }
            }

            if (isFacebookComment || isInstagramComment) {
              await handleCommentEvent(shop, change.value, incomingChannel);
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
async function handleCommentEvent(shop: any, value: any, channel: 'messenger' | 'instagram' = 'messenger') {
  try {
    const rawPostId = value.post_id || value.parent_id || value.media?.id || value.post?.id || value.target_id;
    const commentId: string = value.comment_id || value.id;
    const commentText: string = value.message || value.text || '';
    const commenterPsid: string | null = value.from?.id || value.sender?.id || null;
    const commenterName: string | null = value.from?.name || value.from?.username || value.sender_name || 'Customer';
    const commentCreatedAt = new Date((value.created_time || value.timestamp || 0) * 1000 || Date.now());

    if (!commentId || !commentText.trim()) {
      console.log('[handleCommentEvent] Skipping invalid payload:', { rawPostId, commentId, commentText });
      return;
    }
    if (!rawPostId) {
      console.log('[handleCommentEvent] No post_id in payload, comment already saved to DB:', commentId);
      return;
    }

    // Ignore bot's own comments from the page or IG account
    if (
      (shop.meta_page_id && commenterPsid === shop.meta_page_id) ||
      (shop.instagram_business_id && commenterPsid === shop.instagram_business_id)
    ) {
      console.log('[handleCommentEvent] Ignoring comment from page owner/bot itself.');
      return;
    }

    // Flexible Post ID matching (handles prefixed or non-prefixed IDs)
    const possiblePostIds = [
      String(rawPostId),
      value.post_id ? String(value.post_id) : null,
      value.parent_id ? String(value.parent_id) : null,
      value.media?.id ? String(value.media.id) : null,
    ].filter(Boolean) as string[];

    const { data: automations } = await supabaseAdmin
      .from('post_automations')
      .select('*')
      .eq('shop_id', shop.id);

    const automation = (automations || []).find((a: any) => {
      const aClean = a.post_id.includes('_') ? a.post_id.split('_').pop() : a.post_id;
      return possiblePostIds.some((pid: string) => {
        const pClean = pid.includes('_') ? pid.split('_').pop() : pid;
        return (
          a.post_id === pid ||
          aClean === pClean ||
          a.post_id.endsWith(`_${pClean}`) ||
          pid.endsWith(`_${aClean}`)
        );
      });
    });

    if (!automation) {
      console.log(`[handleCommentEvent] No active automation for post IDs:`, possiblePostIds);
      return;
    }

    const pageAccessToken: string = shop.meta_page_access_token;
    if (!pageAccessToken) {
      console.warn('[handleCommentEvent] No page access token available for shop:', shop.id);
      return;
    }

    // ── Idempotency: skip if we already processed this comment ────────────
    const { data: existingComment } = await supabaseAdmin
      .from('post_comments')
      .select('id, reply_text, is_deleted')
      .eq('comment_id', commentId)
      .maybeSingle();

    if (existingComment?.is_deleted) return; // already deleted

    // ── Delete offensive / toxic comments (Smart Brand Protection) ────────
    if (automation.delete_negative) {
      const examples = (automation.delete_examples as string[])?.length
        ? `\nCustom store owner trigger examples:\n- ${(automation.delete_examples as string[]).join('\n- ')}`
        : '';

      const deletePrompt = `You are an intelligent brand safety and content moderation AI for an e-commerce store's social media page (Facebook/Instagram).
Evaluate whether the customer comment below is offensive, abusive, profanity-laden, scam/spam, malicious defamation, competitor poaching, or harmful to the perception of the business.

Criteria to DELETE (delete = true):
- Profanity, obscenity, abusive slurs, or harassment
- Malicious/unsubstantiated claims of "scam", "fraud", "fake", or theft
- Competitor advertising, unsolicited links, crypto/job spam
- Toxic hostility or trolling damaging to brand perception

Criteria to KEEP (delete = false):
- Legitimate inquiries ("price koto?", "delivery time?", "size ache?", "is this available?")
- Normal customer support inquiries or order tracking questions
- Emojis, compliments, or constructive feedback

${examples}

Comment to evaluate: "${commentText}"

Respond ONLY with a JSON object: { "delete": true/false, "confidence": 0.0-1.0 }
Confidence >= 0.80 means delete. Default to false for genuine customer questions.`;

      const genAIForDelete = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const deleteModel = genAIForDelete.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      const deleteResult = await deleteModel.generateContent(deletePrompt);
      const deleteRaw = deleteResult.response.text().trim();

      try {
        const jsonMatch = deleteRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.delete === true && (parsed.confidence || 0) >= 0.80) {
            await deleteComment(commentId, pageAccessToken);
            await supabaseAdmin.from('post_comments').upsert({
              shop_id: shop.id,
              post_id: automation.post_id,
              comment_id: commentId,
              sender_id: commenterPsid,
              sender_name: commenterName,
              comment_text: commentText,
              is_deleted: true,
              is_negative: true,
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
    const dedupeWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour
    const { data: duplicate } = await supabaseAdmin
      .from('post_comments')
      .select('reply_text')
      .eq('post_id', automation.post_id)
      .eq('comment_text', commentText)
      .gte('created_at', dedupeWindow)
      .not('reply_text', 'is', null)
      .maybeSingle();

    let replyText: string;

    if (duplicate?.reply_text) {
      // Serve cached reply — no model call
      replyText = duplicate.reply_text;
    } else {
      // ── Build AI reply prompt ─────────────────────────────────────────────
      let productContext = '';
      if (automation.product_ids?.length > 0) {
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('name, price, currency')
          .in('id', automation.product_ids)
          .eq('is_active', true);
        if (products?.length) {
          productContext = `\n\nAttached products for this post:\n${products.map((p: any) => `- ${p.name}: ${p.price} ${p.currency || 'BDT'}`).join('\n')}`;
        }
      }

      // SYSTEM GUARDRAIL — non-overridable
      const guardrail = `CRITICAL RULE (non-negotiable, overrides all other instructions):
Public comment replies must NEVER contain order details, payment status, transaction references, or any customer-specific personal information. If a reply would require any of that, end with "Please check your inbox for details 🙏" instead.`;

      const systemPrompt = `You are a helpful customer service assistant replying to a public comment on a Facebook/Instagram post.

${guardrail}

Owner instructions for this post:
${automation.instructions || 'Be helpful, friendly, and concise. Respond in the language of the comment (Bangla, English, or Banglish).'}
${productContext}

Rules:
- Keep public replies SHORT (1-2 sentences max)
- Be warm, courteous, and on-brand
- If the comment is a price inquiry ("pp", "price", "koto", "daam koto", "দাম কত" etc.), give the price if known from attached products, or invite them to inbox
- Do not include any personal data in the public reply`;

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      const result = await model.generateContent({
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: `Comment from ${commenterName}: "${commentText}"` }] }],
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

    // ── Store comment record in DB ───────────────────────────────────────────
    await supabaseAdmin.from('post_comments').upsert({
      shop_id: shop.id,
      post_id: automation.post_id,
      comment_id: commentId,
      sender_id: commenterPsid,
      sender_name: commenterName,
      comment_text: commentText,
      reply_text: replyText,
      is_deleted: false,
      is_negative: false,
    }, { onConflict: 'comment_id' });

    // ── Post public comment reply (Phase 3) ──────────────────────────────────
    if (automation.reply_as_comment) {
      const pubRes = await replyToComment(commentId, replyText, pageAccessToken);
      console.log(`[handleCommentEvent] Public reply response for comment ${commentId}:`, pubRes);
    }

    // ── Send private Messenger reply (Phase 4) ────────────────────────────
    if (automation.send_as_messenger && commenterPsid) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const withinWindow = commentCreatedAt > sevenDaysAgo;

      if (withinWindow) {
        const privateReplyText = replyText.includes('check your inbox')
          ? `Hi ${commenterName}! Thanks for your comment. ${replyText.replace('Please check your inbox for details 🙏', '')} We sent you more details here!`
          : replyText;

        const prResult = await sendPrivateReply(commentId, privateReplyText, pageAccessToken);
        console.log(`[handleCommentEvent] Private reply response for comment ${commentId}:`, prResult);
      }
    }
  } catch (err) {
    console.error('[handleCommentEvent] Error processing comment:', err);
  }
}

