import { getCurrentShop } from '@/lib/supabase-admin';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import ServicesClient from './ServicesClient';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const shop = await getCurrentShop();
  if (!shop) {
    redirect('/login');
  }

  // Fetch services for this shop
  const { data: services, error } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch services:', error);
  }

  return <ServicesClient shopId={shop.id} initialServices={services || []} />;
}
