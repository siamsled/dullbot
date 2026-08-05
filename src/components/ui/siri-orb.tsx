'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type AIState = 'idle' | 'listening' | 'thinking' | 'streaming' | 'done' | 'error';

export function useSimulatedAmplitude(state: AIState) {
  const [amplitude, setAmplitude] = React.useState(0.2);

  React.useEffect(() => {
    let interval: any;
    if (state === 'listening') {
      interval = setInterval(() => {
        setAmplitude(0.3 + Math.random() * 0.5);
      }, 120);
    } else if (state === 'thinking') {
      interval = setInterval(() => {
        setAmplitude(0.4 + Math.sin(Date.now() / 200) * 0.3);
      }, 80);
    } else if (state === 'streaming') {
      interval = setInterval(() => {
        setAmplitude(0.5 + Math.random() * 0.4);
      }, 100);
    } else {
      setAmplitude(0.15);
    }
    return () => clearInterval(interval);
  }, [state]);

  return amplitude;
}

export function useAudioAmplitude() {
  return { amplitude: 0.2, status: 'idle' as const, start: () => {}, stop: () => {} };
}

interface SiriOrbProps {
  amplitude?: number;
  size?: string;
  state?: AIState;
  className?: string;
}

export default function SiriOrb({ amplitude = 0.2, size = '28px', state = 'idle', className = '' }: SiriOrbProps) {
  const scale = useMemo(() => 0.9 + Math.min(amplitude * 0.4, 0.4), [amplitude]);

  return (
    <div
      aria-label={`AI State: ${state}`}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-md opacity-70"
        style={{
          background:
            state === 'error'
              ? 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(220,38,38,0) 70%)'
              : state === 'listening'
              ? 'radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(147,51,234,0.6) 50%, rgba(236,72,153,0) 75%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.8) 0%, rgba(59,130,246,0.6) 50%, rgba(16,185,129,0) 75%)',
        }}
        animate={{ scale: [scale * 0.95, scale * 1.1, scale * 0.95], rotate: [0, 180, 360] }}
        transition={{ duration: state === 'listening' ? 1.5 : 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Main glowing orb */}
      <motion.div
        className="relative w-full h-full rounded-full overflow-hidden shadow-lg border border-white/20"
        style={{
          background:
            'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(168,85,247,0.8) 35%, rgba(59,130,246,0.8) 65%, rgba(16,185,129,0.9) 100%)',
        }}
        animate={{ scale, rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Swirling color highlights */}
        <motion.div
          className="absolute -inset-1 rounded-full mix-blend-overlay opacity-80"
          style={{
            background: 'conic-gradient(from 0deg, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b, #ec4899)',
          }}
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
  );
}
