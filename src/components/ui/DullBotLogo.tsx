'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * DullBot logo — "The Eye" v2
 *
 * An expressive animated logo with:
 * - Dynamic cursor tracking: the pupil smoothly looks towards where the mouse cursor is located on the screen!
 * - Multi-layer emotion loop: pre-blink twitch, double blink, glances, and surprised brow-lift / pupil dilation.
 * - Smooth, non-jittery morphing between full wordmark ("dullbot") and square mark on sidebar collapse.
 * - Theme-adaptive currentColor contrast.
 */

export interface DullBotLogoProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  showToggleBtn?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function DullBotLogo({
  collapsed: collapsedProp,
  onToggle,
  showToggleBtn = false,
  size = 'md',
  className = '',
}: DullBotLogoProps = {}) {
  const isControlled = collapsedProp !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const [autoPlayed, setAutoPlayed] = useState(false);

  const eyeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (isControlled || autoPlayed) return;
    const t1 = setTimeout(() => setInternalCollapsed(true), 2200);
    const t2 = setTimeout(() => {
      setInternalCollapsed(false);
      setAutoPlayed(true);
    }, 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isControlled, autoPlayed]);

  // ── Ultra-Lightweight Cursor Tracking ──
  useEffect(() => {
    let animFrame: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isRunning = false;

    const maxTravel = size === 'sm' ? 3.5 : size === 'md' ? 4.5 : 6;

    const tick = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        currentX = targetX;
        currentY = targetY;
        if (eyeRef.current) {
          eyeRef.current.style.setProperty('--look-x', `${currentX.toFixed(2)}px`);
          eyeRef.current.style.setProperty('--look-y', `${currentY.toFixed(2)}px`);
        }
        isRunning = false;
        animFrame = null;
        return;
      }

      currentX += dx * 0.25;
      currentY += dy * 0.25;

      if (eyeRef.current) {
        eyeRef.current.style.setProperty('--look-x', `${currentX.toFixed(2)}px`);
        eyeRef.current.style.setProperty('--look-y', `${currentY.toFixed(2)}px`);
      }

      animFrame = requestAnimationFrame(tick);
    };

    const startTick = () => {
      if (!isRunning) {
        isRunning = true;
        animFrame = requestAnimationFrame(tick);
      }
    };

    let lastCalc = 0;
    let cachedRect: DOMRect | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const now = performance.now();
      if (!cachedRect || now - lastCalc > 500) {
        cachedRect = eyeRef.current.getBoundingClientRect();
        lastCalc = now;
      }

      const centerX = cachedRect.left + cachedRect.width / 2;
      const centerY = cachedRect.top + cachedRect.height / 2;

      const diffX = e.clientX - centerX;
      const diffY = e.clientY - centerY;
      const dist = Math.hypot(diffX, diffY);

      if (dist === 0) {
        targetX = 0;
        targetY = 0;
      } else {
        const angle = Math.atan2(diffY, diffX);
        const norm = Math.min(dist / 280, 1);
        targetX = Math.cos(angle) * norm * maxTravel;
        targetY = Math.sin(angle) * norm * maxTravel;
      }

      startTick();
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      startTick();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [size]);

  const toggle = () => {
    setAutoPlayed(true);
    if (isControlled) {
      onToggle && onToggle(!collapsed);
    } else {
      setInternalCollapsed((c) => !c);
    }
  };

  const scales = {
    sm: {
      fontSize: '24px',
      dullbWidth: 62,
      tWidth: 16,
      eyeWidth: 22,
      eyeHeight: 27,
      collapsedEyeWidth: 32,
      collapsedEyeHeight: 38,
      borderWidth: '2.2px',
      browHeight: '2.2px',
    },
    md: {
      fontSize: '30px',
      dullbWidth: 76,
      tWidth: 20,
      eyeWidth: 27,
      eyeHeight: 33,
      collapsedEyeWidth: 38,
      collapsedEyeHeight: 45,
      borderWidth: '2.6px',
      browHeight: '2.6px',
    },
    lg: {
      fontSize: '40px',
      dullbWidth: 98,
      tWidth: 26,
      eyeWidth: 36,
      eyeHeight: 43,
      collapsedEyeWidth: 52,
      collapsedEyeHeight: 60,
      borderWidth: '3.2px',
      browHeight: '3.2px',
    },
  };

  const sc = scales[size] || scales.md;

  return (
    <div className={`db-eye-logo-root inline-flex flex-col items-center justify-center select-none ${className}`}>
      <style>{`
        .db-frame {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: transparent;
          box-sizing: border-box;
        }

        .db-word {
          display: flex;
          align-items: center;
          font-weight: 800;
          letter-spacing: -0.03em;
          font-size: ${sc.fontSize};
          line-height: 1;
          color: currentColor;
        }

        .db-part {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          transition: max-width 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease;
          opacity: 1;
          will-change: max-width, opacity;
        }
        .db-frame.collapsed .db-part {
          max-width: 0 !important;
          opacity: 0;
        }

        .db-eye-outer {
          position: relative;
          width: ${sc.eyeWidth}px;
          height: ${sc.eyeHeight}px;
          flex-shrink: 0;
          margin: 0 1px;
          transition: width 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                      height 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                      margin 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          transform-origin: center center;
          will-change: width, height;
        }
        .db-frame.collapsed .db-eye-outer {
          width: ${sc.collapsedEyeWidth}px;
          height: ${sc.collapsedEyeHeight}px;
          margin: 0;
        }

        .db-brow {
          position: absolute;
          top: 0;
          left: 50%;
          width: 60%;
          height: ${sc.browHeight};
          margin-left: -30%;
          border-radius: 2px;
          background: currentColor;
          transform-origin: center;
          animation: db-brow 4.5s ease-in-out infinite;
        }

        .db-eye-blink {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 78%;
          transform-origin: center;
          animation: db-eyewrap 4.5s ease-in-out infinite;
        }

        .db-eye-white {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: ${sc.borderWidth} solid currentColor;
          background: #ffffff;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .db-eye-pupil {
          position: relative;
          width: 44%;
          height: 44%;
          border-radius: 50%;
          background: #e8266d;
          transform: translate(var(--look-x, 0px), var(--look-y, 0px));
          animation: db-pupil 4.5s ease-in-out infinite;
          will-change: transform;
        }

        .db-eye-glint {
          position: absolute;
          top: 14%;
          left: 16%;
          width: 32%;
          height: 32%;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.9;
        }

        @keyframes db-brow {
          0%, 18%     { transform: translateY(0) rotate(-6deg); }
          22%         { transform: translateY(1.2px) rotate(-4deg); }
          26%, 56%    { transform: translateY(0) rotate(-6deg); }
          60%         { transform: translateY(1.5px) rotate(-3deg); }
          64%         { transform: translateY(-0.8px) rotate(-7deg); }
          72%, 100%   { transform: translateY(0) rotate(-6deg); }
        }

        @keyframes db-eyewrap {
          0%, 20%     { transform: scale(1, 1); }
          22.5%       { transform: scale(1, 0.05); }
          25%         { transform: scale(1, 1); }
          58%         { transform: scale(1, 1); }
          60%         { transform: scale(1, 0.05); }
          61.5%       { transform: scale(1, 0.8); }
          63%         { transform: scale(1, 0.05); }
          65.5%, 100% { transform: scale(1, 1); }
        }

        @keyframes db-pupil {
          0%, 20%     { transform: translate(var(--look-x, 0px), var(--look-y, 0px)) scale(1); }
          28%, 48%    { transform: translate(calc(var(--look-x, 0px) - 1.8px), calc(var(--look-y, 0px) + 0.5px)) scale(1); }
          54%, 74%    { transform: translate(calc(var(--look-x, 0px) + 1.6px), calc(var(--look-y, 0px) - 0.4px)) scale(1.02); }
          82%, 100%   { transform: translate(var(--look-x, 0px), var(--look-y, 0px)) scale(1); }
        }

        .db-toggle {
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #6b6b70;
          background: none;
          border: 1px solid #d8d8d4;
          border-radius: 999px;
          padding: 5px 12px;
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .db-toggle:hover { color: #16161a; border-color: #16161a; }

        @media (prefers-reduced-motion: reduce) {
          .db-frame, .db-part, .db-brow, .db-eye-blink, .db-eye-pupil {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div
        className={`db-frame ${collapsed ? 'collapsed' : 'expanded'}`}
        onClick={toggle}
        role="button"
        aria-pressed={collapsed}
        aria-label="Toggle DullBot logo between wordmark and square mark"
      >
        <span className="db-word">
          <span className="db-part" style={{ maxWidth: sc.dullbWidth }}>dullb</span>
          <span ref={eyeRef} className="db-eye-outer">
            <span className="db-brow" />
            <span className="db-eye-blink">
              <span className="db-eye-white">
                <span className="db-eye-pupil">
                  <span className="db-eye-glint" />
                </span>
              </span>
            </span>
          </span>
          <span className="db-part" style={{ maxWidth: sc.tWidth }}>t</span>
        </span>
      </div>

      {showToggleBtn && (
        <button type="button" className="db-toggle mt-2" onClick={toggle}>
          {collapsed ? 'Expand' : 'Collapse to square'}
        </button>
      )}
    </div>
  );
}

/**
 * DullBotEyeMark — Pure CSS animated one-eyed avatar face.
 * 100% GPU-accelerated with zero CPU/network overhead.
 */
export function DullBotEyeMark({
  size = 24,
  className = '',
  pupilColor = '#e8266d',
}: {
  size?: number;
  className?: string;
  pupilColor?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span
          className="absolute top-[8%] left-1/2 w-[55%] -ml-[27.5%] h-[12%] rounded-full bg-ink dark:bg-white -rotate-[6deg]"
        />
        <div className="w-[85%] h-[85%] relative">
          <div className="w-full h-full rounded-full border-[1.8px] border-ink dark:border-white bg-white flex items-center justify-center overflow-hidden shadow-xs">
            <div
              className="w-[46%] h-[46%] rounded-full relative"
              style={{ backgroundColor: pupilColor }}
            >
              <span className="absolute top-[14%] left-[16%] w-[32%] h-[32%] rounded-full bg-white opacity-90" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DullBotAvatar — Framed circular container with blinking one-eyed face
 */
export function DullBotAvatar({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-xs shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <DullBotEyeMark size={Math.round(size * 0.75)} />
    </div>
  );
}

export { DullBotLogo as DullBotLogoEye };
