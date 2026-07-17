import InboxClient from './InboxClient';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getConversations } from './actions';



export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const shopSlug = 'dull-store';
  
  // Get shop details and onboarding config
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, business_type, onboarding_complete, onboarding_steps_done, payment_verification_method, bkash_number, meta_page_access_token, agent_enabled, courier_provider')
    .eq('slug', shopSlug)
    .single();

  if (!shop) {
    return <div>Shop not found.</div>;
  }

  // Fetch product count for checklist verification
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  // Get initial conversations (with names resolved)
  const conversations = await getConversations(shop.id);

  return (
    <InboxClient 
      shop={shop} 
      initialConversations={conversations} 
      productCount={productCount || 0} 
    />
  );
}
