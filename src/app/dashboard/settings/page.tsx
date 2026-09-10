import { getCurrentShop } from '@/lib/supabase-admin';
import SettingsClient from './SettingsClient';
import { decrypt } from '@/lib/encryption';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function safeDecryptJson(encryptedText?: string | null): Record<string, any> {
  if (!encryptedText) return {};
  try {
    const decrypted = decrypt(encryptedText);
    if (!decrypted) return {};
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Failed to decrypt or parse credentials in settings:', err);
    return {};
  }
}

export default async function SettingsPage() {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  // Safely decrypt credentials without throwing JSON parse or decryption errors
  const bkashConfig = safeDecryptJson(shop.bkash_config_encrypted);
  const nagadConfig = safeDecryptJson(shop.nagad_config_encrypted);
  const courierConfig = safeDecryptJson(shop.courier_config_encrypted);

  // Resolve granular confirmation tier from prompt_cache_ref
  let resolvedConfirmationTier = shop.confirmation_tier ?? 'light';
  if (shop.prompt_cache_ref) {
    try {
      const meta = JSON.parse(shop.prompt_cache_ref);
      if (meta?.confirmationTier) {
        resolvedConfirmationTier = meta.confirmationTier;
      } else if (shop.confirmation_tier === 'prepay_verified' && meta?.depositRuleType) {
        resolvedConfirmationTier = 'deposit_verified';
      }
    } catch {}
  }

  const cleanShop = {
    ...shop,
    confirmation_tier: resolvedConfirmationTier,
    bkashConfig,
    nagadConfig,
    courierConfig,
  };

  return <SettingsClient shop={cleanShop} />;
}
