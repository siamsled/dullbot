import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyCompanionDeviceSecret, logCompanionTransaction } from '@/lib/companion-registry';

/**
 * Secure endpoint receiving payment SMS notifications from paired DullBot Companion devices.
 * Scope-enforced by shop_id to prevent multi-tenant cross-shop order payment leaks.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[SMS WEBHOOK] Received payload:', payload);

    // Extract device secret from Authorization header or JSON payload
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const deviceSecret = bearerToken || payload.device_secret || payload.secret || payload.authToken;

    if (!deviceSecret) {
      console.warn('[SMS WEBHOOK] Unauthorized request: Missing device authentication secret.');
      return new NextResponse(JSON.stringify({ success: false, error: 'Unauthorized: Device secret required' }), { status: 401 });
    }

    // Verify per-device secret and retrieve associated shop_id
    const authResult = await verifyCompanionDeviceSecret(deviceSecret);
    if (!authResult.valid || !authResult.shopId) {
      console.warn(`[SMS WEBHOOK] Unauthorized device access attempt. Error: ${authResult.error}`);
      return new NextResponse(JSON.stringify({ success: false, error: 'Unauthorized: Invalid or revoked companion device secret' }), { status: 401 });
    }

    const targetShopId = authResult.shopId;
    const body = payload.rawMessage || payload.body;
    const sender = payload.sender;

    if (!body) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Missing message body payload' }), { status: 400 });
    }

    let parsedAmount = 0;
    let parsedTrxId = '';
    let provider = '';

    // Regex matching for bKash notifications / SMS
    const bkashMatch = body.match(/(?:received|CashIn)\s+(?:Tk|BDT)?\s*([\d,.]+).*TrxID\s+([A-Z0-9_]+)/i);
    // Regex matching for Nagad notifications / SMS
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
      // Check explicitly supplied fields if present
      if (payload.amount && payload.trxId) {
        parsedAmount = parseFloat(payload.amount);
        parsedTrxId = payload.trxId;
        provider = payload.gateway || 'mfs';
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
    }

    if (!parsedTrxId || parsedAmount <= 0) {
      console.warn(`[SMS WEBHOOK] Could not parse transaction details. TrxID: ${parsedTrxId}, Amount: ${parsedAmount}`);
      return new NextResponse(JSON.stringify({ success: false, error: 'Could not parse message details' }), { status: 422 });
    }

    console.log(`[SMS WEBHOOK] Device '${authResult.deviceName}' (${authResult.deviceId}) matched transaction for Shop ${targetShopId}. Provider: ${provider}, TrxID: ${parsedTrxId}, Amount: BDT ${parsedAmount}`);

    // Query pending payment verifications STRICTLY isolated by targetShopId using inner join
    const { data: verifications, error: queryErr } = await supabaseAdmin
      .from('payment_verifications')
      .select('*, orders!inner(id, shop_id, customer_phone, product_id)')
      .eq('status', 'pending')
      .eq('expected_amount', parsedAmount)
      .eq('orders.shop_id', targetShopId);

    let matchedOrderId: string | null = null;

    if (verifications && verifications.length > 0) {
      let matchedVerification = verifications[0];
      if (verifications.length > 1) {
        const bestMatch = verifications.find(v => {
          const phone = v.orders?.customer_phone;
          if (!phone) return false;
          const suffix = phone.slice(-6);
          return body.includes(suffix);
        });
        if (bestMatch) matchedVerification = bestMatch;
      }

      matchedOrderId = matchedVerification.order_id;

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

      // Decrement stock count atomically
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: matchedVerification.orders.product_id,
        p_variant_id: null,
        p_shop_id: targetShopId,
        p_note: `Confirmed via DullBot Companion device (${authResult.deviceId})`
      });

      // Trigger Courier booking
      try {
        const { triggerCourierShipment } = await import('@/lib/courier');
        await triggerCourierShipment(matchedVerification.order_id, targetShopId);
      } catch (cErr) {
        console.error('[SMS WEBHOOK] Courier trigger error:', cErr);
      }
    }

    // PERMANENT TRANSACTION LOGGING: Log transaction bound strictly to targetShopId
    await logCompanionTransaction({
      shopId: targetShopId,
      deviceId: authResult.deviceId || 'dev_unknown',
      deviceName: authResult.deviceName || 'Android Gateway',
      trxId: parsedTrxId,
      amount: parsedAmount,
      sender: sender || 'Incoming SMS',
      provider: provider || 'bkash',
      rawMessage: body,
      isMatched: !!matchedOrderId,
      matchedOrderId: matchedOrderId || undefined,
    });

    console.log(`[SMS WEBHOOK] Transaction ${parsedTrxId} logged permanently for shop ${targetShopId}. Matched Order: ${matchedOrderId || 'None'}`);

    return NextResponse.json({
      success: true,
      trx_id: parsedTrxId,
      amount: parsedAmount,
      matched_order_id: matchedOrderId,
      shop_id: targetShopId
    });
  } catch (error: any) {
    console.error('[SMS WEBHOOK] Error processing notification webhook:', error);
    return new NextResponse(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}

/**
 * GET health check for Companion app to verify pairing token status.
 * Returns 401 if device secret token is invalid or revoked.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!bearerToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Device secret required' }, { status: 401 });
    }

    const authResult = await verifyCompanionDeviceSecret(bearerToken);
    if (!authResult.valid || !authResult.shopId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid or revoked companion device secret' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      status: 'active',
      shop_id: authResult.shopId,
      device_id: authResult.deviceId,
      device_name: authResult.deviceName
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
