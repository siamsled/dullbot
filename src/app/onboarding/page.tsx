import { redirect } from 'next/navigation';
import { getCurrentShop } from '@/lib/supabase-admin';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const shop = await getCurrentShop();
  
  if (!shop) {
    redirect('/login');
  }

  // If onboarding is already fully complete (both classification and context form steps),
  // do not force the user through onboarding. Let them access the dashboard directly.
  if (shop.business_type && shop.onboarding_steps_done?.includes('context_form')) {
    redirect('/dashboard');
  }

  return <OnboardingClient shop={shop} />;
}
