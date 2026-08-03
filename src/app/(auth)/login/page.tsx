'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ─────────────────────────────────────────────
   Windows 11 Light Mode "Bloom" Theme Palette
   Clean, pastel, luminous 3D ribbon/flow colors:
   - Blob 1: Soft Sky Blue / Windows Blue (rgba(0, 120, 212, 0.25))
   - Blob 2: Vibrant Lavender / Soft Purple (rgba(147, 97, 253, 0.28))
   - Blob 3: Pastel Cyan / Aqua (rgba(56, 189, 248, 0.25))
───────────────────────────────────────────── */
const BLOBS = [
  {
    // Windows Sky Blue (Top-Left)
    color: 'radial-gradient(circle, rgba(0, 120, 212, 0.30) 0%, rgba(56, 189, 248, 0.15) 55%, transparent 75%)',
    size: 580,
    initial: { x: -60, y: -80 },
    morphDuration: '12s',
    driftDuration: '11s',
    driftDelay: '0s',
    morphDelay: '0s',
  },
  {
    // Soft Lavender / Purple (Center-Right)
    color: 'radial-gradient(circle, rgba(147, 97, 253, 0.32) 0%, rgba(192, 132, 252, 0.15) 55%, transparent 75%)',
    size: 520,
    initial: { x: 240, y: 60 },
    morphDuration: '14s',
    driftDuration: '13s',
    driftDelay: '-3s',
    morphDelay: '-4s',
  },
  {
    // Fresh Mint Cyan (Bottom-Left)
    color: 'radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(45, 212, 191, 0.12) 55%, transparent 75%)',
    size: 460,
    initial: { x: 20, y: 280 },
    morphDuration: '10s',
    driftDuration: '15s',
    driftDelay: '-6s',
    morphDelay: '-2s',
  },
] as const;

/* Palette colors for cursor particles in Light Mode */
const PARTICLE_COLORS = [
  'rgba(0, 120, 212, 0.45)',  // Sky Blue
  'rgba(147, 97, 253, 0.45)', // Lavender
  'rgba(45, 212, 191, 0.45)', // Mint Cyan
];

/* Keyframe animations for morphing 3D shapes, particles, and card entrance */
const KEYFRAMES = `
  @keyframes lb-morph-0 {
    0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    25%  { border-radius: 35% 65% 60% 40% / 55% 45% 55% 45%; }
    50%  { border-radius: 50% 60% 35% 65% / 35% 55% 65% 45%; }
    75%  { border-radius: 45% 55% 55% 45% / 60% 40% 45% 55%; }
    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  }
  @keyframes lb-morph-1 {
    0%   { border-radius: 45% 55% 65% 35% / 55% 45% 65% 35%; }
    30%  { border-radius: 65% 35% 40% 60% / 45% 65% 35% 55%; }
    60%  { border-radius: 35% 65% 55% 45% / 55% 35% 65% 45%; }
    100% { border-radius: 45% 55% 65% 35% / 55% 45% 65% 35%; }
  }
  @keyframes lb-morph-2 {
    0%   { border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%; }
    35%  { border-radius: 70% 30% 60% 40% / 50% 60% 40% 50%; }
    65%  { border-radius: 40% 60% 35% 65% / 60% 40% 60% 40%; }
    100% { border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%; }
  }
  @keyframes lb-drift-0 {
    0%   { transform: translate(0px, 0px) rotate(0deg); }
    25%  { transform: translate(50px, -40px) rotate(10deg); }
    50%  { transform: translate(-30px, 60px) rotate(-8deg); }
    75%  { transform: translate(40px, 30px) rotate(5deg); }
    100% { transform: translate(0px, 0px) rotate(0deg); }
  }
  @keyframes lb-drift-1 {
    0%   { transform: translate(0px, 0px) rotate(0deg); }
    30%  { transform: translate(-60px, 40px) rotate(-12deg); }
    60%  { transform: translate(40px, -50px) rotate(15deg); }
    100% { transform: translate(0px, 0px) rotate(0deg); }
  }
  @keyframes lb-drift-2 {
    0%   { transform: translate(0px, 0px) rotate(0deg); }
    20%  { transform: translate(40px, -60px) rotate(8deg); }
    55%  { transform: translate(-50px, 30px) rotate(-10deg); }
    80%  { transform: translate(30px, 50px) rotate(6deg); }
    100% { transform: translate(0px, 0px) rotate(0deg); }
  }
  @keyframes particle-fade {
    0% {
      opacity: 1;
      transform: translate(0, 0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(var(--dx), var(--dy)) scale(1.8);
    }
  }
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.93) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  dx: number;
  dy: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Particle trail state & refs
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSpawnTime = useRef<number>(0);
  const nextParticleId = useRef<number>(0);

  // Card 3D tilt ref
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

  /* ── Mousemove: Spawns particle & handles card tilt ── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();

    // Spawn particle trail (throttled to ~60ms)
    if (now - lastSpawnTime.current > 60) {
      lastSpawnTime.current = now;
      const size = Math.floor(Math.random() * 12) + 12; // 12px - 24px
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      
      const dx = (Math.random() - 0.5) * 36;
      const dy = -(Math.random() * 30 + 15);
      
      const newParticle: Particle = {
        id: nextParticleId.current++,
        x: e.clientX,
        y: e.clientY,
        size,
        color,
        dx,
        dy,
      };

      setParticles((prev) => [...prev, newParticle]);

      // DOM Cleanup
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
      }, 1600);
    }

    // Card 3D tilt calculation
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

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Windows 11 Light Mode Desktop Canvas Background ── */}
      <div
        className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #f3f6fc 0%, #eef2f9 50%, #e8edf7 100%)',
        }}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle grid pattern overlay like Windows 11 Light Desktop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(0, 120, 212, 0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />

        {/* ── 1. Windows 11 Light Mode Pastel 3D Blobs ── */}
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

        {/* ── 2. Particle Trail Container ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              style={
                {
                  position: 'absolute',
                  left: p.x - p.size / 2,
                  top: p.y - p.size / 2,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
                  filter: 'blur(2px)',
                  willChange: 'transform, opacity',
                  animation: 'particle-fade 1.6s cubic-bezier(0.1, 0.4, 0.2, 1) forwards',
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* ── 3. Card Stage (Windows 11 Light Acrylic Glass Card) ── */}
        <div
          style={{
            perspective: '1000px',
            zIndex: 10,
            width: '100%',
            maxWidth: 400,
            padding: '0 16px',
          }}
        >
          <div
            ref={cardRef}
            style={{
              transition: 'transform 0.15s cubic-bezier(0.1, 0.8, 0.2, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              animation: 'card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            {/* ── Windows 11 Light Acrylic Glass Card ── */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                borderRadius: 24,
                boxShadow: '0 20px 50px rgba(0, 120, 212, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
                overflow: 'hidden',
                padding: '40px 34px 32px',
              }}
            >
              {/* Logo */}
              <div className="text-center mb-6">
                <Link href="/" className="inline-block">
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 34,
                      fontWeight: 300,
                      letterSpacing: '-0.03em',
                      color: '#0f172a',
                    }}
                  >
                    dull<span style={{ fontFamily: 'sans-serif', fontWeight: 600, fontSize: 22, color: '#0078d4' }}>bot.</span>
                  </span>
                </Link>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 6, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Sign in to your account
                </p>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form id="login-form" onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, letterSpacing: '0.03em' }}>
                    Email Address
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
                      padding: '11px 14px',
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid #cbd5e1',
                      borderRadius: 12,
                      color: '#0f172a',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0078d4';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 120, 212, 0.18)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, letterSpacing: '0.03em' }}>
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
                      padding: '11px 14px',
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid #cbd5e1',
                      borderRadius: 12,
                      color: '#0f172a',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0078d4';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 120, 212, 0.18)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Google OAuth Button */}
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
                  padding: '11px 16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Windows 11 Light Mode Primary Blue Button */}
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #0078d4 0%, #0284c7 50%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(0, 120, 212, 0.35)',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(0, 120, 212, 0.5)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0, 120, 212, 0.35)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              {/* Footer Link */}
              <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
                No account?{' '}
                <Link href="/signup" style={{ color: '#0078d4', fontWeight: 600, textDecoration: 'none' }}>
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
