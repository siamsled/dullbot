'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { encrypt } from '@/lib/encryption';

export async function disconnectFacebook(shopId: string) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      meta_page_id: null,
      meta_page_name: null,
      meta_page_access_token: null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to disconnect Facebook:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function disconnectInstagram(shopId: string) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      instagram_business_id: null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to disconnect Instagram:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function disconnectWhatsApp(shopId: string) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      whatsapp_business_account_id: null,
      whatsapp_phone_number_id: null,
      whatsapp_access_token: null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to disconnect WhatsApp:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function saveWidgetEnabled(shopId: string, enabled: boolean) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({ widget_enabled: enabled })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to save widget state:', error);
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
    paymentVerificationMethod: 'none' | 'merchant_api' | 'notification_app';
    bkashConfig: any;
    nagadConfig: any;
    courierProvider: string;
    courierConfig: any;
  }
) {
  const bkashConfigEncrypted = payload.bkashConfig ? encrypt(JSON.stringify(payload.bkashConfig)) : null;
  const nagadConfigEncrypted = payload.nagadConfig ? encrypt(JSON.stringify(payload.nagadConfig)) : null;
  const courierConfigEncrypted = payload.courierConfig ? encrypt(JSON.stringify(payload.courierConfig)) : null;

  const { error: shopErr } = await supabaseAdmin
    .from('shops')
    .update({
      confirmation_tier: payload.confirmationTier,
      bkash_number: payload.bkashNumber,
      agent_enabled: payload.agentEnabled,
      payment_verification_method: payload.paymentVerificationMethod,
      bkash_config_encrypted: bkashConfigEncrypted,
      nagad_config_encrypted: nagadConfigEncrypted,
      courier_provider: payload.courierProvider || null,
      courier_config_encrypted: courierConfigEncrypted,
    })
    .eq('id', shopId);

  if (shopErr) {
    console.error('Failed to update shop settings:', shopErr);
    return { success: false, error: shopErr.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function saveWhatsAppConfig(
  shopId: string,
  payload: { wabaId: string; phoneId: string; token: string }
) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      whatsapp_business_account_id: payload.wabaId || null,
      whatsapp_phone_number_id: payload.phoneId || null,
      whatsapp_access_token: payload.token || null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to update WhatsApp config:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}
