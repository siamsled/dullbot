import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { billGeminiCall } from '@/lib/chat-pipeline';
import { invokeGemini } from '@/lib/gemini';
import { handleOrderCreationIntercept, processPaymentVerification } from '@/lib/order-manager';
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  isWhatsAppSessionActive,
} from '@/lib/meta-api';

const VERIFY_TOKEN = process.env.META_GLOBAL_VERIFY_TOKEN;

// GET — webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse('Bad Request', { status: 400 });
}

// POST — incoming WhatsApp message
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('Not Found', { status: 404 });
    }

    for (const entry of body.entry) {
      const wabaid: string = entry.id;

      // Find shop by WhatsApp Business Account ID
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('whatsapp_business_account_id', wabaid)
        .single();

      if (!shop) {
        console.warn(`[WA Webhook] No shop found for WABAID: ${wabaid}`);
        continue;
      }

      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const val = change.value;
        const messages: any[] = val.messages || [];
        const contacts: any[] = val.contacts || [];

        for (const msg of messages) {
          if (msg.type !== 'text' && msg.type !== 'image' && msg.type !== 'audio') continue;

          const fromPhone: string = msg.from;
          const msgId: string = msg.id;
          const customerName: string = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || fromPhone;

          // Idempotency check
          const { data: existingMsg } = await supabaseAdmin
            .from('messages')
            .select('id')
            .contains('fb_message_ids', [msgId])
            .maybeSingle();

          if (existingMsg) {
            console.log(`[WA Webhook] Duplicate message ${msgId}, skipping`);
            continue;
          }

          // Find or create conversation
          let { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('shop_id', shop.id)
            .eq('customer_phone', fromPhone)
            .single();

          const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          if (!conversation) {
            const { data: newConv } = await supabaseAdmin
              .from('conversations')
              .insert({
                shop_id: shop.id,
                customer_phone: fromPhone,
                customer_name: customerName,
                channel: 'whatsapp',
                status: 'bot_active',
                whatsapp_session_expires_at: sessionExpiry,
              })
              .select()
              .single();
            conversation = newConv;
          } else {
            // Refresh 24-hour session window on every inbound message
            await supabaseAdmin
              .from('conversations')
              .update({
                whatsapp_session_expires_at: sessionExpiry,
                status: conversation.status === 'closed' ? 'bot_active' : conversation.status,
              })
              .eq('id', conversation.id);
            conversation.whatsapp_session_expires_at = sessionExpiry;
          }

          if (!conversation) continue;

          // Build message content
          let dbContent = '';
          if (msg.type === 'text') {
            dbContent = msg.text?.body || '';
          } else if (msg.type === 'image') {
            dbContent = `IMAGE:${msg.image?.url || msg.image?.id || ''}`;
          } else if (msg.type === 'audio') {
            dbContent = `AUDIO:${msg.audio?.url || msg.audio?.id || ''}`;
          }

          if (!dbContent) continue;

          // Store incoming message
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'customer',
            content: dbContent,
            fb_message_ids: [msgId],
          });

          // Only run AI if bot_active
          if (conversation.status !== 'bot_active') continue;

          // Payment verification intercept
          const paymentReply = await processPaymentVerification(conversation.id, shop.id, dbContent);
          if (paymentReply) {
            await supabaseAdmin.from('messages').insert({
              conversation_id: conversation.id,
              sender: 'bot',
              content: paymentReply,
            });
            await sendWhatsAppMessage(fromPhone, paymentReply, shop.id);
            continue;
          }

          // Order creation intercept
          const orderResult = await handleOrderCreationIntercept(conversation.id, shop.id, dbContent);
          if (orderResult?.handled) {
            if (orderResult.reply) {
              await supabaseAdmin.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'bot',
                content: orderResult.reply,
              });
              await sendWhatsAppMessage(fromPhone, orderResult.reply, shop.id);
            }
            continue;
          }

          // Build conversation history
          const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('sender, content, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(10);

          const history = rawHistory ? [...rawHistory].reverse() : [];
          if (history.length > 0) history.pop(); // remove current message

          const historyParts = history.map((m: any) => ({
            role: (m.sender === 'bot' ? 'model' : 'user') as 'user' | 'model',
            parts: [{ text: m.content }],
          }));

          // Build system prompt
          const systemPrompt = await buildSystemPrompt(shop, []);

          // Generate AI response
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
          });

          const chat = model.startChat({ history: historyParts });
          const result = await chat.sendMessage(dbContent);
          const aiReply = result.response.text().trim();
          await billGeminiCall(
            shop.id,
            conversation.id,
            result.response.usageMetadata?.promptTokenCount || 0,
            result.response.usageMetadata?.candidatesTokenCount || 0,
            false,
            false
          );

          // Store bot message
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'bot',
            content: aiReply,
            gemini_call_made: true,
          });

          // Send via WhatsApp — check session window
          const sessionActive = await isWhatsAppSessionActive(conversation.id);
          if (sessionActive) {
            await sendWhatsAppMessage(fromPhone, aiReply, shop.id);
          } else {
            // Outside 24-hour window — send template instead
            await sendWhatsAppTemplate(
              fromPhone,
              'dullbot_session_expired',
              'en',
              [],
              shop.id
            );
          }

          // Update conversation last_message
          await supabaseAdmin
            .from('conversations')
            .update({
              last_message_at: new Date().toISOString(),
              last_message_content: aiReply.slice(0, 120),
            })
            .eq('id', conversation.id);
        }
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('[WA Webhook] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
