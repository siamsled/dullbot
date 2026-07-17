import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public endpoint to receive notifications forwarded from the Android Companion App.
 * Matches incoming transaction details against pending verifications.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[SMS WEBHOOK] Received payload:', payload);

    const { sender, body, secret } = payload;

    // Verify secret token for security
    const systemSecret = process.env.SMS_WEBHOOK_SECRET || 'dullbot_app_secret_123';
    if (secret !== systemSecret) {
      console.warn('[SMS WEBHOOK] Unauthorized request with invalid secret.');
      return new NextResponse(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    if (!body) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Missing body payload' }), { status: 400 });
    }

    let parsedAmount = 0;
    let parsedTrxId = '';
    let provider = '';

    // Regex matching for bKash notifications / SMS
    // Example: "You have received BDT 1,000.00 from 01712345678. Ref: order. TrxID TEST_BKASH_1000"
    const bkashMatch = body.match(/(?:received|CashIn)\s+(?:Tk|BDT)?\s*([\d,.]+).*TrxID\s+([A-Z0-9_]+)/i);
    // Regex matching for Nagad notifications / SMS
    // Example: "Cash In Tk 500.00 from 01812345678. TxnID: TEST_NAGAD_500"
    const nagadMatch = body.match(/(?:Cash\s*In|received)\s+(?:Tk|BDT)?\s*([\d,.]+).*Tx(?:n)?ID:\s*([A-Z0-9_]+)/i);

    if (bkashMatch) {
      parsedAmount = parseFloat(bkashMatch[1].replace(/,/g, ''));
      parsedTrxId = bkashMatch[2].trim();
      provider = 'bkash';
    } else if (nagadMatch) {
      parsedAmount = parseFloat(nagadMatch[1].replace(/,/g, ''));
      parsedTrxId = nagadMatch[2].trim();
      provider = 'nagad';
    } else {
      // Generic fallback parser if provider layout varies
      const genericAmountMatch = body.match(/(?:Tk|BDT|amount)\s*([\d,.]+)/i);
      const genericTrxMatch = body.match(/(?:TrxID|TxnID|Trx|Txn):\s*([A-Z0-9_]+)/i);
      if (genericAmountMatch && genericTrxMatch) {
        parsedAmount = parseFloat(genericAmountMatch[1].replace(/,/g, ''));
        parsedTrxId = genericTrxMatch[1].trim();
        provider = sender?.toLowerCase() || 'unknown';
      }
    }

    if (!parsedTrxId || parsedAmount <= 0) {
      console.warn(`[SMS WEBHOOK] Could not parse transaction details. TrxID: ${parsedTrxId}, Amount: ${parsedAmount}`);
      return new NextResponse(JSON.stringify({ success: false, error: 'Could not parse message details' }), { status: 422 });
    }

    console.log(`[SMS WEBHOOK] Matched transaction. Provider: ${provider}, TrxID: ${parsedTrxId}, Amount: ${parsedAmount}`);

    // Query pending payment verifications matching the expected amount
    const { data: verifications, error: queryErr } = await supabaseAdmin
      .from('payment_verifications')
      .select('*, orders(*)')
      .eq('status', 'pending')
      .eq('expected_amount', parsedAmount);

    if (queryErr) {
      console.error('[SMS WEBHOOK] Database query failed:', queryErr);
      return new NextResponse(JSON.stringify({ success: false, error: 'Database query failed' }), { status: 500 });
    }

    if (!verifications || verifications.length === 0) {
      console.warn(`[SMS WEBHOOK] No matching pending order with expected amount: BDT ${parsedAmount}`);
      return NextResponse.json({ success: false, error: 'No matching pending order found' });
    }

    // Attempt to match by checking if the customer's phone suffix is contained in the notification body
    let matchedVerification = verifications[0];
    if (verifications.length > 1) {
      const bestMatch = verifications.find(v => {
        const phone = v.orders?.customer_phone;
        if (!phone) return false;
        // strip leading zeros or plus country codes to match suffix
        const suffix = phone.slice(-6);
        return body.includes(suffix);
      });
      if (bestMatch) matchedVerification = bestMatch;
    }

    // Update matching payment verification
    await supabaseAdmin
      .from('payment_verifications')
      .update({
        status: 'confirmed',
        matched_reference: parsedTrxId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', matchedVerification.id);

    // Update order status to confirmed
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        bkash_transaction_id: parsedTrxId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', matchedVerification.order_id);

    // Decrement stock count
    await supabaseAdmin.rpc('decrement_stock', {
      p_product_id: matchedVerification.orders.product_id,
      p_variant_id: matchedVerification.orders.variant_id || null,
      p_shop_id: matchedVerification.orders.shop_id,
      p_note: `Android notification listener confirmed payment`
    });

    // Trigger Courier booking
    const { triggerCourierShipment } = await import('@/lib/courier');
    await triggerCourierShipment(matchedVerification.order_id, matchedVerification.orders.shop_id);

    console.log(`[SMS WEBHOOK] Order ${matchedVerification.order_id} successfully confirmed via notification listener.`);

    return NextResponse.json({ success: true, matched_order_id: matchedVerification.order_id });
  } catch (error: any) {
    console.error('[SMS WEBHOOK] Error processing notification webhook:', error);
    return new NextResponse(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
