import { getCurrentShop } from '@/lib/supabase-admin';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const shop = await getCurrentShop();
  if (!shop) redirect('/login');

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, customer_name, customer_phone, customer_address, status, total_amount, product_id, products(name)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const orderList = (orders ?? []).map((o: any) => ({
    id: o.id,
    createdAt: o.created_at,
    customerName: o.customer_name ?? '—',
    customerPhone: o.customer_phone ?? '—',
    productName: o.products?.name ?? 'Unknown product',
    status: o.status ?? 'pending_verification',
    totalAmount: o.total_amount ?? null,
  }));

  return <OrdersClient shopId={shop.id} orders={orderList} />;
}
