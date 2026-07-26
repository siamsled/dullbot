import { redirect } from 'next/navigation';
import { getCurrentShop } from '@/lib/supabase-admin';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage(props: {
  searchParams: Promise<{ force?: string }>
}) {
  const searchParams = await props.searchParams;
  const shop = await getCurrentShop();
  
  if (!shop) {
    redirect('/login');
  }

  // If onboarding is already fully complete, do not force the user through onboarding,
  // unless they explicitly request it via ?force=true
  if (searchParams.force !== 'true' && shop.onboarding_step === 'complete') {
    redirect('/dashboard');
  }

  return <OnboardingClient shop={shop} />;
}
