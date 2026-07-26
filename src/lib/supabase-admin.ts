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

export const getCurrentShop = cache(async function getCurrentShop() {
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
    
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !user) {
      return null;
    }
    
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .single();
      
    if (!shop) {
      // Auto-create isolated shop for this logged-in user
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

      if (newShop) return newShop;

      return null;
    }
    
    return shop;
  } catch (e) {
    console.error('Error getting current shop:', e);
    return null;
  }
});

