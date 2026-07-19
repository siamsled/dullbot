'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';
import { invokeGemini } from '@/lib/gemini';

export async function getMessages(conversationId: string, before?: string, limit: number = 40) {
  let query = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  // Return in chronological order
  return (data || []).reverse();
}

export async function sendMessage(
  conversationId: string, 
  content: string, 
  replyToMid?: string, 
  mediaUrl?: string, 
  mediaType?: 'image' | 'audio'
) {
  // 1. Fetch conversation and shop details to get the access token and customer ID
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('customer_phone, shop_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    console.error('Conversation not found');
    return null;
  }

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_access_token')
    .eq('id', conversation.shop_id)
    .single();

  if (!shop || !shop.meta_page_access_token) {
    console.error('Shop or page access token not found');
    return null;
  }

  // 2. Insert into database
  let dbContent = content;
  if (mediaUrl) {
    dbContent = mediaType === 'image' ? `IMAGE:${mediaUrl}` : `AUDIO:${mediaUrl}`;
  }
  
  if (replyToMid) {
    const { data: repliedMsg } = await supabaseAdmin
      .from('messages')
      .select('content')
      .contains('fb_message_ids', [replyToMid])
      .single();
      
    if (repliedMsg) {
      dbContent = `[Replying to: "${repliedMsg.content}"] ${dbContent}`;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender: 'human_agent',
      content: dbContent,
      fb_message_ids: null
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return { error: 'Database error' };
  }

  await supabaseAdmin
    .from('conversations')
    .update({ 
      last_message_at: new Date().toISOString(),
      last_message_content: dbContent,
      unread_count: 0
    })
    .eq('id', conversationId);

  // 3. Send out to Facebook (Blocking)
  const payload: any = {
    messaging_type: "RESPONSE",
    recipient: { id: conversation.customer_phone },
    message: {}
  };

  if (mediaUrl && mediaType === 'image') {
    payload.message.attachment = {
      type: "image",
      payload: { url: mediaUrl, is_reusable: true }
    };
  } else {
    payload.message.text = content;
  }

  if (replyToMid) {
    payload.reply_to = { mid: replyToMid };
  }

  const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!fbRes.ok) {
    let errData: any = {};
    try {
      errData = await fbRes.json();
    } catch (e) {
      errData = { error: { message: `HTTP ${fbRes.status}` } };
    }
    console.error('Facebook API Error:', errData);
    await supabaseAdmin.from('messages').delete().eq('id', data.id);
    return { error: errData.error?.message || 'Facebook API Error' };
  }
  
  let fbData: any = {};
  try {
    fbData = await fbRes.json();
  } catch (e) {
    console.error('Failed to parse Facebook success response');
  }
  
  if (fbData.message_id && data) {
    await supabaseAdmin
      .from('messages')
      .update({ fb_message_ids: [fbData.message_id] })
      .eq('id', data.id);
  }

  return data;
}

export async function toggleTakeover(conversationId: string, isTakeover: boolean) {
  const status = isTakeover ? 'human_takeover' : 'bot_active';
  const updateData: any = { status };
  if (!isTakeover) {
    updateData.ticket_reason = null;
  }
  const { error } = await supabaseAdmin
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId);
    
  return !error;
}

const facebookProfileCache = new Map<string, { customer_name: string; profile_pic_url?: string }>();

async function getFacebookProfile(psid: string, accessToken: string) {
  if (facebookProfileCache.has(psid)) {
    return facebookProfileCache.get(psid)!;
  }
  
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`);
    if (res.ok) {
      const data = await res.json();
      const first = data.first_name || '';
      const last = data.last_name || '';
      const fullName = `${first} ${last}`.trim();
      const profile = {
        customer_name: fullName || 'Facebook User',
        profile_pic_url: data.profile_pic || undefined,
      };
      facebookProfileCache.set(psid, profile);
      return profile;
    }
  } catch (err) {
    console.error("Error fetching FB profile:", err);
  }
  
  return { customer_name: 'Facebook User' };
}

export async function getConversations(shopId: string) {
  const { data: conversations, error } = await supabaseAdmin
    .from('conversations')
    .select('*, orders(status)')
    .eq('shop_id', shopId)
    .order('last_message_at', { ascending: false });

  if (error || !conversations) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  return conversations;
}

export async function resolveFacebookProfile(psid: string, shopId: string) {
  // Check if we already have it in the database
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('meta_name, meta_profile_pic, meta_checked_at')
    .eq('shop_id', shopId)
    .eq('customer_phone', psid)
    .single();

  const isCacheValid = conversation && conversation.meta_name && conversation.meta_checked_at && (
    new Date().getTime() - new Date(conversation.meta_checked_at).getTime() < 24 * 60 * 60 * 1000 // 24 hours
  );

  if (isCacheValid) {
    return {
      customer_name: conversation.meta_name || 'Facebook User',
      profile_pic_url: conversation.meta_profile_pic || undefined
    };
  }

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_access_token')
    .eq('id', shopId)
    .single();

  if (shop?.meta_page_access_token) {
    const profile = await getFacebookProfile(psid, shop.meta_page_access_token);
    
    // Cache to DB conversations record
    await supabaseAdmin
      .from('conversations')
      .update({
        meta_name: profile.customer_name,
        meta_profile_pic: profile.profile_pic_url || null,
        meta_checked_at: new Date().toISOString()
      })
      .eq('shop_id', shopId)
      .eq('customer_phone', psid);

    return profile;
  }

  return { 
    customer_name: conversation?.meta_name || 'Facebook User', 
    profile_pic_url: conversation?.meta_profile_pic || undefined 
  };
}

export async function flagCustomerAsFraud(conversationId: string, reason: string) {
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('customer_phone, shop_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) return { success: false, error: 'Conversation not found' };

  const hashedPhone = crypto.createHash('sha256').update(conversation.customer_phone).digest('hex');

  const { error } = await supabaseAdmin
    .from('fraud_flags')
    .insert({
      shop_id: conversation.shop_id,
      hashed_customer_id: hashedPhone,
      reason
    });

  if (error) {
    // Ignore duplicate inserts gracefully
    if (error.code === '23505') return { success: true };
    return { success: false, error: error.message };
  }

  // Auto-takeover
  await toggleTakeover(conversationId, true);

  return { success: true };
}

export async function generateHandoffSummary(conversationId: string) {
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('customer_phone, shop_id, status, ticket_reason, handoff_summary')
    .eq('id', conversationId)
    .single();

  if (!conversation) return { error: 'Conversation not found' };

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('sender, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!messages || messages.length === 0) {
    return { error: 'No messages to summarize' };
  }

  const chatLogs = messages
    .reverse()
    .map(m => `${m.sender === 'customer' ? 'Customer' : 'Bot/Agent'}: ${m.content}`)
    .join('\n');

  const systemInstruction = `You are a professional customer support assistant.
Analyze the provided chat history between a customer and the AI bot, and extract a concise handoff summary.
Return ONLY a valid JSON object matching this structure:
{
  "wants": "What the customer wants or has asked about (concise, max 2 sentences)",
  "facts": "Key facts established: customer name, phone, specific product interest, order details mentioned",
  "flagReason": "Why this was flagged or escalated (complaint, abuse, unsure, discount request, etc.)",
  "sentiment": "Overall sentiment: frustrated, neutral, positive"
}
Ensure there is no extra formatting, markdown wraps, or commentary. Only return the JSON.`;

  try {
    const result = await invokeGemini(systemInstruction, `Chat History:\n${chatLogs}`, []);
    if (result && result.success && result.text) {
      let parsedSummary = null;
      try {
        const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedSummary = JSON.parse(cleanJson);
      } catch (pe) {
        console.error('Failed to parse Gemini summary JSON:', result.text);
        parsedSummary = {
          wants: 'Failed to parse AI summary. Review history manually.',
          facts: 'N/A',
          flagReason: conversation.ticket_reason || 'Manual human takeover',
          sentiment: 'Neutral'
        };
      }

      await supabaseAdmin
        .from('conversations')
        .update({ handoff_summary: parsedSummary })
        .eq('id', conversationId);

      return { success: true, summary: parsedSummary };
    }
  } catch (err: any) {
    console.error('Gemini handoff summary generation failed:', err);
    return { error: err.message || 'Gemini error' };
  }

  return { error: 'Failed to generate summary' };
}

export async function markAsRead(conversationId: string) {
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId);
  return !error;
}


