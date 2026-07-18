import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', 'dull-store')
    .single();

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

