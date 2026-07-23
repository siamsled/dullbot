'use client';

import React from 'react';

interface UiverseGridBackgroundProps {
  children: React.ReactNode;
  variant?: 'dots' | 'grid';
  interactive?: boolean;
}

export default function UiverseGridBackground({
  children,
  variant = 'grid',
  interactive = true,
}: UiverseGridBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full bg-fog overflow-hidden">
      {/* Background Pattern */}
      <div 
        className={`absolute inset-0 z-0 pointer-events-none opacity-40 h-[calc(100%+24px)] -top-[24px] animate-grid-drift ${
          variant === 'grid' 
            ? 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]' 
            : 'bg-[radial-gradient(#80808033_1px,transparent_1px)] bg-[size:16px_16px]'
        }`}
      />

      {/* Subtle moving ambient gradients */}
      {interactive && (
        <>
          <div className="absolute top-0 -left-4 w-72 h-72 bg-rust rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-blob pointer-events-none" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-sky-wash rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000 pointer-events-none" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-apricot-wash rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000 pointer-events-none" />
        </>
      )}

      {/* Content wrapper */}
      <div className="relative z-10 min-h-screen w-full">
        {children}
      </div>
    </div>
  );
}
