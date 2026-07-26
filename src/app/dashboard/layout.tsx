import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { getCurrentShop } from '@/lib/supabase-admin';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  // Strict gate: if onboarding is not complete, redirect to wizard.
  // Check new onboarding_step column first; fall back to old onboarding_complete flag
  // for shops that completed the old flow (migration backfills onboarding_step='complete').
  const isComplete =
    shop.onboarding_step === 'complete' ||
    (shop.onboarding_complete === true && !shop.onboarding_step); // legacy fallback

  if (!isComplete) {
    redirect('/onboarding');
  }

  return (
    <div className="h-screen bg-pure-white flex overflow-hidden">
      <Sidebar initialShop={shop} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-pure-white">
        {children}
      </main>
    </div>
  );
}
