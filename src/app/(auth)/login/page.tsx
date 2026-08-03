'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/* ─────────────────────────────────────────────
   Ambient blob data (shape morphing + drift)
   Each blob has independent morph + drift timing
   so they never look synchronised.
───────────────────────────────────────────── */
const BLOBS = [
  {
    // Purple-violet blob — top-left drift
    color: 'radial-gradient(ellipse at center, rgba(147,97,253,0.55) 0%, rgba(167,120,255,0.15) 60%, transparent 80%)',
    size: 520,
    initial: { x: -80, y: -100 },
    morphDuration: '11s',
    driftDuration: '9s',
    driftDelay: '0s',
    morphDelay: '0s',
  },
  {
    // Pink-rose blob — centre-right drift
    color: 'radial-gradient(ellipse at center, rgba(253,130,180,0.50) 0%, rgba(255,150,190,0.12) 60%, transparent 80%)',
    size: 440,
    initial: { x: 220, y: 80 },
    morphDuration: '13s',
    driftDuration: '12s',
    driftDelay: '-3s',
    morphDelay: '-4s',
  },
  {
    // Peach-amber blob — bottom drift
    color: 'radial-gradient(ellipse at center, rgba(255,180,80,0.45) 0%, rgba(255,190,100,0.12) 60%, transparent 80%)',
    size: 380,
    initial: { x: 60, y: 260 },
    morphDuration: '9s',
    driftDuration: '13s',
    driftDelay: '-6s',
    morphDelay: '-2s',
  },
] as const;

/* ─────────────────────────────────────────────
   CSS keyframe animations injected as a <style>
   block — keeps everything self-contained.
───────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes lb-morph-0 {
    0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    25%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
    50%  { border-radius: 50% 60% 30% 70% / 30% 40% 70% 60%; }
    75%  { border-radius: 40% 60% 50% 30% / 60% 40% 50% 70%; }
    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  }
  @keyframes lb-morph-1 {
    0%   { border-radius: 40% 60% 60% 40% / 60% 30% 70% 40%; }
    30%  { border-radius: 60% 40% 30% 60% / 40% 70% 30% 60%; }
    60%  { border-radius: 30% 70% 50% 50% / 50% 40% 60% 50%; }
    100% { border-radius: 40% 60% 60% 40% / 60% 30% 70% 40%; }
  }
  @keyframes lb-morph-2 {
    0%   { border-radius: 50% 50% 40% 60% / 40% 60% 50% 60%; }
    35%  { border-radius: 70% 30% 60% 40% / 50% 60% 40% 50%; }
    65%  { border-radius: 40% 60% 30% 70% / 60% 30% 60% 40%; }
    100% { border-radius: 50% 50% 40% 60% / 40% 60% 50% 60%; }
  }
  @keyframes lb-drift-0 {
    0%   { transform: translate(0px, 0px); }
    25%  { transform: translate(40px, -30px); }
    50%  { transform: translate(-20px, 50px); }
    75%  { transform: translate(30px, 20px); }
    100% { transform: translate(0px, 0px); }
  }
  @keyframes lb-drift-1 {
    0%   { transform: translate(0px, 0px); }
    30%  { transform: translate(-50px, 30px); }
    60%  { transform: translate(30px, -40px); }
    100% { transform: translate(0px, 0px); }
  }
  @keyframes lb-drift-2 {
    0%   { transform: translate(0px, 0px); }
    20%  { transform: translate(30px, -50px); }
    55%  { transform: translate(-40px, 20px); }
    80%  { transform: translate(20px, 40px); }
    100% { transform: translate(0px, 0px); }
  }
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.94) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Spotlight position (cursor follow)
  const spotlightRef = useRef<HTMLDivElement>(null);
  const spotX = useRef(50); // % of viewport
  const spotY = useRef(50);

  // Card tilt
  const cardRef = useRef<HTMLDivElement>(null);

  /* ── Auth logic (unchanged) ── */
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
    await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  /* ── Cursor spotlight ── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (spotlightRef.current) {
      spotlightRef.current.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    }

    // Card 3D tilt
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);   // -1 … +1
      const dy = (e.clientY - cy) / (rect.height / 2);  // -1 … +1
      const rotX = (-dy * 6).toFixed(2); // max 6deg
      const rotY = (dx * 6).toFixed(2);
      cardRef.current.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Full-screen stage ── */}
      <div
        className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f0c1a 0%, #1a0f2e 40%, #0f1a2e 100%)' }}
        onMouseLeave={handleMouseLeave}
      >

        {/* ── Ambient blobs ── */}
        {BLOBS.map((b, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: b.size,
              height: b.size,
              left: b.initial.x,
              top: b.initial.y,
              background: b.color,
              animation: [
                `lb-morph-${i} ${b.morphDuration} ${b.morphDelay} ease-in-out infinite`,
                `lb-drift-${i} ${b.driftDuration} ${b.driftDelay} ease-in-out infinite`,
              ].join(', '),
              filter: 'blur(48px)',
              willChange: 'transform, border-radius',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* ── Cursor spotlight ── */}
        <div
          ref={spotlightRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            transition: 'transform 0.12s linear',
            willChange: 'transform',
            zIndex: 1,
          }}
        />

        {/* ── Card stage (perspective wrapper) ── */}
        <div
          style={{
            perspective: '900px',
            zIndex: 10,
            width: '100%',
            maxWidth: 380,
            padding: '0 16px',
          }}
        >
          <div
            ref={cardRef}
            style={{
              transition: 'transform 0.15s ease-out',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              animation: 'card-enter 0.55s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* ── Frosted glass card ── */}
            <div
              style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 20,
                boxShadow: '0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
                overflow: 'hidden',
                padding: '36px 32px 28px',
              }}
            >
              {/* Logo */}
              <div className="text-center mb-6">
                <Link href="/" className="inline-block">
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 32,
                      fontWeight: 300,
                      letterSpacing: '-0.03em',
                      color: 'rgba(255,255,255,0.95)',
                    }}
                  >
                    dull<span style={{ fontFamily: 'inherit', fontWeight: 400, fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>bot.</span>
                  </span>
                </Link>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Sign in to your account
                </p>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#fca5a5', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form id="login-form" onSubmit={handlePasswordLogin} className="space-y-3">
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.04em' }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(160,124,254,0.6)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                </div>
                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.04em' }}>
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(160,124,254,0.6)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                  marginBottom: 12,
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Sign In button */}
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: 'linear-gradient(135deg, #9361fd 0%, #c084fc 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  boxShadow: '0 4px 20px rgba(147,97,253,0.4)',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(147,97,253,0.6)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(147,97,253,0.4)'; }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              {/* Footer link */}
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                No account?{' '}
                <Link href="/signup" style={{ color: 'rgba(192,132,252,0.9)', fontWeight: 600, textDecoration: 'none' }}>
                  Get started
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
