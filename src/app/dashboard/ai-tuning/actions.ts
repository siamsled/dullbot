'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

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
