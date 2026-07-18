import { getCurrentShop } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';
import { decrypt } from '@/lib/encryption';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  // Decrypt credentials
  const bkashConfig = shop.bkash_config_encrypted ? JSON.parse(decrypt(shop.bkash_config_encrypted) || '{}') : {};
  const nagadConfig = shop.nagad_config_encrypted ? JSON.parse(decrypt(shop.nagad_config_encrypted) || '{}') : {};
  const courierConfig = shop.courier_config_encrypted ? JSON.parse(decrypt(shop.courier_config_encrypted) || '{}') : {};

  const cleanShop = {
    ...shop,
    bkashConfig,
    nagadConfig,
    courierConfig,
  };

  return <SettingsClient shop={cleanShop} />;
}
