import { getCurrentShop } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import ComplaintsClient from './ComplaintsClient';
import { getComplaints } from './actions';

export const dynamic = 'force-dynamic';

export default async function ComplaintsPage() {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  const complaints = await getComplaints(shop.id);

  // Cast return format to support initialComplaints props mapping cleanly
  const items = complaints.map(c => ({
    id: c.id,
    customer_phone: c.customer_phone,
    last_message_at: c.last_message_at,
    last_message_content: c.last_message_content,
    meta_name: c.meta_name,
    meta_profile_pic: c.meta_profile_pic,
    status: c.status,
    ticket_reason: c.ticket_reason,
    handoff_summary: c.handoff_summary
  }));

  return <ComplaintsClient initialComplaints={items} shopId={shop.id} />;
}
