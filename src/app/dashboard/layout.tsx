import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { getCurrentShop } from '@/lib/supabase-admin';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  // Hard-gate check: if business classification or context is not saved, redirect to /onboarding
  const isClassificationDone = shop.business_type !== null && shop.business_type !== undefined;
  const isContextDone = shop.onboarding_steps_done?.includes('context_form');

  if (!isClassificationDone || !isContextDone) {
    redirect('/onboarding');
  }

  return (
    <div className="h-screen bg-pure-white flex overflow-hidden">
      <Sidebar initialShop={shop} />
      <main className="flex-1 overflow-y-auto bg-pure-white">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}


