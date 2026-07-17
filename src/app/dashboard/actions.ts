'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function saveBusinessType(shopId: string, businessType: string) {
  // Fetch current steps
  const { data: shop, error: getErr } = await supabaseAdmin
    .from('shops')
    .select('onboarding_steps_done')
    .eq('id', shopId)
    .single();

  if (getErr || !shop) {
    return { success: false, error: getErr?.message || 'Shop not found' };
  }

  const stepsDone = shop.onboarding_steps_done || [];
  if (!stepsDone.includes('classification')) {
    stepsDone.push('classification');
  }

  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      business_type: businessType,
      onboarding_steps_done: stepsDone
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to save business type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function saveOnboardingProfileAndTone(
  shopId: string,
  payload: {
    name: string;
    aiInstructions: string;
    toneTemplate: 'casual' | 'formal' | 'technical' | 'wholesale';
  }
) {
  // Resolve Persona matching the tone template
  let personaQuery = supabaseAdmin.from('agent_personas').select('id');
  if (payload.toneTemplate === 'casual') {
    personaQuery = personaQuery.ilike('name', '%Shuvo%');
  } else if (payload.toneTemplate === 'formal') {
    personaQuery = personaQuery.ilike('name', '%Rumi%');
  } else if (payload.toneTemplate === 'technical') {
    personaQuery = personaQuery.ilike('name', '%Imran%');
  } else if (payload.toneTemplate === 'wholesale') {
    personaQuery = personaQuery.ilike('name', '%Biplob%');
  }

  let { data: persona } = await personaQuery.limit(1).single();

  // Fallback to first persona if no exact match
  if (!persona) {
    const { data: firstPersona } = await supabaseAdmin
      .from('agent_personas')
      .select('id')
      .limit(1)
      .single();
    persona = firstPersona;
  }

  // Fetch current steps
  const { data: shop, error: getErr } = await supabaseAdmin
    .from('shops')
    .select('onboarding_steps_done')
    .eq('id', shopId)
    .single();

  if (getErr || !shop) {
    return { success: false, error: getErr?.message || 'Shop not found' };
  }

  const stepsDone = shop.onboarding_steps_done || [];
  if (!stepsDone.includes('profile_tone')) {
    stepsDone.push('profile_tone');
  }

  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      name: payload.name,
      ai_instructions: payload.aiInstructions,
      persona_id: persona?.id || null,
      onboarding_steps_done: stepsDone
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to save profile and tone:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function completeOnboarding(shopId: string) {
  // Fetch current steps
  const { data: shop, error: getErr } = await supabaseAdmin
    .from('shops')
    .select('onboarding_steps_done')
    .eq('id', shopId)
    .single();

  if (getErr || !shop) {
    return { success: false, error: getErr?.message || 'Shop not found' };
  }

  const stepsDone = shop.onboarding_steps_done || [];
  if (!stepsDone.includes('go_live')) {
    stepsDone.push('go_live');
  }

  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      onboarding_complete: true,
      agent_enabled: true, // Go live automatically enables the agent
      onboarding_steps_done: stepsDone
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to complete onboarding:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
