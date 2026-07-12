'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { invokeGemini } from '@/lib/gemini';

const SHOP_SLUG = 'dull-store';

export async function saveAiTuning(payload: {
  persona_id: string;
  persona_custom_name: string | null;
  disclosure_mode: string;
  max_discount_pct: number;
  auto_escalate_on_complaint: boolean;
  confidence_fallback: string;
  ai_instructions: string | null;
}) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({ 
      ...payload, 
      tuning_updated_at: new Date().toISOString(),
      persona_updated_at: new Date().toISOString(),
      prompt_cache_ref: null 
    })
    .eq('slug', SHOP_SLUG);

  if (error) return { success: false, error: error.message };
  const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('slug', SHOP_SLUG).single();
  if (shop) {
    await supabaseAdmin.from('response_cache').delete().eq('shop_id', shop.id);
  }

  revalidatePath('/dashboard/ai-tuning');
  return { success: true };
}

export async function addExampleReply(shopId: string, customerMessage: string, idealReply: string) {
  const { error } = await supabaseAdmin
    .from('example_replies')
    .insert({ shop_id: shopId, customer_message: customerMessage, ideal_reply: idealReply });
  if (error) return { success: false, error: error.message };
  await supabaseAdmin.from('response_cache').delete().eq('shop_id', shopId);
  revalidatePath('/dashboard/ai-tuning');
  return { success: true };
}

export async function deleteExampleReply(id: string) {
  const { data: example } = await supabaseAdmin.from('example_replies').select('shop_id').eq('id', id).single();
  if (example) {
    await supabaseAdmin.from('response_cache').delete().eq('shop_id', example.shop_id);
  }
  await supabaseAdmin.from('example_replies').delete().eq('id', id);
  revalidatePath('/dashboard/ai-tuning');
}

export async function testPersonaResponse(
  personaId: string,
  customerMessage: string,
  shopTuningState: {
    disclosure_mode: string;
    max_discount_pct: number;
    auto_escalate_on_complaint: boolean;
    confidence_fallback: string;
    ai_instructions: string | null;
  }
) {
  // Fetch full persona
  const { data: persona } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('id', personaId)
    .single();

  // Fetch shop to get ID and products
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', SHOP_SLUG)
    .single();

  if (!shop) return { success: false, error: 'Shop not found' };

  // Fetch products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('shop_id', shop.id);

  // Fetch examples
  const { data: examples } = await supabaseAdmin
    .from('example_replies')
    .select('*')
    .eq('shop_id', shop.id);

  const shopSettings = {
    name: shop.name,
    disclosure_mode: shopTuningState.disclosure_mode,
    max_discount_pct: shopTuningState.max_discount_pct,
    auto_escalate_on_complaint: shopTuningState.auto_escalate_on_complaint,
    confidence_fallback: shopTuningState.confidence_fallback,
    ai_instructions: shopTuningState.ai_instructions,
  };

  const systemPrompt = buildSystemPrompt(shopSettings, persona, products || [], examples || []);

  const result = await invokeGemini(systemPrompt, customerMessage, [], null);
  
  if (!result.success) {
    return { success: false, error: 'Failed to generate response' };
  }
  
  return { success: true, text: result.text };
}
