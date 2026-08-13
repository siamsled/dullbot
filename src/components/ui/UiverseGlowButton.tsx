'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface UiverseGlowButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'dark' | 'rust' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export default function UiverseGlowButton({
  children,
  variant = 'dark',
  size = 'md',
  icon,
  isLoading,
  className = '',
  disabled,
  ...props
}: UiverseGlowButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-xs gap-2 h-10',
    lg: 'px-6 py-3 text-sm gap-2.5 h-12',
  };

  const variantClasses = {
    dark: 'bg-[#17191c] text-white dark:bg-white dark:text-[#090b0e] shadow-[0_4px_20px_-4px_rgba(23,25,28,0.4)] hover:shadow-[0_6px_24px_-2px_rgba(23,25,28,0.6)] border border-white/10 dark:border-transparent',
    rust: 'bg-[#9a3412] text-white shadow-[0_4px_20px_-4px_rgba(154,52,18,0.5)] hover:shadow-[0_6px_24px_-2px_rgba(154,52,18,0.7)] border border-white/10',
    glass: 'bg-white/80 dark:bg-[#1f242d] backdrop-blur-md text-[#17191c] dark:text-[#f8fafc] border border-dove/20 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white dark:hover:bg-[#282e3a]',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled || isLoading ? 0 : -1 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center font-semibold rounded-full overflow-hidden transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* UIverse Ambient Shimmer Glow Layer */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

      {/* Subtle Inner Highlight Hairline */}
      <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />

      {/* Icon & Label */}
      {icon && <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
