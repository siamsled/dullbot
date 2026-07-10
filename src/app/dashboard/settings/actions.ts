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
  }
) {
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

  revalidatePath('/dashboard/settings');
  return { success: true };
}

