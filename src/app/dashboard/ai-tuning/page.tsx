import { supabaseAdmin } from '@/lib/supabase-admin';
import AiTuningClient from './AiTuningClient';



export default async function AiTuningPage() {
  const shopSlug = 'dull-store';

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, tone_formal_casual, tone_concise_detailed, tone_professional_warm, language_mix, emoji_frequency, max_discount_pct, auto_escalate_on_complaint, confidence_fallback, disclose_ai_if_asked, ai_instructions')
    .eq('slug', shopSlug)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  const { data: examples } = await supabaseAdmin
    .from('example_replies')
    .select('id, customer_message, ideal_reply')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: true })
    .limit(10);

  const safeShop = {
    ...shop,
    tone_formal_casual: shop.tone_formal_casual ?? 50,
    tone_concise_detailed: shop.tone_concise_detailed ?? 30,
    tone_professional_warm: shop.tone_professional_warm ?? 20,
    language_mix: shop.language_mix ?? 'en',
    emoji_frequency: shop.emoji_frequency ?? 'none',
    max_discount_pct: shop.max_discount_pct ?? 0,
    auto_escalate_on_complaint: shop.auto_escalate_on_complaint ?? true,
    confidence_fallback: shop.confidence_fallback ?? 'say_checking',
    disclose_ai_if_asked: shop.disclose_ai_if_asked ?? true,
  };

  return <AiTuningClient shop={safeShop} examples={examples ?? []} />;
}
