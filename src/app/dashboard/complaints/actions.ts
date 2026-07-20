'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getComplaints(shopId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('id, customer_phone, last_message_at, last_message_content, meta_name, meta_profile_pic, status, ticket_reason, handoff_summary')
      .eq('shop_id', shopId)
      .not('ticket_reason', 'is', null)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch complaints:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getComplaints:', err);
    return [];
  }
}

export async function resolveComplaint(conversationId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({
        status: 'bot_active',
        ticket_reason: null
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Failed to resolve complaint:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/complaints');
    revalidatePath('/dashboard/inbox');
    return { success: true };
  } catch (err: any) {
    console.error('Error in resolveComplaint:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}
