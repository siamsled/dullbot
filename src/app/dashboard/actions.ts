'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { invokeGemini } from '@/lib/gemini';

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

    await saveOnboardingStep(shopId, 'channels');

    revalidatePath('/dashboard');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (err: any) {
    console.error('Unhandled error in saveBusinessType:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Update the single onboarding_step progress column used by the new gate.
 * stepName is the new step the wizard is MOVING TO (next step after the one just completed).
 */
export async function saveOnboardingStep(
  shopId: string,
  stepName: 'business_type' | 'channels' | 'context' | 'payments' | 'delivery' | 'demo' | 'complete'
) {
  try {
    await supabaseAdmin
      .from('shops')
      .update({
        onboarding_step: stepName,
        onboarding_step_updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);
  } catch (e) {
    console.error('saveOnboardingStep error:', e);
  }
}

/**
 * Save bulk pricing toggle + note for Retail/Wholesale type-specific step.
 */
export async function saveBulkPricing(
  shopId: string,
  enabled: boolean,
  note: string | null
) {
  try {
    const { error } = await supabaseAdmin
      .from('shops')
      .update({
        bulk_pricing_enabled: enabled,
        bulk_pricing_note: enabled ? (note || null) : null,
      })
      .eq('id', shopId);
    if (error) return { success: false, error: error.message };
    await saveOnboardingStep(shopId, 'payments');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Save restaurant location fields.
 */
export async function saveRestaurantLocation(
  shopId: string,
  address: string,
  mapLink: string
) {
  try {
    const { error } = await supabaseAdmin
      .from('shops')
      .update({
        location_address: address || null,
        location_map_link: mapLink || null,
      })
      .eq('id', shopId);
    if (error) return { success: false, error: error.message };
    await saveOnboardingStep(shopId, 'payments');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Save payment method choice during onboarding (Step 5).
 * choice: 'merchant_api' | 'companion_app' | 'skip'
 */
export async function savePaymentChoice(
  shopId: string,
  choice: 'merchant_api' | 'companion_app' | 'skip',
  bkashConfig?: any
) {
  try {
    const { encrypt } = await import('@/lib/encryption');
    const updatePayload: Record<string, any> = {
      payment_verification_method: choice === 'merchant_api' ? 'merchant_api' : choice === 'companion_app' ? 'notification_app' : 'none',
    };
    if (choice === 'merchant_api' && bkashConfig) {
      updatePayload.bkash_config_encrypted = encrypt(JSON.stringify(bkashConfig));
    }
    const { error } = await supabaseAdmin.from('shops').update(updatePayload).eq('id', shopId);
    if (error) return { success: false, error: error.message };
    await saveOnboardingStep(shopId, 'delivery');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Save courier choice during onboarding (Step 6).
 * provider: one of the 5 couriers or 'none' (manual)
 */
export async function saveCourierChoice(
  shopId: string,
  provider: string,
  config?: Record<string, any>
) {
  try {
    const { encrypt } = await import('@/lib/encryption');
    const updatePayload: Record<string, any> = {
      courier_provider: provider === 'manual' ? null : provider,
    };
    if (provider !== 'manual' && config) {
      updatePayload.courier_config_encrypted = encrypt(JSON.stringify(config));
    }
    const { error } = await supabaseAdmin.from('shops').update(updatePayload).eq('id', shopId);
    if (error) return { success: false, error: error.message };
    await saveOnboardingStep(shopId, 'demo');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Generate a live demo Gemini reply for Step 7.
 * Returns the AI reply text or null on any failure (never throws — Step 7 must not block).
 */
export async function generateLiveDemo(
  shopId: string,
  businessType: 'retail' | 'restaurant' | 'service'
): Promise<{ demoReply: string | null; sampleQuestion: string }> {
  const sampleQuestions: Record<string, string> = {
    retail: 'Do you have this in size L? And what\'s the delivery time to Dhaka?',
    restaurant: 'Do you have a table for 2 available tonight around 7 PM?',
    service: 'Can I book an appointment for tomorrow afternoon?',
  };
  const sampleQuestion = sampleQuestions[businessType] || sampleQuestions.retail;

  try {
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*, persona_id')
      .eq('id', shopId)
      .single();

    if (!shop) return { demoReply: null, sampleQuestion };

    let persona = null;
    if (shop.persona_id) {
      const { data: personaData } = await supabaseAdmin
        .from('agent_personas')
        .select('*')
        .eq('id', shop.persona_id)
        .single();
      persona = personaData;
    }

    const { buildSystemPrompt } = await import('@/lib/prompt-builder');
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, description, price, stock_quantity')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .limit(10);

    const systemPrompt = buildSystemPrompt(shop, persona, products || [], [], [], []);
    const result = await invokeGemini(systemPrompt, sampleQuestion, []);

    if (result.success && result.text) {
      return { demoReply: result.text, sampleQuestion };
    }
    return { demoReply: null, sampleQuestion };
  } catch (e) {
    console.error('[generateLiveDemo] failed silently:', e);
    return { demoReply: null, sampleQuestion };
  }
}

/**
 * Mark onboarding as complete and unlock the full dashboard.
 */
export async function completeOnboarding(shopId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('shops')
      .update({
        onboarding_step: 'complete',
        onboarding_step_updated_at: new Date().toISOString(),
        onboarding_complete: true,
        agent_enabled: true,
      })
      .eq('id', shopId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard');
    revalidatePath('/onboarding');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateProfileFromFacebook(shopId: string) {
  try {
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('meta_page_access_token, meta_page_id')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop || !shop.meta_page_access_token || !shop.meta_page_id) {
      return { success: false, error: 'Facebook Page not connected properly.' };
    }

    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${shop.meta_page_id}?fields=name,about,description,category,emails,phone,website,location,hours,posts.limit(20){message}&access_token=${shop.meta_page_access_token}`
    );
    const fbData = await fbRes.json();

    if (fbData.error) {
      return { success: false, error: fbData.error.message || 'Failed to fetch Facebook data.' };
    }

    const systemPrompt = `You are a business profiling AI. Analyze the following JSON data extracted from a business's Facebook Page.
Extract and infer the following fields to configure their DullBot workspace:
1. "name": The business name (string).
2. "category": Choose the single closest match from these broad categories: Fashion & Apparel, Electronics & Gadgets, Beauty & Cosmetics, Food & Bakery, Home & Living, Clinic & Healthcare, Salon & Spa, Tutoring & Education, Consulting & Agency, Wholesale / B2B, or Other.
3. "operating_hours": Summarize their operating hours in a short string (e.g. "9:00 AM - 10:00 PM" or "24/7").
4. "delivery_areas": Summarize their delivery capabilities based on location or description (e.g. "Nationwide", "Dhaka Only", or "Local").
5. "business_overview": Write a concise, professional 2-3 sentence overview of what the business does, what they sell, and their unique value proposition.
6. "tone_template": Pick the most appropriate conversational tone for an AI agent representing them: "casual", "warm", "technical", or "direct".
7. "business_type": Infer from the posts and category whether this is "retail", "service", or "wholesale".
8. "confidence_flags": An object where keys are the field names above (name, category, operating_hours, delivery_areas, business_overview, tone_template, business_type) and the value is either "high" (pulled directly from structured API fields) or "inferred" (synthesized or guessed by you).

Return ONLY a valid JSON object with the exact keys above. No markdown blocks or extra text.`;

    const geminiResponse = await invokeGemini(systemPrompt, JSON.stringify(fbData), []);
    
    if (!geminiResponse || !geminiResponse.text) {
      return { success: false, error: 'AI failed to generate profile.' };
    }

    // Clean JSON block
    let rawJson = geminiResponse.text.trim();
    if (rawJson.startsWith('\`\`\`json')) {
      rawJson = rawJson.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (rawJson.startsWith('\`\`\`')) {
      rawJson = rawJson.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    let profile: any = {};
    try {
      profile = JSON.parse(rawJson);
    } catch (e) {
      console.error("Failed to parse Gemini output:", rawJson);
      return { success: false, error: 'AI returned invalid format.' };
    }

    // Default confidence flags if Gemini misses them
    const confidenceFlags = profile.confidence_flags || {
      name: 'high',
      category: 'high',
      operating_hours: 'high',
      delivery_areas: 'inferred',
      business_overview: 'inferred',
      tone_template: 'inferred',
      business_type: 'inferred'
    };

    // Attempt catalog import in background or inline
    let importedProducts = 0;
    try {
      importedProducts = await importFacebookCatalog(shopId, shop.meta_page_id, shop.meta_page_access_token);
    } catch (e) {
      console.error('Failed to import catalog:', e);
    }

    return { 
      success: true, 
      profile: {
        name: profile.name || fbData.name || 'My Store',
        category: profile.category || 'Other',
        operating_hours: profile.operating_hours || fbData.hours || '',
        delivery_areas: profile.delivery_areas || 'Nationwide',
        business_overview: profile.business_overview || fbData.about || '',
        tone_template: profile.tone_template || 'casual',
        business_type: profile.business_type || 'retail',
        confidence_flags: confidenceFlags
      }, 
      importedProducts, 
      fbData: { name: fbData.name, category: fbData.category, hours: fbData.hours } 
    };
  } catch (err: any) {
    console.error('generateProfileFromFacebook error:', err);
    return { success: false, error: err.message };
  }
}

async function importFacebookCatalog(shopId: string, pageId: string, accessToken: string): Promise<number> {
  const catRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/product_catalogs?access_token=${accessToken}`);
  const catData = await catRes.json();
  if (!catData || !catData.data || catData.data.length === 0) {
    return 0; // No catalog found
  }

  const catalogId = catData.data[0].id;
  const prodRes = await fetch(`https://graph.facebook.com/v19.0/${catalogId}/products?fields=name,description,price,image_url&limit=100&access_token=${accessToken}`);
  const prodData = await prodRes.json();
  
  if (!prodData || !prodData.data || prodData.data.length === 0) {
    return 0;
  }

  const inserts = prodData.data.map((p: any) => ({
    shop_id: shopId,
    name: p.name,
    description: p.description || '',
    price: p.price ? parseFloat(p.price) / 100 : 0, // Assuming price is in cents
    is_active: false // Flagged for review
  }));

  const { error } = await supabaseAdmin.from('products').insert(inserts);
  if (error) {
    console.error('Error inserting imported catalog products:', error);
    return 0;
  }

  return inserts.length;
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
    toneTemplate: 'casual' | 'warm' | 'technical' | 'direct' | 'formal' | 'wholesale';
  }
) {
  try {
    // Resolve Persona matching the tone/vibe template
    let personaQuery = supabaseAdmin.from('agent_personas').select('id');
    if (payload.toneTemplate === 'casual') {
      personaQuery = personaQuery.ilike('name', '%Shuvo%');
    } else if (payload.toneTemplate === 'warm' || payload.toneTemplate === 'formal') {
      personaQuery = personaQuery.ilike('name', '%Rumi%');
    } else if (payload.toneTemplate === 'technical') {
      personaQuery = personaQuery.ilike('name', '%Imran%');
    } else if (payload.toneTemplate === 'direct' || payload.toneTemplate === 'wholesale') {
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
    if (!stepsDone.includes('context_form')) stepsDone.push('context_form');
    if (!stepsDone.includes('classification')) stepsDone.push('classification');

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
        tone_template: payload.toneTemplate,
        onboarding_steps_done: stepsDone,
      })
      .eq('id', shopId);

    if (error) {
      console.error('Failed to save profile and tone:', error);
      return { success: false, error: error.message };
    }

    // Advance wizard step to payments (Step 4)
    await saveOnboardingStep(shopId, 'payments');

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
