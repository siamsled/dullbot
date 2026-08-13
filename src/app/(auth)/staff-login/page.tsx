'use client';

import { useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { GravityStarsBackground } from '@/components/ui/gravity-stars-bg';
import { Shield, KeyRound, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

import { authenticateStaff } from './actions';

export const dynamic = 'force-dynamic';

const KEYFRAMES = `
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.93) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

function StaffLoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your employee email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authenticateStaff(email.trim(), password.trim());
      if (!res.success) {
        throw new Error(res.error || 'Invalid credentials.');
      }

      // Route staff directly to orders
      window.location.href = '/dashboard/orders';
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
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
      const rotX = (-dy * 6).toFixed(2);
      const rotY = (dx * 6).toFixed(2);
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

      {/* Background */}
      <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-black z-0">
        <GravityStarsBackground
          starsCount={80}
          starsSize={2.2}
          starsOpacity={0.75}
          glowIntensity={18}
          movementSpeed={0.3}
          mouseInfluence={100}
          gravityStrength={70}
          className="absolute inset-0 size-full text-white"
        />

        {/* Card Stage */}
        <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 select-none pointer-events-none z-10">
          <div
            className="w-full max-w-[440px] flex items-center justify-center pointer-events-auto"
            style={{ perspective: '1000px' }}
          >
            <div
              ref={cardRef}
              onMouseMove={handleMouseMoveCard}
              onMouseLeave={handleMouseLeaveCard}
              className="w-full"
              style={{
                transition: 'transform 0.15s cubic-bezier(0.1, 0.8, 0.2, 1)',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                animation: 'card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}
            >
              {/* Glass Container */}
              <div
                style={{
                  background: 'rgba(12, 14, 22, 0.85)',
                  backdropFilter: 'blur(36px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 24,
                  boxShadow: '0 32px 80px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  overflow: 'hidden',
                  padding: '40px 36px 32px',
                }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-white mb-4 border border-white/15 shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h1
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 28,
                      fontWeight: 300,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Employee Portal
                  </h1>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, marginTop: 4 }}>
                    Sign in with your staff credentials
                  </p>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="mb-5 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5 px-0.5">
                      Employee Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="staff@yourstore.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:bg-white/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5 px-0.5">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:bg-white/10 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In to POS & Orders
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Owner login */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-white/50 hover:text-white transition-colors"
                  >
                    Store owner? <span className="underline text-white/80 font-medium">Continue with Google</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginContent />
    </Suspense>
  );
}
