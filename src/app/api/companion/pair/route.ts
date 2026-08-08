import { NextResponse } from 'next/server';
import { pairDeviceWithCode } from '@/lib/companion-registry';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const code = payload.code || payload.qrData || payload.token;
    const deviceName = payload.device_name || payload.deviceName || 'Android Companion';

    if (!code) {
      return NextResponse.json({ success: false, error: 'Pairing code is required' }, { status: 400 });
    }

    const result = await pairDeviceWithCode(code, deviceName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Server error pairing device' }, { status: 500 });
  }
}
