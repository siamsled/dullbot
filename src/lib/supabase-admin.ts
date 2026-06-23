import { createClient } from '@supabase/supabase-js';

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
