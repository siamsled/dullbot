import { supabaseAdmin } from '@/lib/supabase-admin';
import AiTuningClient from './AiTuningClient';



export default async function AiTuningPage() {
  const shopSlug = 'dull-store';

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, persona_id, persona_custom_name, disclosure_mode, max_discount_pct, auto_escalate_on_complaint, confidence_fallback, ai_instructions')
    .eq('slug', shopSlug)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  const { data: examples } = await supabaseAdmin
    .from('example_replies')
    .select('id, customer_message, ideal_reply')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: true })
    .limit(10);

  const { data: personas } = await supabaseAdmin
    .from('agent_personas')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  const safeShop = {
    ...shop,
    max_discount_pct: shop.max_discount_pct ?? 0,
    auto_escalate_on_complaint: shop.auto_escalate_on_complaint ?? true,
    confidence_fallback: shop.confidence_fallback ?? 'say_checking',
    disclosure_mode: shop.disclosure_mode ?? 'reactive_honest',
  };

  return <AiTuningClient shop={safeShop} examples={examples ?? []} personas={personas ?? []} />;
}
