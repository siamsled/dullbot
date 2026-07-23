'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface UiverseToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export default function UiverseToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}: UiverseToggleSwitchProps) {
  const dimensions = size === 'sm' 
    ? { container: 'w-9 h-5', thumb: 'w-3.5 h-3.5', travel: 16 }
    : { container: 'w-11 h-6', thumb: 'w-4.5 h-4.5', travel: 20 };

  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative rounded-full transition-colors duration-300 p-0.5 focus:outline-none focus:ring-2 focus:ring-ink/20 shadow-inner ${dimensions.container} ${
          checked ? 'bg-ink shadow-[0_2px_10px_rgba(23,25,28,0.3)]' : 'bg-dove/30 hover:bg-dove/40'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`block rounded-full bg-white shadow-md rounded-full transform transition-transform ${dimensions.thumb}`}
          animate={{ x: checked ? dimensions.travel : 0 }}
        />
      </button>
      {label && <span className="text-xs font-semibold text-ink">{label}</span>}
    </label>
  );
}
