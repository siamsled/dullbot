'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="min-h-screen bg-fog flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl tracking-tight text-ink font-light">
              dull<span className="font-normal font-sans text-xl text-ash">bot.</span>
            </span>
          </Link>
          <p className="mt-2 text-ash text-sm">Sign in to your workspace</p>
        </div>

        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-8">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-inputs border border-dove/30 bg-white hover:bg-fog text-ink text-sm font-medium transition-colors mb-6 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dove/20" />
            </div>
            <div className="relative flex justify-center text-xs text-ash bg-white px-2">or email</div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dove" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full bg-fog border border-transparent rounded-inputs pl-10 pr-4 py-3 text-sm text-ink focus:border-ink/20 focus:ring-0 focus:outline-none transition-all placeholder:text-dove"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dove" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-fog border border-transparent rounded-inputs pl-10 pr-4 py-3 text-sm text-ink focus:border-ink/20 focus:ring-0 focus:outline-none transition-all placeholder:text-dove"
              />
            </div>

            {error && (
              <p className="text-xs text-rust bg-apricot-wash px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-ink text-white rounded-buttons py-3 text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ash">
            No account?{' '}
            <Link href="/signup" className="text-ink font-medium hover:underline">
              Get started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
