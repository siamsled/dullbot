'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

const SHOP_SLUG = 'dull-store';

export async function saveAiTuning(payload: {
  tone_formal_casual: number;
  tone_concise_detailed: number;
  tone_professional_warm: number;
  language_mix: string;
  emoji_frequency: string;
  max_discount_pct: number;
  auto_escalate_on_complaint: boolean;
  confidence_fallback: string;
  disclose_ai_if_asked: boolean;
}) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update(payload)
    .eq('slug', SHOP_SLUG);

  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/ai-tuning');
  return { success: true };
}

export async function addExampleReply(shopId: string, customerMessage: string, idealReply: string) {
  const { error } = await supabaseAdmin
    .from('example_replies')
    .insert({ shop_id: shopId, customer_message: customerMessage, ideal_reply: idealReply });
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/ai-tuning');
  return { success: true };
}

export async function deleteExampleReply(id: string) {
  await supabaseAdmin.from('example_replies').delete().eq('id', id);
  revalidatePath('/dashboard/ai-tuning');
}
