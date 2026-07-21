import { getCurrentShop } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import SocialClient from './SocialClient';
import { getPostAutomations, getShopProducts } from './actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Social Automation — DullBot',
  description: 'Automate comment replies, private messages, and moderation for your Facebook and Instagram posts.',
};

export default async function SocialPage() {
  const shop = await getCurrentShop();
  if (!shop) redirect('/login');

  const [automations, products] = await Promise.all([
    getPostAutomations(),
    getShopProducts(),
  ]);

  return (
    <SocialClient
      initialAutomations={automations}
      products={products}
    />
  );
}
