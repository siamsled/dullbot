import InboxClient from './InboxClient';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const shopSlug = 'dull-store';
  
  // Get shop ID first
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  // Get initial conversations
  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('shop_id', shop.id)
    .order('last_message_at', { ascending: false });

  return <InboxClient shop={shop} initialConversations={conversations || []} />;
}
