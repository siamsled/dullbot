import { supabaseAdmin } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';



export default async function SettingsPage() {
  const shopSlug = 'dull-store';
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, meta_page_name, confirmation_tier, bkash_number, agent_enabled, credit_balance')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  return (
    <SettingsClient 
      shop={shop} 
    />
  );
}

