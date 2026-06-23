import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_id, raw_sms_text } = body;

    if (!shop_id || !raw_sms_text) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, raw_sms_text' },
        { status: 400 }
      );
    }

    // Typical bKash SMS pattern (e.g., "You have received Tk 500.00 from 017XXXXXX. Ref: xxxxx. TrxID 9H7A2...")
    // This is a naive regex matching the TrxID and Amount.
    // In production, this would be highly tailored to actual SMS structures from bKash and Nagad.
    const amountMatch = raw_sms_text.match(/Tk\s?([\d,\.]+)/i);
    const trxIdMatch = raw_sms_text.match(/TrxID\s?([A-Z0-9]+)/i);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    const trxId = trxIdMatch ? trxIdMatch[1] : null;

    if (!amount || !trxId) {
      return NextResponse.json(
        { success: false, message: 'Could not parse amount or TrxID from SMS' },
        { status: 200 } // Return 200 so the forwarding app doesn't retry
      );
    }

    // In a full implementation, we would do the following database operations here:
    // 1. Fetch `pending_verification` order for `shop_id` with `delivery_charge_amount` == amount
    // 2. Update order `status` to 'confirmed', `bkash_transaction_id` = trxId, `confirmed_at` = now()
    
    // This is mocked logic for the scaffold.
    console.log(`Parsed Payment for shop ${shop_id}: TrxID=${trxId}, Amount=${amount}`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order confirmed',
      data: { trxId, amount }
    });
  } catch (error) {
    console.error('SMS webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
