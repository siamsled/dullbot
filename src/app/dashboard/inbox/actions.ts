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
