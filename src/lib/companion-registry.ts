import { supabaseAdmin } from './supabase-admin';
import * as crypto from 'crypto';

export interface CompanionDevice {
  id: string;
  shop_id: string;
  device_name: string;
  device_secret: string;
  created_at: string;
  last_seen_at?: string;
  is_active: boolean;
}

export interface CompanionTransaction {
  id: string;
  shop_id: string;
  device_id: string;
  device_name: string;
  trx_id: string;
  amount: number;
  sender: string;
  provider: string;
  raw_message: string;
  is_matched: boolean;
  matched_order_id: string | null;
  received_at: string;
}

/**
 * Generates or retrieves an active 6-digit pairing code for a shop.
 * Expired after 30 minutes.
 */
export async function getOrCreatePairingCode(shopId: string) {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const now = new Date();
  const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  // Check for existing valid pairing code
  const { data: existing } = await supabaseAdmin
    .from('audit_logs')
    .select('metadata')
    .eq('action', 'companion_pairing_code_create')
    .eq('target_shop_id', resolvedId)
    .gt('metadata->>expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0 && existing[0].metadata?.code) {
    const code = existing[0].metadata.code;
    return { success: true, code };
  }

  // Generate a cryptographically secure 6-digit code
  const num = crypto.randomInt(100000, 999999);
  const code = num.toString();

  await supabaseAdmin.from('audit_logs').insert({
    action: 'companion_pairing_code_create',
    target_shop_id: resolvedId,
    metadata: {
      code,
      created_at: now.toISOString(),
      expires_at: thirtyMinsLater,
    }
  });

  return { success: true, code };
}

/**
 * Validates a 6-digit pairing code or QR JSON and registers the companion device securely.
 */
export async function pairDeviceWithCode(codeOrJson: string, deviceName: string = 'Android Gateway') {
  if (!codeOrJson || typeof codeOrJson !== 'string') {
    return { success: false, error: 'Pairing code or QR code payload is required.' };
  }

  let code = codeOrJson.trim();

  // Parse JSON if QR code contains JSON payload
  if (code.startsWith('{')) {
    try {
      const parsed = JSON.parse(code);
      if (parsed.code) code = parsed.code.toString().trim();
      else if (parsed.device_secret && parsed.shop_id) {
        // Direct pre-generated device secret QR
        return {
          success: true,
          url: parsed.url || process.env.NEXT_PUBLIC_SITE_URL || 'https://dullbot.vercel.app',
          device_secret: parsed.device_secret,
          device_id: parsed.device_id,
          shop_id: parsed.shop_id,
          shop_name: parsed.shop_name || 'DullBot Merchant'
        };
      }
    } catch (e) {}
  }

  // Clean digits (e.g. "718 087" -> "718087")
  code = code.replace(/\D/g, '');

  if (code.length !== 6) {
    return { success: false, error: 'Pairing code must be a 6-digit number.' };
  }

  const now = new Date().toISOString();
  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('target_shop_id, metadata')
    .eq('action', 'companion_pairing_code_create')
    .eq('metadata->>code', code)
    .gt('metadata->>expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !logs || logs.length === 0) {
    return { success: false, error: 'Invalid or expired pairing code. Please check your DullBot dashboard.' };
  }

  const targetShopId = logs[0].target_shop_id;

  // Register device for targetShopId
  const regResult = await createCompanionDevice(targetShopId, deviceName);
  if (!regResult.success || !regResult.device) {
    return { success: false, error: regResult.error || 'Failed to create companion device registration.' };
  }

  // Update shop payment verification method to notification_app
  await supabaseAdmin
    .from('shops')
    .update({ payment_verification_method: 'notification_app' })
    .eq('id', targetShopId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dullbot.vercel.app';

  return {
    success: true,
    url: siteUrl,
    device_id: regResult.device.id,
    device_secret: regResult.device.device_secret,
    shop_id: targetShopId,
    shop_name: regResult.device.shop_name,
  };
}

/**
 * Creates a new companion device pairing token for a shop.
 * Generates a unique, cryptographically secure per-device secret.
 */
export async function createCompanionDevice(shopId: string, deviceName: string = 'Android Gateway') {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const deviceId = `dev_${crypto.randomBytes(8).toString('hex')}`;
  const deviceSecret = `dev_sec_${crypto.randomBytes(24).toString('hex')}`;
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      action: 'companion_device_register',
      target_shop_id: resolvedId,
      metadata: {
        device_id: deviceId,
        device_secret: deviceSecret,
        device_name: deviceName,
        is_active: true,
        created_at: now,
      }
    });

  if (error) {
    console.error('[COMPANION REGISTRY] Failed to register device:', error);
    return { success: false, error: error.message };
  }

  const { data: shop } = await supabaseAdmin.from('shops').select('name').eq('id', resolvedId).single();

  return {
    success: true,
    device: {
      id: deviceId,
      shop_id: resolvedId,
      device_name: deviceName,
      device_secret: deviceSecret,
      created_at: now,
      is_active: true,
      shop_name: shop?.name || 'DullBot Merchant'
    }
  };
}

/**
 * Verifies if an incoming request device_secret belongs to an active companion device.
 * Scopes data strictly to the paired shop_id.
 */
export async function verifyCompanionDeviceSecret(deviceSecret: string) {
  if (!deviceSecret || typeof deviceSecret !== 'string') {
    return { valid: false, error: 'Missing device secret' };
  }

  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('target_shop_id, metadata, created_at')
    .eq('action', 'companion_device_register')
    .eq('metadata->>device_secret', deviceSecret);

  if (error || !logs || logs.length === 0) {
    return { valid: false, error: 'Invalid device secret' };
  }

  const registration = logs[0];
  const deviceId = registration.metadata?.device_id;
  const shopId = registration.target_shop_id;

  // Check if device has been revoked
  const { data: revokes } = await supabaseAdmin
    .from('audit_logs')
    .select('id')
    .eq('action', 'companion_device_revoke')
    .eq('target_shop_id', shopId)
    .eq('metadata->>device_id', deviceId);

  if (revokes && revokes.length > 0) {
    return { valid: false, error: 'Device pairing revoked' };
  }

  // Touch last_seen timestamp asynchronously
  await supabaseAdmin.from('audit_logs').insert({
    action: 'companion_device_heartbeat',
    target_shop_id: shopId,
    metadata: { device_id: deviceId, last_seen_at: new Date().toISOString() }
  });

  return {
    valid: true,
    shopId,
    deviceId,
    deviceName: registration.metadata?.device_name || 'Android Gateway'
  };
}

/**
 * Revokes a companion device pairing.
 */
export async function revokeCompanionDevice(deviceId: string, shopId: string) {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const { error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      action: 'companion_device_revoke',
      target_shop_id: resolvedId,
      metadata: { device_id: deviceId, revoked_at: new Date().toISOString() }
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Lists all active companion devices for a shop.
 */
export async function listCompanionDevices(shopId: string): Promise<CompanionDevice[]> {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const { data: registers } = await supabaseAdmin
    .from('audit_logs')
    .select('metadata, target_shop_id, created_at')
    .eq('action', 'companion_device_register')
    .eq('target_shop_id', resolvedId);

  if (!registers || registers.length === 0) return [];

  const { data: revokes } = await supabaseAdmin
    .from('audit_logs')
    .select('metadata')
    .eq('action', 'companion_device_revoke')
    .eq('target_shop_id', resolvedId);

  const revokedIds = new Set((revokes || []).map(r => r.metadata?.device_id));

  return registers
    .filter(r => !revokedIds.has(r.metadata?.device_id))
    .map(r => ({
      id: r.metadata?.device_id,
      shop_id: r.target_shop_id,
      device_name: r.metadata?.device_name || 'Android Gateway',
      device_secret: r.metadata?.device_secret || '',
      created_at: r.metadata?.created_at || r.created_at,
      is_active: true
    }));
}

/**
 * Permanently logs a received companion transaction in database bound to targetShopId.
 */
export async function logCompanionTransaction(params: {
  shopId: string;
  deviceId: string;
  deviceName: string;
  trxId: string;
  amount: number;
  sender?: string;
  provider?: string;
  rawMessage?: string;
  isMatched?: boolean;
  matchedOrderId?: string;
}) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      action: 'companion_transaction_received',
      target_shop_id: params.shopId,
      metadata: {
        device_id: params.deviceId,
        device_name: params.deviceName,
        trx_id: params.trxId,
        amount: params.amount,
        sender: params.sender || 'Unknown',
        provider: params.provider || 'mfs',
        raw_message: params.rawMessage || '',
        is_matched: params.isMatched ?? false,
        matched_order_id: params.matchedOrderId || null,
        received_at: now,
      }
    })
    .select('id')
    .single();

  return { success: !error, id: data?.id, error: error?.message };
}

/**
 * Lists all companion transactions received for a shop (isolated strictly by shopId).
 * Retained permanently in dashboard database regardless of device status.
 */
export async function listShopCompanionTransactions(shopId: string): Promise<CompanionTransaction[]> {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, metadata, created_at')
    .eq('action', 'companion_transaction_received')
    .eq('target_shop_id', resolvedId)
    .order('created_at', { ascending: false });

  if (error || !logs) return [];

  return logs.map(l => ({
    id: l.id,
    shop_id: resolvedId,
    device_id: l.metadata?.device_id || '',
    device_name: l.metadata?.device_name || 'Android Gateway',
    trx_id: l.metadata?.trx_id || 'UNKNOWN',
    amount: parseFloat(l.metadata?.amount || '0'),
    sender: l.metadata?.sender || 'Unknown',
    provider: (l.metadata?.provider || 'bkash').toLowerCase(),
    raw_message: l.metadata?.raw_message || '',
    is_matched: l.metadata?.is_matched === true || l.metadata?.is_matched === 'true',
    matched_order_id: l.metadata?.matched_order_id || null,
    received_at: l.metadata?.received_at || l.created_at,
  }));
}
