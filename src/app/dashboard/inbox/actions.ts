'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

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

export async function sendMessage(conversationId: string, content: string) {
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
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender: 'human_agent',
      content: content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 3. Send out to Facebook
  try {
    const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.meta_page_access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: conversation.customer_phone },
        message: { text: content }
      })
    });
    
    if (!fbRes.ok) {
      const fbErr = await fbRes.json();
      console.error("Facebook API Error (Human Reply):", fbErr);
    }
  } catch (fbError) {
    console.error("Failed to push human message to FB:", fbError);
  }
  
  return data;
}

export async function toggleTakeover(conversationId: string, isTakeover: boolean) {
  const status = isTakeover ? 'human_takeover' : 'bot_active';
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ status })
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
    .select('*')
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


