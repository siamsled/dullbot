import { supabaseAdmin } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';
import { decrypt } from '@/lib/encryption';

export default async function SettingsPage() {
  const shopSlug = 'dull-store';
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, meta_page_name, confirmation_tier, bkash_number, agent_enabled, credit_balance, payment_verification_method, bkash_config_encrypted, nagad_config_encrypted, courier_provider, courier_config_encrypted')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  // Decrypt credentials
  const bkashConfig = shop.bkash_config_encrypted ? JSON.parse(decrypt(shop.bkash_config_encrypted) || '{}') : {};
  const nagadConfig = shop.nagad_config_encrypted ? JSON.parse(decrypt(shop.nagad_config_encrypted) || '{}') : {};
  const courierConfig = shop.courier_config_encrypted ? JSON.parse(decrypt(shop.courier_config_encrypted) || '{}') : {};

  const cleanShop = {
    ...shop,
    bkashConfig,
    nagadConfig,
    courierConfig
  };

  return (
    <SettingsClient 
      shop={cleanShop} 
    />
  );
}
