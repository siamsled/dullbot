'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export async function authenticateStaff(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    // 1. Fetch user by email via Admin API
    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);

    const user = (userList.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Invalid employee email or password.' };
    }

    // 2. Validate staff metadata
    if (!user.app_metadata?.is_staff) {
      return { success: false, error: 'This portal is for employees only. Store owners must sign in via Google.' };
    }

    if (user.app_metadata?.status === 'suspended') {
      return { success: false, error: 'Your staff account has been suspended by the store owner.' };
    }

    // 3. Verify password hash
    const storedHash = user.app_metadata?.password_hash;
    const storedSalt = user.app_metadata?.password_salt;

    if (!storedHash || !storedSalt) {
      return { success: false, error: 'Account credentials need reset. Ask store owner to update password.' };
    }

    const computedHash = hashPassword(password, storedSalt);
    if (computedHash !== storedHash) {
      return { success: false, error: 'Invalid employee email or password.' };
    }

    // 4. Generate official Supabase session via magiclink token exchange
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
    });

    if (linkErr || !linkData.properties?.hashed_token) {
      throw new Error(linkErr?.message || 'Failed to generate session token.');
    }

    const sbAnon = createClient(supabaseUrl, anonKey);
    const { data: sessionData, error: sessionErr } = await sbAnon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (sessionErr || !sessionData.session) {
      throw new Error(sessionErr?.message || 'Failed to initialize session.');
    }

    // 5. Set session cookie on HTTP response
    const cookieStore = await cookies();
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
    const storageKey = `sb-${projectRef}-auth-token`;
    const maxAge = 60 * 60 * 24 * 7;
    const isSecure = process.env.NODE_ENV === 'production';

    const slimSession = { ...sessionData.session };
    delete (slimSession as any).provider_token;
    delete (slimSession as any).provider_refresh_token;

    cookieStore.set(storageKey, JSON.stringify(slimSession), {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: isSecure,
      httpOnly: false, // matches client expectations
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error during staff authentication:', err);
    return { success: false, error: err.message || 'Authentication failed.' };
  }
}
