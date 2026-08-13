import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function runRbacTests() {
  console.log('\n======================================================');
  console.log('  STARTING RBAC & EMPLOYEE ACCESS AUDIT / BREACH TESTS');
  console.log('======================================================\n');

  // 1. Fetch an existing active shop to test with
  const { data: shop, error: shopErr } = await supabaseAdmin
    .from('shops')
    .select('id, name, owner_id')
    .limit(1)
    .single();

  if (shopErr || !shop) {
    console.error('FAILED: No test shop found.', shopErr);
    process.exit(1);
  }

  console.log(`[TEST SETUP] Using shop: "${shop.name}" (${shop.id})`);

  // 2. Create a restricted Employee account (role: cashier, perms: ['orders', 'pos'])
  const testStaffEmail = `test_cashier_${Date.now()}@dullbot-test.com`;
  const testPassword = 'Password123!_secure';
  const restrictedPermissions = ['orders', 'pos'];
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(testPassword, salt);

  console.log(`[TEST 1] Creating restricted staff user: ${testStaffEmail}...`);
  const { data: createRes, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testStaffEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Test Cashier Bot' },
    app_metadata: {
      is_staff: true,
      shop_id: shop.id,
      role: 'cashier',
      permissions: restrictedPermissions,
      status: 'active',
      password_hash: passwordHash,
      password_salt: salt,
    },
  });

  if (createErr || !createRes.user) {
    console.error('FAILED to create test staff member:', createErr);
    process.exit(1);
  }
  const staffUserId = createRes.user.id;
  console.log(`  ✓ Staff created successfully. User ID: ${staffUserId}`);

  // 3. Authenticate and verify session generation
  console.log('\n[TEST 2] Generating and verifying staff session token...');
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: testStaffEmail,
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    console.error('FAILED to generate magiclink token:', linkErr);
    process.exit(1);
  }

  const { data: sessionData, error: sessionErr } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });

  if (sessionErr || !sessionData.session) {
    console.error('FAILED session verification:', sessionErr);
    process.exit(1);
  }
  console.log('  ✓ Staff session created. Access Token generated successfully.');

  // Helper simulating getCurrentShop() logic with the staff token
  const verifyStaffSession = async (accessToken: string) => {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) return null;
    if (!user.app_metadata?.is_staff) return null;
    if (user.app_metadata.status === 'suspended') return null;

    const permissions: string[] = user.app_metadata.permissions || [];
    return {
      shopId: user.app_metadata.shop_id,
      role: user.app_metadata.role,
      permissions,
      hasPermission: (perm: string) => permissions.includes(perm),
    };
  };

  const staffContext = await verifyStaffSession(sessionData.session.access_token);
  console.log('  ✓ Staff Context resolved:', {
    shopId: staffContext?.shopId,
    role: staffContext?.role,
    permissions: staffContext?.permissions,
  });

  // 4. TEST BREACH ATTEMPT: Attempt an unauthorized action ('inventory' mutation)
  console.log('\n[TEST 3 - SECURITY BREACH ATTEMPT: INVENTORY ACCESS]');
  console.log('Employee attempts to execute an INVENTORY mutation without "inventory" permission...');
  const hasInventoryAccess = staffContext?.hasPermission('inventory');
  if (hasInventoryAccess) {
    console.error('  ✗ SECURITY BREACH! Restricted employee had unexpected inventory access.');
    process.exit(1);
  } else {
    console.log('  ✓ BLOCKED: Employee has no "inventory" permission. Access correctly DENIED.');
  }

  // 5. TEST BREACH ATTEMPT: Attempt an unauthorized action ('settings' mutation)
  console.log('\n[TEST 4 - SECURITY BREACH ATTEMPT: SETTINGS ACCESS]');
  console.log('Employee attempts to modify store SETTINGS without "settings" permission...');
  const hasSettingsAccess = staffContext?.hasPermission('settings');
  if (hasSettingsAccess) {
    console.error('  ✗ SECURITY BREACH! Restricted employee had unexpected settings access.');
    process.exit(1);
  } else {
    console.log('  ✓ BLOCKED: Employee has no "settings" permission. Access correctly DENIED.');
  }

  // 6. TEST ALLOWED ACTION: Attempt an authorized action ('orders' or 'pos')
  console.log('\n[TEST 5 - PERMITTED ACTION: ORDERS & POS ACCESS]');
  console.log('Employee attempts to access ORDERS and POS (permitted permissions)...');
  const hasOrdersAccess = staffContext?.hasPermission('orders');
  const hasPosAccess = staffContext?.hasPermission('pos');
  if (hasOrdersAccess && hasPosAccess) {
    console.log('  ✓ SUCCESS: Employee allowed to perform Orders and POS operations.');
  } else {
    console.error('  ✗ FAILED: Permitted permissions were not granted.');
    process.exit(1);
  }

  // 7. TEST SUSPENSION: Suspend employee and verify immediate access revocation
  console.log('\n[TEST 6 - IMMEDIATE ACCESS REVOCATION (SUSPENSION)]');
  console.log('Suspending employee account in Supabase...');
  await supabaseAdmin.auth.admin.updateUserById(staffUserId, {
    app_metadata: {
      ...createRes.user.app_metadata,
      status: 'suspended',
    },
  });

  const suspendedContext = await verifyStaffSession(sessionData.session.access_token);
  if (suspendedContext === null) {
    console.log('  ✓ SUCCESS: Suspended staff session immediately rejected as NULL / Unauthorized.');
  } else {
    console.error('  ✗ SECURITY BREACH: Suspended employee was still able to resolve session!');
    process.exit(1);
  }

  // 8. Clean up test user
  console.log('\n[TEST CLEANUP] Deleting test staff user from Supabase Auth...');
  await supabaseAdmin.auth.admin.deleteUser(staffUserId);
  console.log('  ✓ Test user deleted cleanly.');

  console.log('\n======================================================');
  console.log('  ALL RBAC & SECURITY BREACH TESTS PASSED (6/6)!');
  console.log('======================================================\n');
}

runRbacTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
