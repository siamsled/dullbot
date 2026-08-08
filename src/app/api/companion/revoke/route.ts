import { NextResponse } from 'next/server';
import { verifyCompanionDeviceSecret, revokeCompanionDevice } from '@/lib/companion-registry';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!bearerToken) {
      return NextResponse.json({ success: false, error: 'Authorization token required' }, { status: 401 });
    }

    const authResult = await verifyCompanionDeviceSecret(bearerToken);
    if (!authResult.valid || !authResult.shopId || !authResult.deviceId) {
      return NextResponse.json({ success: false, error: 'Invalid or revoked device secret' }, { status: 401 });
    }

    await revokeCompanionDevice(authResult.deviceId, authResult.shopId);

    return NextResponse.json({ success: true, message: 'Companion device revoked successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Server error revoking device' }, { status: 500 });
  }
}
