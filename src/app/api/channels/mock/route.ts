import { NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/chat-pipeline';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_slug, customer_phone, text } = body;

    if (!shop_slug || !customer_phone || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_slug, customer_phone, text' },
        { status: 400 }
      );
    }

    const result = await processIncomingMessage(shop_slug, customer_phone, text);

    return NextResponse.json({
      success: true,
      response: result.message,
      cacheHit: result.cacheHit,
      preFilterHit: result.preFilterHit,
      geminiCalled: result.geminiCalled
    });

  } catch (error) {
    console.error('Mock channel error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
