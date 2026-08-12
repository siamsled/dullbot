'use client';

import React from 'react';

interface UiverseLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UiverseLoader({ className = "", size = 'md' }: UiverseLoaderProps) {
  const scaleClass = size === 'sm' ? 'scale-[0.45]' : size === 'lg' ? 'scale-110' : 'scale-[0.75] sm:scale-[0.85]';

  return (
    <div className={`relative flex items-center justify-center ${scaleClass} ${className}`}>
      <div className="section-path">
        <div className="globe">
          <div className="wrapper">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
