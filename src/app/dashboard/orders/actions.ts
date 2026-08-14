'use server';

import { getCurrentShop, supabaseAdmin, assertShopPermission } from '@/lib/supabase-admin';
import { triggerCourierShipment } from '@/lib/courier';

/**
 * Verifies that the logged-in user has 'orders' permission for the shop that the specified order belongs to.
 */
async function verifyOrderOwnership(orderId: string): Promise<string> {
  const shop = await assertShopPermission('orders');

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('shop_id')
    .eq('id', orderId)
    .single();

  if (error || !order || order.shop_id !== shop.id) {
    throw new Error('Unauthorized: You do not have access to this order.');
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

/**
 * Dispatches to a specific courier provider, overriding the shop default.
 */
export async function dispatchToCourierWithProvider(orderId: string, provider: string) {
  try {
    const shopId = await verifyOrderOwnership(orderId);

    // Temporarily write courier_provider to order so triggerCourierShipment picks it up
    // (triggerCourierShipment reads from shops table, so we pass it via a direct approach)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) throw new Error('Order not found.');

    // Use the courier lib adapter directly with shop config
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('courier_config_encrypted')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) throw new Error('Shop not found.');

    // For manual/none provider: just mark dispatched with a manual tracking note
    if (provider === 'manual') {
      const trackingId = `MANUAL-${Date.now()}`;
      await supabaseAdmin
        .from('orders')
        .update({
          courier_provider: 'manual',
          courier_tracking_id: trackingId,
          fulfillment_status: 'dispatched'
        })
        .eq('id', orderId);

      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'dispatched',
          note: `Order manually marked as dispatched. Ref: ${trackingId}`
        });

      return { success: true, trackingId };
    }

    // Temporarily override courier_provider on shop for this dispatch
    await supabaseAdmin.from('shops').update({ courier_provider: provider }).eq('id', shopId);

    try {
      const success = await triggerCourierShipment(orderId, shopId);
      if (!success) throw new Error(`Courier API (${provider}) returned failure.`);

      await supabaseAdmin
        .from('orders')
        .update({ courier_provider: provider, fulfillment_status: 'dispatched' })
        .eq('id', orderId);

      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'dispatched',
          note: `Order dispatched via ${provider}.`
        });

      return { success: true };
    } finally {
      // Restore original shop courier_provider
      await supabaseAdmin
        .from('shops')
        .update({ courier_provider: order.courier_provider ?? provider })
        .eq('id', shopId);
    }
  } catch (err: any) {
    console.error('Error dispatching to courier with provider override:', err);
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
    const shop = await assertShopPermission('orders');

    // 1. Confirm all orders that belong to this shop in a single batched update
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

    // 2. Batch insert status history logs
    const historyLogs = orderIds.map(orderId => ({
      order_id: orderId,
      status: 'confirmed',
      note: 'Payment confirmed in batch by merchant.'
    }));
    await supabaseAdmin.from('order_status_history').insert(historyLogs);

    // 3. Process stock decrements and courier triggers in parallel
    const { data: orderDetails } = await supabaseAdmin
      .from('orders')
      .select('id, product_id, variant_id')
      .in('id', orderIds)
      .eq('shop_id', shop.id);

    if (orderDetails && orderDetails.length > 0) {
      await Promise.all(
        orderDetails.map(async (order) => {
          // Decrement stock
          await supabaseAdmin.rpc('decrement_stock', {
            p_product_id: order.product_id,
            p_variant_id: order.variant_id || null,
            p_shop_id: shop.id,
            p_note: `Batch payment confirmation for order ${order.id}`
          });
          // Trigger courier
          await triggerCourierShipment(order.id, shop.id);
        })
      );
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error bulk confirming payments:', err);
    return { success: false, error: err.message };
  }
}

export async function bulkDispatchToCourier(orderIds: string[]) {
  try {
    const shop = await assertShopPermission('orders');

    // 1. Trigger bookings in parallel
    const results = await Promise.all(
      orderIds.map(async (orderId) => {
        const success = await triggerCourierShipment(orderId, shop.id);
        return { orderId, success };
      })
    );

    const successfulIds = results.filter(r => r.success).map(r => r.orderId);
    const successCount = successfulIds.length;
    const failCount = orderIds.length - successCount;

    if (successCount > 0) {
      // 2. Batch update order fulfillment status
      await supabaseAdmin
        .from('orders')
        .update({ fulfillment_status: 'dispatched' })
        .in('id', successfulIds);

      // 3. Batch insert history logs
      const historyLogs = successfulIds.map(orderId => ({
        order_id: orderId,
        status: 'dispatched',
        note: 'Order dispatched in batch to courier service.'
      }));
      await supabaseAdmin.from('order_status_history').insert(historyLogs);
    }

    return { success: true, successCount, failCount };
  } catch (err: any) {
    console.error('Error bulk dispatching:', err);
    return { success: false, error: err.message };
  }
}

export type PosLineItemInput = {
  productId: string;
  variantId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
};

export type PosOrderPayload = {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'card';
  transactionRef?: string;
  deliveryCharge?: number;
  discountAmount?: number;
  fulfillmentType: 'in_person' | 'delivery';
  items: PosLineItemInput[];
  note?: string;
};

/**
 * Retrieves active inventory products for POS checkout.
 */
export async function fetchPosProducts() {
  try {
    const shop = await assertShopPermission('pos');
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, price, stock_quantity, image_url, category, sku')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(error.message);
    return { success: true, products: products ?? [] };
  } catch (err: any) {
    console.error('Error fetching POS products:', err);
    return { success: false, error: err.message, products: [] };
  }
}

/**
 * Creates an in-person or manual POS order, atomically decrements stock via RPC, and logs history.
 */
export async function createPosOrder(payload: PosOrderPayload) {
  try {
    const shop = await assertShopPermission('pos');

    if (!payload.items || payload.items.length === 0) {
      throw new Error('At least one item is required in the cart.');
    }

    const itemsSubtotal = payload.items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const deliveryCharge = payload.fulfillmentType === 'delivery' ? (payload.deliveryCharge ?? 100) : 0;
    const discount = payload.discountAmount ?? 0;
    const totalAmount = Math.max(0, itemsSubtotal + deliveryCharge - discount);

    const isDelivered = payload.fulfillmentType === 'in_person';
    const fulfillmentStatus = isDelivered ? 'delivered' : 'awaiting_dispatch';
    const status = 'confirmed'; // POS orders are paid immediately

    const operatorName = shop.staffName || (shop.isOwner ? 'Store Owner' : 'POS Cashier');

    // 1. Insert order record
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        shop_id: shop.id,
        customer_name: payload.customerName?.trim() || 'Walk-in Customer',
        customer_phone: payload.customerPhone?.trim() || 'Walk-in',
        customer_address: payload.customerAddress?.trim() || (isDelivered ? 'In-Store POS' : 'Customer Address'),
        total_amount: totalAmount,
        status,
        payment_method: payload.paymentMethod,
        payment_verified_at: new Date().toISOString(),
        payment_transaction_ref: payload.transactionRef || (payload.paymentMethod === 'cash' ? `CASH-${Date.now().toString().slice(-6)}` : null),
        verification_method: null,
        fulfillment_status: fulfillmentStatus,
        internal_note: `[POS SALE] Processed by ${operatorName}${payload.note ? ` · ${payload.note}` : ''}`,
        confirmed_at: new Date().toISOString(),
      })
      .select('id, created_at, customer_name, customer_phone, customer_address, total_amount, status, payment_method, fulfillment_status')
      .single();

    if (orderErr || !order) {
      throw new Error(`Failed to create POS order: ${orderErr?.message}`);
    }

    // 2. Insert line items
    const lineItemRows = payload.items.map(it => ({
      order_id: order.id,
      product_id: it.productId || null,
      product_name: it.productName,
      quantity: it.quantity,
      unit_price: it.unitPrice,
    }));

    const { error: lineErr } = await supabaseAdmin.from('order_line_items').insert(lineItemRows);
    if (lineErr) {
      console.warn('Warning inserting line items for POS:', lineErr);
    }

    // 3. Atomically decrement stock via existing RPC for each product
    for (const item of payload.items) {
      if (item.productId) {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: item.productId,
          p_variant_id: item.variantId || null,
          p_shop_id: shop.id,
          p_note: `POS sale #${order.id.slice(0, 8)} (${operatorName})`
        });
      }
    }

    // 4. Log status history
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      status: 'confirmed',
      note: `In-store POS sale confirmed via ${payload.paymentMethod.toUpperCase()} by ${operatorName}. Total: ৳${totalAmount.toLocaleString()}`
    });

    if (isDelivered) {
      await supabaseAdmin.from('order_status_history').insert({
        order_id: order.id,
        status: 'delivered',
        note: 'Customer received products in-store at POS checkout.'
      });
    }

    return {
      success: true,
      order: {
        id: order.id,
        createdAt: order.created_at,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        totalAmount: order.total_amount,
        status: order.status,
        paymentMethod: order.payment_method,
        fulfillmentStatus: order.fulfillment_status,
        lineItems: payload.items.map(it => ({
          product_name: it.productName,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          imageUrl: it.imageUrl || null
        })),
        statusHistory: [],
        paymentVerifications: []
      }
    };
  } catch (err: any) {
    console.error('Error creating POS order:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates a product's SKU/Barcode in Supabase so physical barcode scanner guns can ring it up instantly.
 */
export async function updateProductSku(productId: string, sku: string) {
  try {
    const shop = await assertShopPermission('inventory');
    const cleanSku = sku.trim();

    if (!cleanSku) {
      return { success: false, error: 'SKU cannot be empty.' };
    }

    // Check if another product in this shop already has this SKU
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('shop_id', shop.id)
      .ilike('sku', cleanSku)
      .neq('id', productId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `SKU "${cleanSku}" is already registered to "${existing.name}".` };
    }

    const { data: updated, error } = await supabaseAdmin
      .from('products')
      .update({ sku: cleanSku, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('shop_id', shop.id)
      .select('id, name, sku')
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update SKU.');
    }

    return { success: true, product: updated };
  } catch (err: any) {
    console.error('Error updating product SKU:', err);
    return { success: false, error: err.message || 'Failed to save SKU.' };
  }
}

