import InboxClient from './InboxClient';
import { supabaseAdmin, getCurrentShop } from '@/lib/supabase-admin';
import { getConversations, getMessages } from './actions';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const shopRaw = await getCurrentShop();
  if (!shopRaw) return <div>Shop not found.</div>;
  
  const params = await searchParams;
  
  // Get full shop details and onboarding config
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, business_type, onboarding_complete, onboarding_steps_done, payment_verification_method, bkash_number, meta_page_access_token, agent_enabled, courier_provider')
    .eq('id', shopRaw.id)
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

  // Find initial active conversation ID and pre-fetch initial messages on server
  const initialId = params.phone
    ? (conversations.find(c => c.customer_phone === params.phone)?.id ?? conversations[0]?.id ?? null)
    : (conversations[0]?.id ?? null);

  const initialMessages = initialId ? await getMessages(initialId, undefined, 30) : [];

  return (
    <InboxClient 
      shop={shop} 
      initialConversations={conversations} 
      initialMessages={initialMessages}
      productCount={productCount || 0}
      initialPhone={params.phone ?? null}
    />
  );
}
