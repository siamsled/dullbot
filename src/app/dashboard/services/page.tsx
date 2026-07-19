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

  // 1. Fetch services
  const { data: services, error: err1 } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  // 2. Fetch resources
  const { data: resources, error: err2 } = await supabaseAdmin
    .from('resources')
    .select('*')
    .eq('shop_id', shop.id)
    .order('name', { ascending: true });

  // 3. Fetch availability rules
  let availabilityRules: any[] = [];
  if (resources && resources.length > 0) {
    const resourceIds = resources.map(r => r.id);
    const { data: rules, error: err3 } = await supabaseAdmin
      .from('availability_rules')
      .select('*')
      .in('resource_id', resourceIds);
    if (!err3) availabilityRules = rules || [];
  }

  // 4. Fetch availability exceptions
  let availabilityExceptions: any[] = [];
  if (resources && resources.length > 0) {
    const resourceIds = resources.map(r => r.id);
    const { data: exceptions, error: err4 } = await supabaseAdmin
      .from('availability_exceptions')
      .select('*')
      .in('resource_id', resourceIds)
      .order('date', { ascending: true });
    if (!err4) availabilityExceptions = exceptions || [];
  }

  // 5. Fetch confirmed bookings
  const { data: bookings, error: err5 } = await supabaseAdmin
    .from('bookings')
    .select('*, services(name), resources(name)')
    .eq('shop_id', shop.id)
    .order('starts_at', { ascending: true });

  if (err1 || err2 || err5) {
    console.error('Failed to fetch services dashboard data:', { err1, err2, err5 });
  }

  return (
    <ServicesClient 
      shopId={shop.id} 
      initialServices={services || []} 
      initialResources={resources || []}
      initialAvailabilityRules={availabilityRules}
      initialAvailabilityExceptions={availabilityExceptions}
      initialBookings={bookings || []}
    />
  );
}
