import { getCurrentShop, supabaseAdmin } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import AiTuningClient from './AiTuningClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

export default async function AiTuningPage() {
  const shop = await getCurrentShop();
  if (!shop) redirect('/login');

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
    persona_id: (shop as any).persona_id ?? null,
    persona_custom_name: (shop as any).persona_custom_name ?? null,
    max_discount_pct: shop.max_discount_pct ?? 0,
    auto_escalate_on_complaint: shop.auto_escalate_on_complaint ?? true,
    confidence_fallback: shop.confidence_fallback ?? 'say_checking',
    disclosure_mode: shop.disclosure_mode ?? 'reactive_honest',
  };

  return (
    <ErrorBoundary>
      <AiTuningClient shop={safeShop} examples={examples ?? []} personas={personas ?? []} />
    </ErrorBoundary>
  );
}
