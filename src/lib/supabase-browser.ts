import { createClient } from '@supabase/supabase-js';

// Browser-side client using the anon key (respects RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseBrowser = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy'
);
