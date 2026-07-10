import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Parse project ref for cookie naming consistency
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
const storageKey = `sb-${projectRef}-auth-token`;

export const supabaseBrowser = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: storageKey,
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null;
          // Read from cookie first
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`));
          if (cookie) {
            try {
              return decodeURIComponent(cookie.split('=')[1]);
            } catch {
              return null;
            }
          }
          // Fallback to localStorage
          return localStorage.getItem(key);
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return;
          // Save to cookie (max age 7 days)
          const maxAge = 60 * 60 * 24 * 7;
          document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
          localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return;
          // Clear cookie
          document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax; Secure`;
          localStorage.removeItem(key);
        }
      }
    }
  }
);

