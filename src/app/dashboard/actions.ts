'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function saveBusinessType(shopId: string, businessType: string) {
  try {
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
    revalidatePath('/onboarding');
    return { success: true };
  } catch (err: any) {
    console.error('Unhandled error in saveBusinessType:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function saveOnboardingProfileAndTone(
  shopId: string,
  payload: {
    name: string;
    category: string;
    operatingHours: string;
    deliveryAreas: string;
    businessOverview: string;
    aiInstructions?: string;
    toneTemplate: 'casual' | 'formal' | 'technical' | 'wholesale';
  }
) {
  try {
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

    // Fetch current shop state to check hard requirements
    const { data: shop, error: getErr } = await supabaseAdmin
      .from('shops')
      .select('onboarding_steps_done, meta_page_access_token, agent_enabled, onboarding_complete')
      .eq('id', shopId)
      .single();

    if (getErr || !shop) {
      return { success: false, error: getErr?.message || 'Shop not found' };
    }

    const stepsDone = shop.onboarding_steps_done || [];
    if (!stepsDone.includes('context_form')) {
      stepsDone.push('context_form');
    }

    // Check hard requirements to unlock AI automatically
    const isClassificationDone = stepsDone.includes('classification');
    const isContextDone = stepsDone.includes('context_form');
    const isMetaDone = shop.meta_page_access_token !== null;
    const hardRequirementsMet = isClassificationDone && isContextDone && isMetaDone;

    const { error } = await supabaseAdmin
      .from('shops')
      .update({
        name: payload.name,
        category: payload.category,
        operating_hours: payload.operatingHours,
        delivery_areas: payload.deliveryAreas,
        business_overview: payload.businessOverview,
        ...(payload.aiInstructions !== undefined ? { ai_instructions: payload.aiInstructions } : {}),
        persona_id: persona?.id || null,
        onboarding_steps_done: stepsDone,
        // Unlock if hard requirements met
        ...(hardRequirementsMet && !shop.onboarding_complete ? { agent_enabled: true, onboarding_complete: true } : {})
      })
      .eq('id', shopId);

    if (error) {
      console.error('Failed to save profile and tone:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (err: any) {
    console.error('Unhandled error in saveOnboardingProfileAndTone:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}


export async function dismissTour(shopId: string) {
  const { data: shop, error: getErr } = await supabaseAdmin
    .from('shops')
    .select('onboarding_steps_done')
    .eq('id', shopId)
    .single();

  if (getErr || !shop) {
    return { success: false, error: getErr?.message || 'Shop not found' };
  }

  const stepsDone = shop.onboarding_steps_done || [];
  if (!stepsDone.includes('tour_dismissed')) {
    stepsDone.push('tour_dismissed');
  }

  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      onboarding_steps_done: stepsDone
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to dismiss tour:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getShopPersonaDetails() {
  try {
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, name, persona_id, persona_updated_at")
      .eq("name", "Dull Store")
      .single();

    if (error) {
      console.error("Error fetching shop persona details:", error);
      return { success: false, error: error.message };
    }

    if (shop) {
      return { success: true, shop };
    } else {
      return { success: false, error: "Shop 'Dull Store' not found." };
    }
  } catch (err: any) {
    console.error("Unhandled error in getShopPersonaDetails:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function fetchDashboardStats(
  shopId: string,
  rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
  customStart?: string,
  customEnd?: string
) {
  try {
    const { getShopStats } = await import('@/lib/analytics');
    const stats = await getShopStats(shopId, rangeType, customStart, customEnd);
    return { success: true, stats };
  } catch (err: any) {
    console.error('Failed to fetch dashboard stats:', err);
    return { success: false, error: err.message || 'Failed to load stats' };
  }
}
