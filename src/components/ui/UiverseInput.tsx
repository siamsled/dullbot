'use client';

import React from 'react';

interface UiverseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export default function UiverseInput({ label, icon, className = "", ...props }: UiverseInputProps) {
  return (
    <div className="relative group w-full">
      {label && (
        <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-ash group-focus-within:text-rust transition-colors z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-white/60 backdrop-blur-md border border-dove/20 text-ink text-sm rounded-inputs placeholder:text-ash/60 focus:outline-none focus:border-rust/40 focus:ring-4 focus:ring-apricot-wash/50 transition-all duration-300 ${
            icon ? "pl-9" : "pl-3"
          } pr-3 py-2.5 shadow-sm ${className}`}
        />
        {/* Subtle glow effect behind the input on focus */}
        <div className="absolute inset-0 -z-10 rounded-inputs bg-rust/5 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500"></div>
      </div>
    </div>
  );
}
