import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Admin client using service role key, bypassing RLS
// Use carefully and ONLY in server-side routes/functions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: Supabase credentials missing in environment.');
}

// Next.js evaluates this at build time. We provide dummy values to prevent build crashes
// if the environment variables aren't injected during the Vercel build phase.
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://dummy.supabase.co', 
  supabaseServiceKey || 'dummy'
);

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'support' | 'custom';

export interface ShopWithAuth {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  isOwner: boolean;
  staffRole: StaffRole;
  permissions: string[];
  staffUserId?: string;
  staffEmail?: string;
  staffName?: string;
  [key: string]: any;
}

export function hasShopPermission(shop: ShopWithAuth | null | undefined, permission: string): boolean {
  if (!shop) return false;
  if (shop.isOwner || shop.permissions?.includes('*')) return true;
  return Array.isArray(shop.permissions) && shop.permissions.includes(permission);
}

export async function assertShopPermission(permission: string): Promise<ShopWithAuth> {
  const shop = await getCurrentShop();
  if (!shop) {
    throw new Error('Unauthorized: No active shop session found.');
  }

  if (!hasShopPermission(shop, permission)) {
    throw new Error(`Forbidden: Insufficient permissions for [${permission}].`);
  }

  return shop;
}

export const getCurrentShop = cache(async function getCurrentShop(): Promise<ShopWithAuth | null> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Return null if cookies() is called outside dynamic request context
    return null;
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
  const storageKey = `sb-${projectRef}-auth-token`;
  const token = cookieStore.get(storageKey)?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const session = JSON.parse(decodeURIComponent(token));
    const accessToken = session.access_token;
    if (!accessToken) {
      return null;
    }
    
    // Fast-path: Decode valid JWT session payload directly to avoid redundant 250ms auth network roundtrips
    let user: { id: string; app_metadata: any; user_metadata: any; email?: string } | null = null;
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (jwtPayload.sub && jwtPayload.exp && jwtPayload.exp * 1000 > Date.now()) {
          user = {
            id: jwtPayload.sub,
            app_metadata: jwtPayload.app_metadata || {},
            user_metadata: jwtPayload.user_metadata || {},
            email: jwtPayload.email,
          };
        }
      }
    } catch {
      // Fall through to network verification
    }

    if (!user) {
      const { data: { user: fetchedUser }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
      if (userErr || !fetchedUser) {
        return null;
      }
      user = fetchedUser;
    }

    // 1. Check if user is an Employee/Staff member
    if (user.app_metadata?.is_staff) {
      const staffShopId = user.app_metadata.shop_id;
      const staffStatus = user.app_metadata.status || 'active';
      const staffRole = (user.app_metadata.role || 'cashier') as StaffRole;
      const permissions: string[] = Array.isArray(user.app_metadata.permissions) 
        ? user.app_metadata.permissions 
        : ['orders', 'pos'];

      if (staffStatus === 'suspended' || !staffShopId) {
        return null;
      }

      const { data: shop, error: shopErr } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('id', staffShopId)
        .single();

      if (shopErr || !shop) {
        return null;
      }

      return {
        ...shop,
        isOwner: false,
        staffRole,
        permissions,
        staffUserId: user.id,
        staffEmail: user.email,
        staffName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member',
      };
    }
    
    // 2. Check if user is the Shop Owner
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .single();
      
    if (!shop) {
      // Auto-create isolated shop for this newly registered owner
      const userSlug = `store-${user.id.slice(0, 8)}`;
      const { data: newShop } = await supabaseAdmin
        .from('shops')
        .insert({
          owner_id: user.id,
          name: user.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Store` : 'My Store',
          slug: userSlug,
        })
        .select('*')
        .single();

      if (newShop) {
        return {
          ...newShop,
          isOwner: true,
          staffRole: 'owner',
          permissions: ['*'],
          staffUserId: user.id,
          staffEmail: user.email,
          staffName: user.user_metadata?.full_name || 'Store Owner',
        };
      }

      return null;
    }
    
    return {
      ...shop,
      isOwner: true,
      staffRole: 'owner',
      permissions: ['*'],
      staffUserId: user.id,
      staffEmail: user.email,
      staffName: user.user_metadata?.full_name || 'Store Owner',
    };
  } catch (e) {
    console.error('Error getting current shop:', e);
    return null;
  }
});

