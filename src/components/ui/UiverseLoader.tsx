'use client';

import React from 'react';

interface UiverseLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UiverseLoader({ className = "", size = 'md' }: UiverseLoaderProps) {
  const scaleClass = size === 'sm' ? 'scale-[0.45]' : size === 'lg' ? 'scale-110' : 'scale-[0.65] sm:scale-[0.8]';

  return (
    <div className={`loader ${scaleClass} ${className}`}>
      <section className="slider" style={{ '--i': 0 } as React.CSSProperties}></section>
      <section className="slider" style={{ '--i': 1 } as React.CSSProperties}></section>
      <section className="slider" style={{ '--i': 2 } as React.CSSProperties}></section>
      <section className="slider" style={{ '--i': 3 } as React.CSSProperties}></section>
      <section className="slider" style={{ '--i': 4 } as React.CSSProperties}></section>
    </div>
  );
}
