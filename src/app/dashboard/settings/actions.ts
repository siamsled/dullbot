'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function disconnectFacebook(shopSlug: string = 'dull-store') {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      meta_page_id: null,
      meta_page_name: null,
      meta_page_access_token: null
    })
    .eq('slug', shopSlug);

  if (error) {
    console.error('Failed to disconnect Facebook:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}
export async function saveSettings(
  shopId: string,
  payload: {
    confirmationTier: 'light' | 'otp_verified' | 'prepay_verified';
    bkashNumber: string;
    agentEnabled: boolean;
    aiInstructions: string;
  }
) {
  // 1. Update shops table
  const { error: shopErr } = await supabaseAdmin
    .from('shops')
    .update({
      confirmation_tier: payload.confirmationTier,
      bkash_number: payload.bkashNumber,
      agent_enabled: payload.agentEnabled,
    })
    .eq('id', shopId);

  if (shopErr) {
    console.error('Failed to update shop settings:', shopErr);
    return { success: false, error: shopErr.message };
  }

  // 2. Clean up old AI instructions
  const { error: deleteErr } = await supabaseAdmin
    .from('quick_replies')
    .delete()
    .eq('shop_id', shopId)
    .eq('trigger_pattern', '__ai_instructions__');

  if (deleteErr) {
    console.error('Failed to clean up old AI instructions:', deleteErr);
    return { success: false, error: deleteErr.message };
  }

  // 3. Insert new AI instructions if provided
  if (payload.aiInstructions.trim()) {
    const { error: insertErr } = await supabaseAdmin
      .from('quick_replies')
      .insert({
        shop_id: shopId,
        trigger_pattern: '__ai_instructions__',
        response_text: payload.aiInstructions.trim(),
      });

    if (insertErr) {
      console.error('Failed to save custom AI instructions:', insertErr);
      return { success: false, error: insertErr.message };
    }
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}
