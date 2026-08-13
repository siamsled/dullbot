'use server';

import { getCurrentShop, supabaseAdmin, assertShopPermission, StaffRole } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  permissions: string[];
  status: 'active' | 'suspended';
  createdAt: string;
}

/**
 * Lists all staff members assigned to the current shop.
 */
export async function listStaffMembers(shopId: string): Promise<{ success: boolean; staff?: StaffMember[]; error?: string }> {
  try {
    const shop = await assertShopPermission('settings');
    if (shop.id !== shopId) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw new Error(error.message);

    const staffUsers: StaffMember[] = (data.users || [])
      .filter(u => u.app_metadata?.is_staff && u.app_metadata?.shop_id === shopId)
      .map(u => ({
        id: u.id,
        email: u.email || '',
        fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Staff Member',
        role: (u.app_metadata?.role || 'cashier') as StaffRole,
        permissions: Array.isArray(u.app_metadata?.permissions) ? u.app_metadata.permissions : ['orders', 'pos'],
        status: (u.app_metadata?.status || 'active') as 'active' | 'suspended',
        createdAt: u.created_at,
      }));

    return { success: true, staff: staffUsers };
  } catch (err: any) {
    console.error('Error listing staff members:', err);
    return { success: false, error: err.message };
  }
}

import * as crypto from 'crypto';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Creates a new Supabase Auth User for an employee and assigns them to the shop.
 */
export async function createStaffMember(
  shopId: string,
  payload: {
    email: string;
    password: string;
    fullName: string;
    role: StaffRole;
    permissions: string[];
  }
): Promise<{ success: boolean; user?: StaffMember; error?: string }> {
  try {
    const shop = await assertShopPermission('settings');
    if (shop.id !== shopId) throw new Error('Unauthorized');

    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanRole = payload.role;
    const cleanPermissions = payload.permissions.length > 0 ? payload.permissions : ['orders', 'pos'];

    if (!cleanEmail || !payload.password || payload.password.length < 6) {
      return { success: false, error: 'Valid email and password (minimum 6 chars) required.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(payload.password, salt);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName.trim() || cleanEmail.split('@')[0],
      },
      app_metadata: {
        is_staff: true,
        shop_id: shopId,
        role: cleanRole,
        permissions: cleanPermissions,
        status: 'active',
        password_hash: passwordHash,
        password_salt: salt,
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Failed to create staff account.');
    }

    revalidatePath('/dashboard/settings');
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        fullName: payload.fullName.trim() || cleanEmail.split('@')[0],
        role: cleanRole,
        permissions: cleanPermissions,
        status: 'active',
        createdAt: data.user.created_at,
      },
    };
  } catch (err: any) {
    console.error('Error creating staff member:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates permissions, role, or suspension status for an existing staff member.
 */
export async function updateStaffMember(
  staffUserId: string,
  payload: {
    role?: StaffRole;
    permissions?: string[];
    status?: 'active' | 'suspended';
    fullName?: string;
    password?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const shop = await assertShopPermission('settings');

    // Fetch existing user to verify shop_id
    const { data: userRes, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(staffUserId);
    if (fetchErr || !userRes.user) throw new Error('Staff member not found.');

    if (userRes.user.app_metadata?.shop_id !== shop.id) {
      throw new Error('Unauthorized: Staff member does not belong to your shop.');
    }

    let passwordHashUpdates = {};
    if (payload.password && payload.password.length >= 6) {
      const salt = crypto.randomBytes(16).toString('hex');
      passwordHashUpdates = {
        password_hash: hashPassword(payload.password, salt),
        password_salt: salt,
      };
    }

    const nextAppMeta = {
      ...userRes.user.app_metadata,
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.permissions ? { permissions: payload.permissions } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...passwordHashUpdates,
    };

    const updatePayload: any = {
      app_metadata: nextAppMeta,
    };

    if (payload.fullName) {
      updatePayload.user_metadata = {
        ...userRes.user.user_metadata,
        full_name: payload.fullName.trim(),
      };
    }

    if (payload.password && payload.password.length >= 6) {
      updatePayload.password = payload.password;
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(staffUserId, updatePayload);
    if (updateErr) throw new Error(updateErr.message);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating staff member:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Permanently removes a staff member user account.
 */
export async function deleteStaffMember(staffUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const shop = await assertShopPermission('settings');

    const { data: userRes, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(staffUserId);
    if (fetchErr || !userRes.user) throw new Error('Staff member not found.');

    if (userRes.user.app_metadata?.shop_id !== shop.id) {
      throw new Error('Unauthorized: Staff member does not belong to your shop.');
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(staffUserId);
    if (delErr) throw new Error(delErr.message);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting staff member:', err);
    return { success: false, error: err.message };
  }
}
