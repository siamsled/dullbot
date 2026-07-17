import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public Webhook Endpoint for Courier status updates.
 * Unifies callbacks from Pathao, Steadfast, RedX, Paperfly, and eCourier.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[COURIER WEBHOOK] received payload:', payload);

    // Extract tracking ID depending on courier specific formats
    const trackingId = payload.consignment_id || payload.tracking_code || payload.tracking_id || payload.trackingCode;
    // Extract status depending on courier specific formats
    const rawStatus = payload.status || payload.courier_status || payload.order_status || 'updated';

    if (!trackingId) {
      console.warn('[COURIER WEBHOOK] Missing tracking ID reference in webhook payload.');
      return new NextResponse(JSON.stringify({ success: false, error: 'Missing tracking ID' }), { status: 400 });
    }

    // Normalise status (delivered, returned, shipped, cancelled, pending)
    let status = rawStatus.toLowerCase().trim();
    if (status.includes('deliv')) {
      status = 'delivered';
    } else if (status.includes('return') || status.includes('reject')) {
      status = 'returned';
    } else if (status.includes('ship') || status.includes('transit') || status.includes('pickup')) {
      status = 'shipped';
    } else if (status.includes('cancel')) {
      status = 'cancelled';
    } else {
      status = 'shipped'; // default fallback for active states
    }

    console.log(`[COURIER WEBHOOK] Resolved trackingId: ${trackingId}, Normalized Status: ${status}`);

    // Update matching order
    const { data: order, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        courier_status: status,
        courier_status_updated_at: new Date().toISOString()
      })
      .eq('courier_tracking_id', trackingId)
      .select('id, shop_id, conversation_id, status')
      .maybeSingle();

    if (updateErr) {
      console.error('[COURIER WEBHOOK] database update failed:', updateErr);
      return new NextResponse(JSON.stringify({ success: false, error: 'Database update failed' }), { status: 500 });
    }

    if (!order) {
      console.warn(`[COURIER WEBHOOK] No matching order found with tracking ID: ${trackingId}`);
      return new NextResponse(JSON.stringify({ success: false, error: 'Order not found' }), { status: 404 });
    }

    // If order has been successfully delivered, also update orders.status to fulfilled
    if (status === 'delivered') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'fulfilled' })
        .eq('id', order.id);
    } else if (status === 'returned') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', order.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[COURIER WEBHOOK] error parsing request:', error);
    return new NextResponse(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
