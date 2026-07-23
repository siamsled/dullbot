'use client';

import React from 'react';

interface UiversePulseBadgeProps {
  label: string;
  status?: 'active' | 'warning' | 'neutral' | 'rust';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export default function UiversePulseBadge({
  label,
  status = 'active',
  size = 'md',
  pulse = true,
}: UiversePulseBadgeProps) {
  const statusColors = {
    active: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
    },
    neutral: {
      bg: 'bg-fog text-graphite border-dove/20',
      dot: 'bg-dove',
      ping: 'bg-dove/60',
    },
    rust: {
      bg: 'bg-apricot-wash/60 text-rust border-rust/20',
      dot: 'bg-rust',
      ping: 'bg-rust/60',
    },
  };

  const style = statusColors[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium shadow-sm transition-all duration-200 ${style.bg} ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
      <span className="relative flex h-2 w-2 items-center justify-center">
        {pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${style.ping}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${style.dot}`} />
      </span>
      <span>{label}</span>
    </span>
  );
}
