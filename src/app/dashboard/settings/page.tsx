import { supabaseAdmin } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const shopSlug = 'dull-store';
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_name')
    .eq('slug', shopSlug)
    .single();

  return <SettingsClient shop={shop} />;
}
