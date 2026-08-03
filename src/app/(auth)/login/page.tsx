'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ─────────────────────────────────────────────
   Halftone Dot-Matrix S-Wave Liquid Canvas
   Exact match to reference artwork:
   - Square halftone dot grid proportional to reference image
   - Sweeping S-curve luminous bands (varying dot size & opacity)
   - Interactive liquid warping when cursor moves over the waves
───────────────────────────────────────────── */

const KEYFRAMES = `
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.93) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Canvas & Card Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  /* ── Halftone S-Wave & Liquid Distortion Engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking for dynamic liquid warping
    const mouse = {
      x: -1000,
      y: -1000,
      vx: 0,
      vy: 0,
      lastX: -1000,
      lastY: -1000,
    };

    // Calculate GRID_GAP based on viewport so dot proportion matches reference image (~60-70 dots across width)
    let GRID_GAP = Math.max(10, Math.floor(width / 65));
    let cols = Math.ceil(width / GRID_GAP) + 1;
    let rows = Math.ceil(height / GRID_GAP) + 1;

    // Smooth fluid displacement grid (dx, dy per vertex)
    let gridDispX = new Float32Array(cols * rows);
    let gridDispY = new Float32Array(cols * rows);

    const handlePointerMove = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      if (mouse.lastX !== -1000) {
        mouse.vx = (cx - mouse.lastX) * 0.5;
        mouse.vy = (cy - mouse.lastY) * 0.5;
      }
      mouse.x = cx;
      mouse.y = cy;
      mouse.lastX = cx;
      mouse.lastY = cy;

      // Apply fluid displacement impulse to nearby grid vertices
      const cellX = Math.floor(cx / GRID_GAP);
      const cellY = Math.floor(cy / GRID_GAP);
      const radiusCells = 20; // Soft brush radius in grid units

      for (let r = -radiusCells; r <= radiusCells; r++) {
        for (let c = -radiusCells; c <= radiusCells; c++) {
          const gc = cellX + c;
          const gr = cellY + r;
          if (gc >= 0 && gc < cols && gr >= 0 && gr < rows) {
            const index = gr * cols + gc;
            const distSq = c * c + r * r;
            const maxDistSq = radiusCells * radiusCells;
            if (distSq < maxDistSq) {
              // Smooth Gaussian cosine falloff for silky fluid stretching
              const factor = (Math.cos((Math.sqrt(distSq) / radiusCells) * Math.PI) + 1) * 0.5;
              gridDispX[index] += mouse.vx * factor * 0.45;
              gridDispY[index] += mouse.vy * factor * 0.45;
            }
          }
        }
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      GRID_GAP = Math.max(10, Math.floor(width / 65));
      cols = Math.ceil(width / GRID_GAP) + 1;
      rows = Math.ceil(height / GRID_GAP) + 1;
      gridDispX = new Float32Array(cols * rows);
      gridDispY = new Float32Array(cols * rows);
    };

    document.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      time += 0.006; // Slow organic wave drift speed

      // Pitch black background (matching reference image)
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, 0, width, height);

      // Smooth elastic return for liquid grid displacement
      for (let i = 0; i < gridDispX.length; i++) {
        gridDispX[i] *= 0.94;
        gridDispY[i] *= 0.94;
      }

      // Render Halftone Dot Grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          const dispX = gridDispX[index];
          const dispY = gridDispY[index];

          // Base dot position + liquid cursor displacement
          const origX = c * GRID_GAP;
          const origY = r * GRID_GAP;
          const posX = origX + dispX;
          const posY = origY + dispY;

          // Normalized coordinates for wave equation
          const nx = posX / width;
          const ny = posY / height;

          /* ── Exact Halftone S-Wave Ribbons (from reference image) ──
             Three sweeping luminous ribbons:
             1. Top-right sweeping curve
             2. Large middle S-curve
             3. Bottom-right sweeping curve
          */
          const wave1Y = 0.18 + 0.22 * Math.sin(nx * Math.PI * 1.6 + time * 0.8);
          const wave2Y = 0.52 + 0.32 * Math.sin(nx * Math.PI * 2.2 - time * 0.6);
          const wave3Y = 0.88 + 0.20 * Math.cos(nx * Math.PI * 1.4 + time * 0.4);

          const dist1 = Math.abs(ny - wave1Y);
          const dist2 = Math.abs(ny - wave2Y);
          const dist3 = Math.abs(ny - wave3Y);

          const minDist = Math.min(dist1, dist2, dist3);
          const bandWidth = 0.13; // Thickness of the luminous wave bands

          let intensity = 0;
          if (minDist < bandWidth) {
            intensity = Math.pow(1 - minDist / bandWidth, 1.8);
          }

          // Halftone Dot Size Calculation (dots get large in wave center, tiny at edges)
          const maxDotRadius = GRID_GAP * 0.46; // Dots touch at full intensity
          let dotRadius: number;
          let fillStyle: string;

          if (intensity > 0.02) {
            dotRadius = Math.max(0.8, maxDotRadius * intensity);
            const alpha = Math.min(1, 0.2 + intensity * 0.8);

            // Subtle chromatic tint on ribbon edges (warm bronze / soft blue accents like artwork)
            if (intensity > 0.6) {
              fillStyle = `rgba(255, 255, 255, ${alpha})`; // Crisp white core
            } else {
              const red = Math.floor(235 + intensity * 20);
              const green = Math.floor(220 + intensity * 25);
              const blue = Math.floor(210 + intensity * 45);
              fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            }
          } else {
            // Dark unlit background matrix dots
            dotRadius = 0.7;
            fillStyle = 'rgba(255, 255, 255, 0.07)';
          }

          ctx.fillStyle = fillStyle;
          ctx.beginPath();
          ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Decay mouse velocity
      mouse.vx *= 0.88;
      mouse.vy *= 0.88;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

      {/* ── Stage Container ── */}
      <div
        className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
        onMouseMove={handleMouseMoveCard}
        onMouseLeave={handleMouseLeaveCard}
      >
        {/* ── 1. Halftone S-Wave Canvas ── */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ── 2. Card Stage (Frosted Dark Glass Card) ── */}
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
            {/* ── Glass Card ── */}
            <div
              style={{
                background: 'rgba(10, 12, 20, 0.78)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 24,
                boxShadow: '0 32px 80px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
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
                      color: '#ffffff',
                    }}
                  >
                    dull<span style={{ fontFamily: 'sans-serif', fontWeight: 500, fontSize: 22, color: 'rgba(255, 255, 255, 0.6)' }}>bot.</span>
                  </span>
                </Link>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 6, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Sign in to your account
                </p>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#fca5a5', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              {/* Form */}
              <form id="login-form" onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', marginBottom: 6, letterSpacing: '0.03em' }}>
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
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 12,
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.target.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.07)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', marginBottom: 6, letterSpacing: '0.03em' }}>
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
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 12,
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.target.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.07)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.12)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.12)' }} />
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: 14,
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.08)';
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

              {/* Primary White Button */}
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  color: '#090a0f',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 20px rgba(255, 255, 255, 0.25)',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(255, 255, 255, 0.45)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.25)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              {/* Footer Link */}
              <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 18 }}>
                No account?{' '}
                <Link href="/signup" style={{ color: '#ffffff', fontWeight: 600, textDecoration: 'none' }}>
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
