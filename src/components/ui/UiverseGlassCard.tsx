'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface UiverseGlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'default' | 'warm' | 'cool' | 'dark';
  glowOnHover?: boolean;
  className?: string;
}

export default function UiverseGlassCard({
  children,
  variant = 'default',
  glowOnHover = true,
  className = '',
  ...props
}: UiverseGlassCardProps) {
  const variantClasses = {
    default: 'bg-white/90 backdrop-blur-md border border-dove/15 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-ink',
    warm: 'bg-gradient-to-br from-[#fbe1d1]/80 to-[#fbe1d1]/40 backdrop-blur-md border border-[#5d2a1a]/15 shadow-[0_8px_30px_rgba(93,42,26,0.08)] text-ink',
    cool: 'bg-gradient-to-br from-[#d3e3fc]/80 to-[#d3e3fc]/40 backdrop-blur-md border border-blue-200/50 shadow-[0_8px_30px_rgba(59,130,246,0.08)] text-ink',
    dark: 'bg-[#17191c] backdrop-blur-md border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.3)] text-white',
  };

  return (
    <motion.div
      whileHover={glowOnHover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`relative rounded-cards p-6 transition-all duration-300 group overflow-hidden ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* UIverse Corner Gradient Glow Aura */}
      {glowOnHover && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-rust/10 via-apricot-wash/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
