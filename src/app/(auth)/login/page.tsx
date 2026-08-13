'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { GravityStarsBackground } from '@/components/ui/gravity-stars-bg';

export const dynamic = 'force-dynamic';

const KEYFRAMES = `
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.93) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isSwitched = searchParams.get('switched') === 'true' || searchParams.get('prompt') === 'select_account';

  // 3D Card Tilt Ref
  const cardRef = useRef<HTMLDivElement>(null);

  /* ── Auth logic ── */
  useEffect(() => {
    const handleSession = (session: any) => {
      if (session) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
        const key = `sb-${projectRef}-auth-token`;
        const maxAge = 60 * 60 * 24 * 7;
        const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
        const slimSession = { ...session };
        delete slimSession.provider_token;
        delete slimSession.provider_refresh_token;
        document.cookie = `${key}=${encodeURIComponent(JSON.stringify(slimSession))}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
        window.location.href = '/dashboard';
      }
    };

    supabaseBrowser.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => subscription.unsubscribe();
  }, [router]);

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  /* ── 3D Card Tilt ── */
  const handleMouseMoveCard = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotX = (-dy * 7).toFixed(2);
      const rotY = (dx * 7).toFixed(2);
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
  }, []);

  const handleMouseLeaveCard = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  }, []);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── GravityStarsBackground ── */}
      <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-black z-0">
        <GravityStarsBackground
          starsCount={100}
          starsSize={2.5}
          starsOpacity={0.8}
          glowIntensity={20}
          movementSpeed={0.35}
          mouseInfluence={120}
          gravityStrength={80}
          className="absolute inset-0 size-full text-white"
        />
        {/* ── Card Stage (Fixed Inset Center) ── */}
        <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 select-none pointer-events-none z-10">
          <div
            className="w-full max-w-[460px] flex items-center justify-center pointer-events-auto"
            style={{
              perspective: '1000px',
            }}
          >
          <div
            ref={cardRef}
            className="w-full"
            style={{
              transition: 'transform 0.15s cubic-bezier(0.1, 0.8, 0.2, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              animation: 'card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            {/* ── Glass Card ── */}
            <div
              style={{
                background: 'rgba(10, 12, 20, 0.82)',
                backdropFilter: 'blur(36px) saturate(180%)',
                WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 24,
                boxShadow: '0 32px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                overflow: 'hidden',
                padding: '44px 40px 36px',
              }}
            >
              {/* Logo & Header */}
              <div className="text-center mb-9">
                <Link href="/" className="inline-block">
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 38,
                      fontWeight: 300,
                      letterSpacing: '-0.03em',
                      color: '#ffffff',
                    }}
                  >
                    dull<span style={{ fontFamily: 'sans-serif', fontWeight: 500, fontSize: 24, color: 'rgba(255, 255, 255, 0.6)' }}>bot.</span>
                  </span>
                </Link>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, marginTop: 6, fontWeight: 500, letterSpacing: '0.04em' }}>
                  Sign in or create an account with Google
                </p>
              </div>

              {/* Switched / Signed Out Notice */}
              {isSwitched && (
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#93c5fd', textAlign: 'center' }}>
                  You have signed out. Select a different Google account to continue.
                </div>
              )}

              {/* Error message */}
              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              {/* Primary Google Auth Button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: 14,
                  color: '#090a0f',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 24px rgba(255, 255, 255, 0.25)',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(255, 255, 255, 0.45)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(255, 255, 255, 0.25)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Connecting to Google…' : 'Continue with Google'}
              </button>

              {/* Staff Portal Link */}
              <div className="mt-5 text-center">
                <Link
                  href="/staff-login"
                  className="text-xs text-white/60 hover:text-white transition-colors inline-flex items-center gap-1 font-medium"
                >
                  Store employee? <span className="underline text-white">Log in with Employee ID →</span>
                </Link>
              </div>

              {/* Secure Notice */}
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginTop: 16, lineHeight: 1.5 }}>
                By continuing, you agree to our Terms of Service & Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
