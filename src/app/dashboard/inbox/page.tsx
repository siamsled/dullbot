import InboxClient from './InboxClient';
import { supabaseAdmin, getCurrentShop } from '@/lib/supabase-admin';
import { getConversations, getMessages } from './actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const shopRaw = await getCurrentShop();
  if (!shopRaw) {
    redirect('/login');
  }
  
  let params: { phone?: string } = {};
  try {
    params = await searchParams;
  } catch {}
  
  // Get full shop details and onboarding config
  let shop: any = shopRaw;
  try {
    const { data: fullShop } = await supabaseAdmin
      .from('shops')
      .select('id, name, business_type, onboarding_complete, onboarding_steps_done, payment_verification_method, bkash_number, meta_page_access_token, agent_enabled, courier_provider')
      .eq('id', shopRaw.id)
      .single();
    if (fullShop) {
      shop = { ...shopRaw, ...fullShop };
    }
  } catch (err) {
    console.error('Failed to fetch full shop details in inbox:', err);
  }

  // Fetch product count for checklist verification
  let productCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id);
    productCount = count || 0;
  } catch {}

  // Get all connected Meta Pages (for multi-page filtering)
  let connectedPages: any[] = [];
  try {
    const { data } = await supabaseAdmin
      .from('shop_meta_pages')
      .select('meta_page_id, meta_page_name, instagram_business_id, is_primary')
      .eq('shop_id', shop.id)
      .order('is_primary', { ascending: false });
    connectedPages = data || [];
  } catch {}

  // Get initial conversations (with names resolved)
  let conversations: any[] = [];
  try {
    conversations = await getConversations(shop.id);
  } catch (err) {
    console.error('Failed to fetch conversations in inbox:', err);
  }

  // Find initial active conversation ID and pre-fetch initial messages on server
  const initialId = params?.phone
    ? (conversations.find(c => c.customer_phone === params.phone)?.id ?? conversations[0]?.id ?? null)
    : (conversations[0]?.id ?? null);

  let initialMessages: any[] = [];
  if (initialId) {
    try {
      initialMessages = await getMessages(initialId, undefined, 30);
    } catch (err) {
      console.error('Failed to fetch initial messages in inbox:', err);
    }
  }

  return (
    <InboxClient 
      shop={shop} 
      initialConversations={conversations} 
      initialMessages={initialMessages}
      productCount={productCount}
      initialPhone={params?.phone ?? null}
      connectedPages={connectedPages}
    />
  );
}
