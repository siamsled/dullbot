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
    .select(`
      id, 
      created_at, 
      customer_name, 
      customer_phone, 
      customer_address, 
      status, 
      total_amount, 
      payment_method, 
      payment_verified_at, 
      payment_transaction_ref, 
      needs_review, 
      review_reason, 
      courier_provider, 
      courier_tracking_id, 
      fulfillment_status, 
      internal_note, 
      order_line_items(*), 
      order_status_history(*)
    `)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const orderList = (orders ?? []).map((o: any) => ({
    id: o.id,
    createdAt: o.created_at,
    customerName: o.customer_name ?? '—',
    customerPhone: o.customer_phone ?? '—',
    customerAddress: o.customer_address ?? '—',
    status: o.status ?? 'pending_verification',
    totalAmount: o.total_amount ?? null,
    paymentMethod: o.payment_method ?? null,
    paymentVerifiedAt: o.payment_verified_at ?? null,
    paymentTransactionRef: o.payment_transaction_ref ?? null,
    needsReview: o.needs_review ?? false,
    reviewReason: o.review_reason ?? null,
    courierProvider: o.courier_provider ?? null,
    courierTrackingId: o.courier_tracking_id ?? null,
    fulfillmentStatus: o.fulfillment_status ?? 'awaiting_dispatch',
    internalNote: o.internal_note ?? '',
    lineItems: o.order_line_items ?? [],
    statusHistory: (o.order_status_history ?? []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }));

  return <OrdersClient shopId={shop.id} orders={orderList} />;
}

