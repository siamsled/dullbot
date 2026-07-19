import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMetaMessage } from '@/lib/meta-api';
import { invokeGemini } from '@/lib/gemini';
import { buildSystemPrompt } from '@/lib/prompt-builder';

// Scheduled job endpoint to process reminders and follow-ups
export async function GET(request: Request) {
  try {
    const now = new Date();
    
    // 24 hours from now boundaries (±30 mins to avoid missing any run interval)
    const reminderStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
    const reminderEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

    // 2 to 4 hours ago boundaries
    const followupStart = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const followupEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    console.log(`[CRON REMINDERS] Running job at ${now.toISOString()}.`);
    console.log(`[CRON REMINDERS] Querying reminders starting between ${reminderStart} and ${reminderEnd}.`);
    console.log(`[CRON REMINDERS] Querying follow-ups ending between ${followupStart} and ${followupEnd}.`);

    // 1. Fetch pending reminders (bookings starting in ~24h)
    const { data: reminderBookings } = await supabaseAdmin
      .from('bookings')
      .select('*, services(name), shops(*)')
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null)
      .gte('starts_at', reminderStart)
      .lte('starts_at', reminderEnd);

    // 2. Fetch pending follow-ups (bookings completed ~2-4h ago)
    const { data: followupBookings } = await supabaseAdmin
      .from('bookings')
      .select('*, services(name), shops(*)')
      .in('status', ['confirmed', 'completed']) // finished bookings
      .is('followup_sent_at', null)
      .gte('ends_at', followupStart)
      .lte('ends_at', followupEnd);

    let remindersSent = 0;
    let followupsSent = 0;

    // Process Reminders
    for (const booking of reminderBookings || []) {
      const success = await processBookingMessage(booking, 'reminder');
      if (success) remindersSent++;
    }

    // Process Follow-ups
    for (const booking of followupBookings || []) {
      const success = await processBookingMessage(booking, 'followup');
      if (success) followupsSent++;
    }

    return NextResponse.json({
      success: true,
      processed: {
        reminders_sent: remindersSent,
        followups_sent: followupsSent
      }
    });

  } catch (err: any) {
    console.error('[CRON REMINDERS] job failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function processBookingMessage(booking: any, type: 'reminder' | 'followup'): Promise<boolean> {
  const shop = booking.shops;
  if (!shop) return false;

  const customerPhone = booking.customer_phone;
  
  // 1. Find the active conversation for this customer
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id, last_message_at')
    .eq('shop_id', shop.id)
    .eq('customer_phone', customerPhone)
    .neq('status', 'closed')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    console.warn(`[CRON REMINDERS] No active conversation found for phone ${customerPhone}. Skipping.`);
    // Mark as processed to avoid logging loop
    await markBookingProcessed(booking.id, type);
    return false;
  }

  // 2. Check if user's last message was within the 24-hour window
  const lastMsgAt = conversation.last_message_at ? new Date(conversation.last_message_at) : new Date(0);
  const now = new Date();
  const diffHours = (now.getTime() - lastMsgAt.getTime()) / (1000 * 60 * 60);
  const isInWindow = diffHours < 24;

  if (isInWindow) {
    console.log(`[CRON REMINDERS] Customer ${customerPhone} is IN active 24h window. Generating persona voice message...`);
    
    // Fetch persona
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

    // Build system prompt and prompt cache
    const systemPrompt = buildSystemPrompt(shop, persona, [], [], []);

    const timeLabel = new Date(booking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = new Date(booking.starts_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    
    const prompt = type === 'reminder'
      ? `Write a warm, polite appointment reminder for the client:
         Name: ${booking.customer_name || 'Customer'}
         Service: ${booking.services?.name}
         Time: ${timeLabel} on ${dateLabel}
         
         Write in your persona's natural voice (max 1-2 sentences). Do not mention you are AI.`
      : `Write a friendly, polite post-visit follow-up message for the client:
         Name: ${booking.customer_name || 'Customer'}
         Service: ${booking.services?.name}
         
         Thank them for visiting and ask if they are satisfied. Write in your persona's natural voice (max 1-2 sentences). Do not mention you are AI.`;

    const res = await invokeGemini(systemPrompt, prompt, []);
    if (res.success && res.text) {
      const textToSend = res.text.trim();
      const sendRes = await sendMetaMessage(customerPhone, textToSend, shop.slug);
      
      // Save message to conversation history
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversation.id,
        sender: 'bot',
        content: textToSend
      });

      console.log(`[CRON REMINDERS] Persona message sent to ${customerPhone}: ${textToSend}`);
      await markBookingProcessed(booking.id, type);
      return sendRes.success;
    }
  } else {
    // 3. Customer is OUTSIDE 24-hour window: Requires Utility Template fallback
    // We search config or use a mock configuration structure
    const templateName = type === 'reminder' ? 'booking_reminder_utility' : 'booking_followup_utility';
    const params = type === 'reminder'
      ? [booking.customer_name || 'Customer', booking.services?.name, new Date(booking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]
      : [booking.customer_name || 'Customer', booking.services?.name];

    // Check configuration and log clearly
    console.log(`[CRON REMINDERS] Customer ${customerPhone} is OUTSIDE 24h window. Checking templates...`);
    console.warn(`[META TEMPLATE PATHWAY] Utility Template "${templateName}" not yet configured for shop: ${shop.slug}. Recipient: ${customerPhone}, Params:`, params);
    console.warn(`[META TEMPLATE PATHWAY] CRITICAL: Shop owner/Dull Studio must manually register and get approval for the Utility Template "${templateName}" in Meta Business Manager before this path can execute.`);
    
    // Still record sent timestamp so the cron job progresses and doesn't get stuck on this booking
    await markBookingProcessed(booking.id, type);
  }

  return false;
}

async function markBookingProcessed(bookingId: string, type: 'reminder' | 'followup') {
  const updatePayload: any = {};
  if (type === 'reminder') {
    updatePayload.reminder_sent_at = new Date().toISOString();
  } else {
    updatePayload.followup_sent_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId);
}
