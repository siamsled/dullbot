'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ─────────────────────────────────────────────
   Interactive Liquid Canvas — Windows 11 Light Mode Theme
   Fluid simulation with multi-color Windows 11 light palette:
   - Sky Blue:   #0078d4
   - Aqua Cyan:  #38bdf8
   - Lavender:   #9361fd
   - Mint Teal:  #2dd4bf
   - Soft Pink:  #f472b6
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

  // Canvas & Simulation Refs
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

  /* ── Interactive Liquid Canvas Engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Windows 11 Light Palette Colors
    const colors = [
      { r: 0, g: 120, b: 212 },   // #0078d4 - Windows Blue
      { r: 56, g: 189, b: 248 },  // #38bdf8 - Aqua Cyan
      { r: 147, g: 97, b: 253 },  // #9361fd - Lavender
      { r: 45, g: 212, b: 191 },  // #2dd4bf - Mint Teal
      { r: 244, g: 114, b: 182 }, // #f472b6 - Soft Pink
    ];

    class LiquidDrop {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseRadius: number;
      color: { r: number; g: number; b: number };
      phase: number;

      constructor(x: number, y: number, radius: number, color: { r: number; g: number; b: number }) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.baseRadius = radius;
        this.radius = radius;
        this.color = color;
        this.phase = Math.random() * Math.PI * 2;
      }

      update(time: number, mouse: { x: number; y: number; vx: number; vy: number; active: boolean }) {
        // Organic breathing size morphing
        this.phase += 0.02;
        this.radius = this.baseRadius + Math.sin(this.phase) * 25;

        // Mouse stirring & fluid push force
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 380;

          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist);
            // Stronger displacement + fluid swirl vector
            const pushX = (dx / dist) * force * 14;
            const pushY = (dy / dist) * force * 14;
            
            this.vx -= pushX * 0.15 - mouse.vx * force * 0.25;
            this.vy -= pushY * 0.15 - mouse.vy * force * 0.25;
          }
        }

        // Velocity damping for smooth viscous liquid glide
        this.vx *= 0.94;
        this.vy *= 0.94;

        this.x += this.vx;
        this.y += this.vy;

        // Soft bounce off screen bounds
        const margin = 50;
        if (this.x < margin) { this.x = margin; this.vx *= -0.5; }
        if (this.x > width - margin) { this.x = width - margin; this.vx *= -0.5; }
        if (this.y < margin) { this.y = margin; this.vy *= -0.5; }
        if (this.y > height - margin) { this.y = height - margin; this.vy *= -0.5; }
      }
    }

    // Initialize liquid drops spread across canvas
    const drops: LiquidDrop[] = [
      new LiquidDrop(width * 0.2, height * 0.25, 280, colors[0]),
      new LiquidDrop(width * 0.8, height * 0.2, 260, colors[1]),
      new LiquidDrop(width * 0.7, height * 0.75, 300, colors[2]),
      new LiquidDrop(width * 0.25, height * 0.8, 240, colors[3]),
      new LiquidDrop(width * 0.5, height * 0.5, 270, colors[4]),
      new LiquidDrop(width * 0.1, height * 0.55, 220, colors[1]),
      new LiquidDrop(width * 0.9, height * 0.6, 230, colors[0]),
      new LiquidDrop(width * 0.5, height * 0.15, 250, colors[2]),
    ];

    // Shared global mouse tracker
    const mouse = {
      x: -1000,
      y: -1000,
      lastX: -1000,
      lastY: -1000,
      vx: 0,
      vy: 0,
      active: false,
    };

    const handlePointerMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const currentY = e.clientY;

      if (mouse.lastX !== -1000) {
        mouse.vx = currentX - mouse.lastX;
        mouse.vy = currentY - mouse.lastY;
      }
      mouse.x = currentX;
      mouse.y = currentY;
      mouse.lastX = currentX;
      mouse.lastY = currentY;
      mouse.active = true;

      // Spawn dynamic liquid drop directly on fast cursor movement
      const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
      if (speed > 4 && drops.length < 22) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const ripple = new LiquidDrop(currentX, currentY, Math.min(speed * 3 + 50, 150), randomColor);
        ripple.vx = mouse.vx * 0.25;
        ripple.vy = mouse.vy * 0.25;
        drops.push(ripple);

        // Remove drop after 2.5 seconds
        setTimeout(() => {
          const idx = drops.indexOf(ripple);
          if (idx !== -1) drops.splice(idx, 1);
        }, 2500);
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Attach listeners to document & window so mousemove is captured everywhere (even over form card)
    document.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let startTime = Date.now();
    const render = () => {
      const time = (Date.now() - startTime) * 0.001;

      // Clear with Windows 11 Light Slate tint
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);

      // Render liquid drops
      drops.forEach((drop) => {
        drop.update(time, mouse);

        const grad = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.radius);
        grad.addColorStop(0, `rgba(${drop.color.r}, ${drop.color.g}, ${drop.color.b}, 0.55)`);
        grad.addColorStop(0.5, `rgba(${drop.color.r}, ${drop.color.g}, ${drop.color.b}, 0.28)`);
        grad.addColorStop(1, `rgba(${drop.color.r}, ${drop.color.g}, ${drop.color.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Decay mouse velocity
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

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

      {/* ── Fullscreen Stage ── */}
      <div
        className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
        onMouseMove={handleMouseMoveCard}
        onMouseLeave={handleMouseLeaveCard}
      >
        {/* ── 1. Interactive Liquid Simulation Canvas ── */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            filter: 'blur(32px) contrast(115%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ── Subtle Windows Desktop Dot Grid ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(0, 120, 212, 0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* ── 2. Card Stage (Windows 11 Light Acrylic Glass Card) ── */}
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
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(32px) saturate(190%)',
                WebkitBackdropFilter: 'blur(32px) saturate(190%)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                borderRadius: 24,
                boxShadow: '0 24px 60px rgba(0, 120, 212, 0.14), 0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
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
                      background: 'rgba(255, 255, 255, 0.85)',
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
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 120, 212, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = 'rgba(255, 255, 255, 0.85)';
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
                      background: 'rgba(255, 255, 255, 0.85)',
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
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 120, 212, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = 'rgba(255, 255, 255, 0.85)';
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

              {/* Primary Windows Blue Gradient Submit Button */}
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #0078d4 0%, #0284c7 50%, #9361fd 100%)',
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
