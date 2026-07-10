import InboxClient from './InboxClient';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getConversations } from './actions';



export default async function InboxPage() {
  const shopSlug = 'dull-store';
  
  // Get shop ID first
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, meta_page_access_token')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  // Get initial conversations (with names resolved)
  const conversations = await getConversations(shop.id);

  return <InboxClient shop={shop} initialConversations={conversations} />;
}
