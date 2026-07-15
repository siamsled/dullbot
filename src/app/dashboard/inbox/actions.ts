'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function getMessages(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data;
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
    .update({ last_message_at: new Date().toISOString() })
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
    payload.message.reply_to = { mid: replyToMid };
  }

  const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!fbRes.ok) {
    const errData = await fbRes.json();
    console.error('Facebook API Error:', errData);
    await supabaseAdmin.from('messages').delete().eq('id', data.id);
    return { error: errData.error?.message || 'Facebook API Error' };
  }
  
  const fbData = await fbRes.json();
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
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_access_token')
    .eq('id', shopId)
    .single();

  if (shop?.meta_page_access_token) {
    const profile = await getFacebookProfile(psid, shop.meta_page_access_token);
    return profile;
  }

  return { customer_name: 'Facebook User' };
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


