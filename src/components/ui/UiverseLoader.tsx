'use client';

import React from 'react';

interface UiverseLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UiverseLoader({ className = "", size = 'md' }: UiverseLoaderProps) {
  const scaleClass = size === 'sm' ? 'scale-[0.35]' : size === 'lg' ? 'scale-100' : 'scale-[0.55] sm:scale-[0.65]';

  return (
    <div className={`relative flex items-center justify-center ${scaleClass} ${className}`}>
      <div className="loader">
        <div className="box1"></div>
        <div className="box2"></div>
        <div className="box3"></div>
      </div>
    </div>
  );
}
