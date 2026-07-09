import { supabaseAdmin } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const shopSlug = 'dull-store';
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, meta_page_name, confirmation_tier, bkash_number, agent_enabled')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  // Get custom AI instructions
  const { data: instructions } = await supabaseAdmin
    .from('quick_replies')
    .select('response_text')
    .eq('shop_id', shop.id)
    .eq('trigger_pattern', '__ai_instructions__')
    .maybeSingle();

  return (
    <SettingsClient 
      shop={shop} 
      initialAiInstructions={instructions?.response_text || ''} 
    />
  );
}
