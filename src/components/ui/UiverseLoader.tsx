'use client';

import React from 'react';

interface UiverseLoaderProps {
  className?: string;
}

export default function UiverseLoader({ className = "w-6 h-6" }: UiverseLoaderProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg className="animate-spin w-full h-full text-dove/30" viewBox="0 0 50 50">
        <circle className="stroke-current" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
        <circle 
          className="stroke-rust stroke-[4px]" 
          cx="25" cy="25" r="20" fill="none" 
          strokeDasharray="90 150" 
          strokeDashoffset="0" 
          strokeLinecap="round"
        ></circle>
      </svg>
      {/* Subtle center pulse */}
      <div className="absolute inset-0 m-auto w-1/3 h-1/3 bg-rust/40 rounded-full blur-[4px] animate-pulse"></div>
    </div>
  );
}
