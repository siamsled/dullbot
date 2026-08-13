'use client';

import React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ThemeToggle({ size = 'md', className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  // Width scaling (reduced by ~30% for ultra-sleek appearance)
  const widthPx = size === 'sm' ? 30 : size === 'lg' ? 48 : 38;

  return (
    <button
      type="button"
      aria-pressed={isDark}
      onClick={toggleTheme}
      className={`theme-astro-toggle ${className}`}
      style={
        {
          '--width': `${widthPx}px`,
          '--dark': isDark ? 1 : 0,
        } as React.CSSProperties
      }
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span className="toggle__content">
        {/* Day Backdrop (Clouds) */}
        <span className="toggle__backdrop">
          <svg
            aria-hidden="true"
            viewBox="0 0 258 100"
            className="clouds"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M102.5 56.5C102.5 45.7305 111.23 37 122 37C124.088 37 126.096 37.3297 127.977 37.9398C133.003 27.5627 143.666 20.5 156 20.5C172.569 20.5 186 33.9315 186 50.5C186 51.5284 185.948 52.5446 185.848 53.5463C188.756 52.5492 191.815 52 195 52C208.255 52 219 62.7452 219 76C219 89.2548 208.255 100 195 100H122C111.23 100 102.5 91.2695 102.5 80.5C102.5 76.8837 103.488 73.4984 105.207 70.5898C103.494 66.5297 102.5 62.1158 102.5 57.5V56.5Z"
              fill="rgba(255,255,255,0.4)"
            />
            <path
              d="M32.5 66.5C32.5 55.7305 41.2305 47 52 47C54.088 47 56.0964 47.3297 57.9771 47.9398C63.0031 37.5627 73.6662 30.5 86 30.5C102.569 30.5 116 43.9315 116 60.5C116 61.5284 115.948 62.5446 115.848 63.5463C118.756 62.5492 121.815 62 125 62C138.255 62 149 72.7452 149 86C149 99.2548 138.255 110 125 110H52C41.2305 110 32.5 101.27 32.5 90.5C32.5 86.8837 33.4878 83.4984 35.2072 80.5898C33.4939 76.5297 32.5 72.1158 32.5 67.5V66.5Z"
              fill="rgba(255,255,255,0.7)"
            />
          </svg>
        </span>

        {/* Night Backdrop (Stars) */}
        <span className="toggle__backdrop">
          <svg
            aria-hidden="true"
            viewBox="0 0 258 100"
            className="stars"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g><path d="M45 20L47 25L52 27L47 29L45 34L43 29L38 27L43 25L45 20Z" fill="#ffffff" /></g>
            <g><path d="M90 15L91 18L94 19L91 20L90 23L89 20L86 19L89 18L90 15Z" fill="#ffffff" opacity="0.8" /></g>
            <g><path d="M140 25L142 30L147 32L142 34L140 39L138 34L133 32L138 30L140 25Z" fill="#ffffff" /></g>
            <g><path d="M70 50L71 53L74 54L71 55L70 58L69 55L66 54L69 53L70 50Z" fill="#ffffff" opacity="0.6" /></g>
            <g><path d="M180 20L181 23L184 24L181 25L180 28L179 25L176 24L179 23L180 20Z" fill="#ffffff" opacity="0.9" /></g>
            <g><path d="M110 55L111 58L114 59L111 60L110 63L109 60L106 59L109 58L110 55Z" fill="#ffffff" opacity="0.7" /></g>
          </svg>
        </span>

        {/* Sliding Indicator (Sun & Moon) */}
        <span className="toggle__indicator-wrapper">
          <span className="toggle__indicator">
            <span className="toggle__star">
              {/* Sun Body */}
              <span className="sun" />
              {/* Moon Body & Craters */}
              <span className="moon">
                <span className="moon__crater" />
                <span className="moon__crater" />
                <span className="moon__crater" />
              </span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
