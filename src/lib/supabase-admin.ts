import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

export async function getCurrentShop() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Return seed shop fallback if cookies() is called outside dynamic request context
    const { data: seedShop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('slug', 'dull-store')
      .single();
    return seedShop;
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
  const storageKey = `sb-${projectRef}-auth-token`;
  const token = cookieStore.get(storageKey)?.value;
  
  if (!token) {
    // Fallback to dull-store for seed/local testing if no session cookie exists
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('slug', 'dull-store')
      .single();
    return shop;
  }
  
  try {
    const session = JSON.parse(decodeURIComponent(token));
    const accessToken = session.access_token;
    if (!accessToken) {
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('slug', 'dull-store')
        .single();
      return shop;
    }
    
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !user) {
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('slug', 'dull-store')
        .single();
      return shop;
    }
    
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .single();
      
    if (!shop) {
      const { data: seedShop } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('slug', 'dull-store')
        .single();
      return seedShop;
    }
    
    return shop;
  } catch (e) {
    console.error('Error getting current shop:', e);
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('slug', 'dull-store')
      .single();
    return shop;
  }
}

