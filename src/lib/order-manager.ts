import { supabaseAdmin } from './supabase-admin';
import { verifyMerchantPayment } from './payment-verification';
import { triggerCourierShipment } from './courier';
import { extractDistrict } from './analytics';


export interface CreateOrderPayload {
  product_id: string;
  variant_name?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  amount?: number;
}

/**
 * Parses Gemini response text, intercepts [CREATE_ORDER: ...] tag,
 * inserts a pending order into the database, and returns the cleaned response.
 */
export async function handleOrderCreationIntercept(
  conversationId: string,
  shopId: string,
  aiText: string
): Promise<{ cleanedText: string; orderId: string | null }> {
  // Regex to extract [CREATE_ORDER: { ... }]
  const orderRegex = /\[CREATE_ORDER:\s*(\{[\s\S]*?\})\]/;
  const match = aiText.match(orderRegex);

  if (!match) {
    return { cleanedText: aiText, orderId: null };
  }

  const jsonString = match[1];
  const cleanedText = aiText.replace(orderRegex, '').trim();

  try {
    const payload: CreateOrderPayload = JSON.parse(jsonString);
    console.log(`[ORDER INTERCEPT] parsed order payload for conversation ${conversationId}:`, payload);

    // 1. Fetch product details to verify price & stock
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('price, name, stock_quantity')
      .eq('id', payload.product_id)
      .single();

    if (!product) {
      console.warn(`[ORDER INTERCEPT] Product ID ${payload.product_id} not found.`);
      return { cleanedText, orderId: null };
    }

    let finalPrice = product.price;
    let variantId: string | null = null;

    // 2. Fetch variant details if specified
    if (payload.variant_name) {
      const { data: variant } = await supabaseAdmin
        .from('product_variants')
        .select('id, price_override, stock')
        .eq('product_id', payload.product_id)
        .eq('name', payload.variant_name)
        .single();

      if (variant) {
        variantId = variant.id;
        if (variant.price_override != null) {
          finalPrice = variant.price_override;
        }
      }
    }

    const deliveryCharge = 100; // Flat delivery charge in BDT
    const expectedAmount = finalPrice + deliveryCharge;

    // 3. Create the pending order
    const totalAmount = finalPrice + deliveryCharge;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        shop_id: shopId,
        conversation_id: conversationId,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_address: payload.customer_address,
        customer_district: extractDistrict(payload.customer_address ?? ''),
        product_id: payload.product_id,
        status: 'pending_verification',
        delivery_charge_amount: deliveryCharge,
        total_amount: totalAmount,
        fulfillment_status: 'awaiting_dispatch'
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error('[ORDER INTERCEPT] failed to create order:', orderErr);
      return { cleanedText, orderId: null };
    }

    if (payload.customer_name && payload.customer_name.trim().toLowerCase() !== 'customer') {
      await supabaseAdmin
        .from('conversations')
        .update({ meta_name: payload.customer_name.trim() })
        .eq('id', conversationId);
    }

    // Insert System Marker for AI Tool Call
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender: 'system',
      content: `DullBot AI created order for ${product.name} (৳${totalAmount})`
    });

    // Insert line item snapshot
    await supabaseAdmin
      .from('order_line_items')
      .insert({
        order_id: order.id,
        product_id: payload.product_id,
        product_name: product.name,
        quantity: 1,
        unit_price: finalPrice
      });

    // Insert initial status history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: 'pending_verification',
        note: 'Order registered via AI chatbot conversation.'
      });

    // Attempt to update variant_id or variant_name if columns exist
    // Using a dynamic update statement that ignores columns errors
    await supabaseAdmin
      .from('orders')
      .update({
        // @ts-ignore
        variant_id: variantId,
        // @ts-ignore
        variant_name: payload.variant_name
      })
      .eq('id', order.id);


    // 4. Fetch the shop's preferred payment verification method
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('payment_verification_method')
      .eq('id', shopId)
      .single();

    const verificationMethod = shop?.payment_verification_method === 'merchant_api'
      ? 'merchant_api'
      : (shop?.payment_verification_method === 'notification_app' ? 'notification_app' : 'merchant_api');

    // 5. Create payment verification entry
    const { error: pvErr } = await supabaseAdmin
      .from('payment_verifications')
      .insert({
        order_id: order.id,
        method: verificationMethod,
        expected_amount: expectedAmount,
        status: 'pending'
      });

    if (pvErr) {
      console.error('[ORDER INTERCEPT] failed to create payment verification record:', pvErr);
    }

    return { cleanedText, orderId: order.id };
  } catch (error) {
    console.error('[ORDER INTERCEPT] failed to parse order JSON:', error);
    return { cleanedText, orderId: null };
  }
}

/**
 * Processes incoming payment claim messages.
 * If verified, confirms the order, decrements stock, and triggers shipment.
 * Otherwise, counts attempts, fails/escalates to manual support review, and triggers human takeover.
 */
export async function processPaymentVerification(
  conversationId: string,
  shopId: string,
  customerMessage: string
): Promise<string | null> {
  // 1. Fetch pending verifications
  const { data: pendingVerifications } = await supabaseAdmin
    .from('payment_verifications')
    .select(`
      id, method, expected_amount, matched_reference, status, customer_provided_ref, confirmed_at, created_at, order_id, booking_id,
      orders ( id, conversation_id, shop_id, total_amount, product_id, variant_id ),
      bookings ( id, conversation_id, shop_id, service_id, starts_at, ends_at, customer_name, customer_phone )
    `)
    .eq('status', 'pending');

  const relevant = (pendingVerifications || []).filter(pv => {
    const orderObj = pv.orders as any;
    const bookingObj = pv.bookings as any;
    const orderMatches = orderObj && (Array.isArray(orderObj) ? orderObj[0]?.conversation_id === conversationId : orderObj.conversation_id === conversationId);
    const bookingMatches = bookingObj && (Array.isArray(bookingObj) ? bookingObj[0]?.conversation_id === conversationId : bookingObj.conversation_id === conversationId);
    return orderMatches || bookingMatches;
  });

  if (relevant.length === 0) {
    return null; // No pending payment check for this conversation
  }

  const pv = relevant[0];
  const order = pv.orders ? (Array.isArray(pv.orders) ? (pv.orders as any)[0] : (pv.orders as any)) : null;
  const booking = pv.bookings ? (Array.isArray(pv.bookings) ? (pv.bookings as any)[0] : (pv.bookings as any)) : null;

  const cleanMsg = customerMessage.trim().toUpperCase();

  // Regex to match TrxID or phone digits
  const trxRegex = /\b(TEST_[A-Z0-9_]+|[A-Z0-9]{8,10})\b/i;
  const digitsRegex = /\b\d{3,4}\b/;

  let extractedRef = '';
  const trxMatch = cleanMsg.match(trxRegex);
  if (trxMatch) {
    extractedRef = trxMatch[0];
  } else {
    const digitsMatch = cleanMsg.match(digitsRegex);
    if (digitsMatch) {
      extractedRef = digitsMatch[0];
    }
  }

  if (!extractedRef) {
    const paidKeywords = ['PAID', 'PAY', 'টাকা', 'দিয়েছি', 'পাঠালাম', 'SENT', 'DONE'];
    if (paidKeywords.some(k => cleanMsg.includes(k))) {
      return "আপনার পেমেন্টের TrxID (Transaction ID) অথবা যে নম্বর থেকে টাকা পাঠিয়েছেন তার শেষের ৩-৪টি সংখ্যা দিন, যাতে আমরা পেমেন্ট নিশ্চিত করতে পারি।";
    }
    return null;
  }

  // 2. Fetch config
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('bkash_config_encrypted, nagad_config_encrypted, payment_verification_method')
    .eq('id', shopId)
    .single();

  if (!shop) return null;

  const provider = shop.nagad_config_encrypted && (cleanMsg.includes('NAGAD') || cleanMsg.includes('NGD') || cleanMsg.startsWith('TEST_NAGAD')) ? 'nagad' : 'bkash';
  const configEncrypted = provider === 'bkash' ? shop.bkash_config_encrypted : shop.nagad_config_encrypted;

  if (!configEncrypted && !extractedRef.startsWith('TEST_')) {
    console.warn(`[PAYMENT VERIFICATION] No merchant config found for provider ${provider}`);
    return null;
  }

  // 3. Verify payment via merchant API (or mock wrapper)
  const verification = await verifyMerchantPayment(provider, configEncrypted || 'mock_fallback', extractedRef);

  if (verification.success) {
    if (Math.abs((verification.amount || 0) - pv.expected_amount) <= 1) {
      // Confirm verification entry
      await supabaseAdmin
        .from('payment_verifications')
        .update({
          status: 'confirmed',
          customer_provided_ref: extractedRef,
          matched_reference: verification.reference || null,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', pv.id);

      if (order) {
        // Confirm order entry
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'confirmed',
            bkash_transaction_id: extractedRef,
            confirmed_at: new Date().toISOString(),
            payment_method: pv.method,
            payment_verified_at: new Date().toISOString(),
            payment_transaction_ref: extractedRef,
            fulfillment_status: 'awaiting_dispatch'
          })
          .eq('id', order.id);

        // Log verified in status history
        await supabaseAdmin
          .from('order_status_history')
          .insert({
            order_id: order.id,
            status: 'confirmed',
            note: `Payment verified automatically via ${provider.toUpperCase()}. Expected ৳${pv.expected_amount}, matched ৳${verification.amount}. TrxID: ${extractedRef}`
          });

        // Atomically decrement stock
        const { data: stockResult, error: stockErr } = await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: order.product_id,
          p_variant_id: order.variant_id || null,
          p_shop_id: shopId,
          p_note: `Order ${order.id} verified via ${pv.method}`
        });
        if (stockErr) {
          console.error('[PAYMENT VERIFICATION] stock decrement failed:', stockErr);
        }

        // Trigger courier shipment booking (Phase 2)
        await triggerCourierShipment(order.id, shopId);

        // Insert System Marker for AI Tool Call
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender: 'system',
          content: `DullBot AI verified payment and confirmed order #${order.id.substring(0, 8)}`
        });

        return `অনেক ধন্যবাদ! আপনার পেমেন্ট সফলভাবে নিশ্চিত করা হয়েছে। অর্ডারটি কনফার্ম হয়েছে এবং শীঘ্রই ডেলিভারির জন্য পাঠানো হবে।`;
      } else if (booking) {
        // Confirm booking entry
        await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            deposit_status: 'verified'
          })
          .eq('id', booking.id);

        // Log in booking status history
        await supabaseAdmin
          .from('booking_status_history')
          .insert({
            booking_id: booking.id,
            status: 'confirmed',
            note: `Deposit payment verified automatically via ${provider.toUpperCase()}. Expected ৳${pv.expected_amount}, matched ৳${verification.amount}. TrxID: ${extractedRef}`
          });

      }
      return null;
    } else {
      console.warn(`[PAYMENT VERIFICATION] amount mismatch. Expected: ${pv.expected_amount}, Found: ${verification.amount}`);

      await supabaseAdmin
        .from('payment_verifications')
        .update({
          status: 'mismatch',
          customer_provided_ref: extractedRef
        })
        .eq('id', pv.id);

      if (order) {
        // Flag order for review due to mismatch
        await supabaseAdmin
          .from('orders')
          .update({
            needs_review: true,
            review_reason: 'payment_mismatch'
          })
          .eq('id', order.id);

        // Log mismatch in status history
        await supabaseAdmin
          .from('order_status_history')
          .insert({
            order_id: order.id,
            status: 'pending_verification',
            note: `Payment verification mismatch. Expected ৳${pv.expected_amount}, found ৳${verification.amount}. TrxID: ${extractedRef}`
          });
      } else if (booking) {
        // Flag booking deposit status as mismatch
        await supabaseAdmin
          .from('bookings')
          .update({
            deposit_status: 'mismatch'
          })
          .eq('id', booking.id);

        // Log in booking status history
        await supabaseAdmin
          .from('booking_status_history')
          .insert({
            booking_id: booking.id,
            status: 'pending_deposit',
            note: `Deposit verification mismatch. Expected ৳${pv.expected_amount}, found ৳${verification.amount}. TrxID: ${extractedRef}`
          });
      }

      // Force human takeover
      await supabaseAdmin
        .from('conversations')
        .update({ status: 'human_takeover' })
        .eq('id', conversationId);

      // Log mismatch in audit logs
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'payment_mismatch',
          target_shop_id: shopId,
          target_conversation_id: conversationId,
          metadata: {
            expected: pv.expected_amount,
            found: verification.amount,
            trxId: extractedRef
          }
        });

      return `দুঃখিত, আমরা পেমেন্ট পেয়েছি তবে টাকার পরিমাণ মেলেনি। সঠিক বিষয়টির জন্য আপনাকে আমাদের একজন কাস্টমার প্রতিনিধির কাছে স্থানান্তর করা হচ্ছে।`;
    }
  } else {
    console.log(`[PAYMENT VERIFICATION] check failed for ref ${extractedRef}: ${verification.error}`);

    // Check if we already tried to verify and failed on this conversation
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender', 'bot')
      .ilike('content', '%পেমেন্ট পাওয়া যায়নি%');

    const failsCount = count || 0;

    if (failsCount >= 1) {
      await supabaseAdmin
        .from('payment_verifications')
        .update({
          status: 'failed',
          customer_provided_ref: extractedRef
        })
        .eq('id', pv.id);

      if (order) {
        // Flag order for review due to verification failure
        await supabaseAdmin
          .from('orders')
          .update({
            needs_review: true,
            review_reason: 'payment_failed'
          })
          .eq('id', order.id);

        // Log failure in status history
        await supabaseAdmin
          .from('order_status_history')
          .insert({
            order_id: order.id,
            status: 'pending_verification',
            note: `Payment verification failed repeatedly. Last reference: ${extractedRef}. Error: ${verification.error}`
          });
      } else if (booking) {
        // Flag booking for review due to verification failure
        await supabaseAdmin
          .from('bookings')
          .update({
            deposit_status: 'failed'
          })
          .eq('id', booking.id);

        // Log failure in booking status history
        await supabaseAdmin
          .from('booking_status_history')
          .insert({
            booking_id: booking.id,
            status: 'pending_deposit',
            note: `Deposit verification failed repeatedly. Last reference: ${extractedRef}. Error: ${verification.error}`
          });
      }

      // Force human takeover
      await supabaseAdmin
        .from('conversations')
        .update({ status: 'human_takeover' })
        .eq('id', conversationId);

      // Log failure escalation in audit logs
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'payment_failed_escalate',
          target_shop_id: shopId,
          target_conversation_id: conversationId,
          metadata: { trxId: extractedRef, error: verification.error }
        });

      return `দুঃখিত, পেমেন্টটি এখনও পাওয়া যায়নি। আমরা এই চ্যাটটি আমাদের সাপোর্ট টিমের কাছে হস্তান্তর করছি। একজন প্রতিনিধি দ্রুত পেমেন্ট চেক করে কনফার্ম করবেন।`;
    } else {
      return `দুঃখিত, এই TrxID বা নম্বরের কোনো পেমেন্ট পাওয়া যায়নি। দয়া করে আপনার ট্রানজেকশন আইডি (যেমন: 9H7A2K1L9S) অথবা নম্বরটি আবার চেক করে সঠিকভাবে পাঠান।`;
    }
  }
}
