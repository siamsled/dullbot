'use server';

import { getCurrentShop, supabaseAdmin } from '@/lib/supabase-admin';
import { triggerCourierShipment } from '@/lib/courier';

/**
 * Verifies that the logged-in user owns the shop that the specified order belongs to.
 */
async function verifyOrderOwnership(orderId: string): Promise<string> {
  const shop = await getCurrentShop();
  if (!shop) throw new Error('Unauthorized: No shop session found.');

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('shop_id')
    .eq('id', orderId)
    .single();

  if (error || !order || order.shop_id !== shop.id) {
    throw new Error('Unauthorized: You do not own this order.');
  }

  return shop.id;
}

export async function verifyPaymentManually(orderId: string, transactionRef: string) {
  try {
    const shopId = await verifyOrderOwnership(orderId);

    // 1. Update order
    const { data: order, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        bkash_transaction_id: transactionRef,
        confirmed_at: new Date().toISOString(),
        payment_method: 'manual',
        payment_verified_at: new Date().toISOString(),
        payment_transaction_ref: transactionRef,
        fulfillment_status: 'awaiting_dispatch',
        needs_review: false,
        review_reason: null
      })
      .eq('id', orderId)
      .select('product_id, variant_id')
      .single();

    if (updateErr || !order) {
      throw new Error(`Failed to update order: ${updateErr?.message}`);
    }

    // 2. Insert into history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'confirmed',
        note: `Payment verified manually by merchant. Ref: ${transactionRef}`
      });

    // 3. Decrement stock
    await supabaseAdmin.rpc('decrement_stock', {
      p_product_id: order.product_id,
      p_variant_id: order.variant_id || null,
      p_shop_id: shopId,
      p_note: `Manual payment confirmation for order ${orderId}`
    });

    // 4. Trigger Courier Booking
    await triggerCourierShipment(orderId, shopId);

    return { success: true };
  } catch (err: any) {
    console.error('Error verifying payment manually:', err);
    return { success: false, error: err.message };
  }
}

export async function dispatchToCourier(orderId: string) {
  try {
    const shopId = await verifyOrderOwnership(orderId);

    // Trigger Courier Shipment
    const success = await triggerCourierShipment(orderId, shopId);
    if (!success) {
      throw new Error('Courier API returned failure. Check courier configurations.');
    }

    // Update fulfillment status
    await supabaseAdmin
      .from('orders')
      .update({
        fulfillment_status: 'dispatched'
      })
      .eq('id', orderId);

    // Insert status history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'dispatched',
        note: 'Order dispatched via courier service.'
      });

    return { success: true };
  } catch (err: any) {
    console.error('Error dispatching to courier:', err);
    return { success: false, error: err.message };
  }
}

export async function cancelOrder(orderId: string, reason: string) {
  try {
    await verifyOrderOwnership(orderId);

    // Update order status
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        fulfillment_status: 'cancelled'
      })
      .eq('id', orderId);

    if (updateErr) throw new Error(updateErr.message);

    // Insert status history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'cancelled',
        note: `Order cancelled by merchant. Reason: ${reason}`
      });

    return { success: true };
  } catch (err: any) {
    console.error('Error cancelling order:', err);
    return { success: false, error: err.message };
  }
}

export async function updateInternalNote(orderId: string, note: string) {
  try {
    await verifyOrderOwnership(orderId);

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ internal_note: note })
      .eq('id', orderId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    console.error('Error updating internal note:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleNeedsReview(orderId: string, needsReview: boolean, reason?: string) {
  try {
    await verifyOrderOwnership(orderId);

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        needs_review: needsReview,
        review_reason: needsReview ? (reason || 'merchant_review') : null
      })
      .eq('id', orderId);

    if (error) throw new Error(error.message);

    // Insert status history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'review_updated',
        note: needsReview
          ? `Order flagged for review. Reason: ${reason || 'Merchant flagged'}`
          : 'Order cleared from review status.'
      });

    return { success: true };
  } catch (err: any) {
    console.error('Error toggling review flag:', err);
    return { success: false, error: err.message };
  }
}

export async function bulkConfirmPayment(orderIds: string[]) {
  try {
    const shop = await getCurrentShop();
    if (!shop) throw new Error('Unauthorized: No shop session found.');

    // 1. Confirm all orders that belong to this shop
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        payment_method: 'manual',
        payment_verified_at: new Date().toISOString(),
        fulfillment_status: 'awaiting_dispatch',
        needs_review: false,
        review_reason: null
      })
      .in('id', orderIds)
      .eq('shop_id', shop.id);

    if (updateErr) throw new Error(updateErr.message);

    // 2. Write history logs and decrement stock for each
    for (const orderId of orderIds) {
      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'confirmed',
          note: 'Payment confirmed in batch by merchant.'
        });

      // Get order details to decrement stock
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('product_id, variant_id')
        .eq('id', orderId)
        .single();

      if (order) {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: order.product_id,
          p_variant_id: order.variant_id || null,
          p_shop_id: shop.id,
          p_note: `Batch payment confirmation for order ${orderId}`
        });

        // Trigger shipment
        await triggerCourierShipment(orderId, shop.id);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error bulk confirming payments:', err);
    return { success: false, error: err.message };
  }
}

export async function bulkDispatchToCourier(orderIds: string[]) {
  try {
    const shop = await getCurrentShop();
    if (!shop) throw new Error('Unauthorized: No shop session found.');

    let successCount = 0;
    let failCount = 0;

    for (const orderId of orderIds) {
      const success = await triggerCourierShipment(orderId, shop.id);
      if (success) {
        successCount++;
        await supabaseAdmin
          .from('orders')
          .update({ fulfillment_status: 'dispatched' })
          .eq('id', orderId);

        await supabaseAdmin
          .from('order_status_history')
          .insert({
            order_id: orderId,
            status: 'dispatched',
            note: 'Order dispatched in batch to courier service.'
          });
      } else {
        failCount++;
      }
    }

    return { success: true, successCount, failCount };
  } catch (err: any) {
    console.error('Error bulk dispatching:', err);
    return { success: false, error: err.message };
  }
}
