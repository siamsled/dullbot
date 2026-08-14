'use client';

import React, { useState, useEffect } from 'react';

/**
 * DullBot logo — "The Eye" v2
 *
 * The 'o' in bot is an expressive pupil with emotional range:
 * a pre-blink twitch before it properly closes, a double-blink,
 * glances left then right, and an occasional surprised widen with
 * the brow lifting and pupil dilating.
 *
 * Three elements (the eyebrow, the eye itself, the pupil) each run
 * their own animation on the same timeline.
 *
 * A tiny fixed highlight sits in the pupil's corner for a living cartoon eye look.
 *
 * Collapsing folds the rest of the word away ("dullb" and "t") and lets
 * the eye grow into the square mark.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      fontSize: '20px',
      dullbWidth: 48,
      tWidth: 14,
      eyeWidth: 18,
      eyeHeight: 22,
      collapsedEyeWidth: 26,
      collapsedEyeHeight: 30,
      borderWidth: '2px',
      browHeight: '2px',
    },
    md: {
      fontSize: '28px',
      dullbWidth: 68,
      tWidth: 18,
      eyeWidth: 25,
      eyeHeight: 30,
      collapsedEyeWidth: 36,
      collapsedEyeHeight: 42,
      borderWidth: '2.5px',
      browHeight: '2.5px',
    },
    lg: {
      fontSize: '38px',
      dullbWidth: 92,
      tWidth: 24,
      eyeWidth: 34,
      eyeHeight: 40,
      collapsedEyeWidth: 50,
      collapsedEyeHeight: 58,
      borderWidth: '3px',
      browHeight: '3px',
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
          transition:
            width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
            height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
            border-radius 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .db-word {
          display: flex;
          align-items: center;
          font-weight: 800;
          letter-spacing: -0.03em;
          font-size: ${sc.fontSize};
          line-height: 1;
          color: #16161a;
        }
        :global(.dark) .db-word,
        .dark .db-word {
          color: #f4f4f5;
        }

        .db-part {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          transition: max-width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
          opacity: 1;
        }
        .db-frame.collapsed .db-part { max-width: 0 !important; opacity: 0; }

        .db-eye-outer {
          position: relative;
          width: ${sc.eyeWidth}px;
          height: ${sc.eyeHeight}px;
          flex-shrink: 0;
          margin: 0 1px;
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
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
          background: #16161a;
          transform-origin: center;
          animation: db-brow 5.6s ease-in-out infinite;
        }
        :global(.dark) .db-brow,
        .dark .db-brow {
          background: #f4f4f5;
        }

        .db-eye-blink {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 78%;
          transform-origin: center;
          animation: db-eyewrap 5.6s ease-in-out infinite;
        }

        .db-eye-white {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: ${sc.borderWidth} solid #16161a;
          background: #ffffff;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        :global(.dark) .db-eye-white,
        .dark .db-eye-white {
          border-color: #f4f4f5;
          background: #18181b;
        }

        .db-eye-pupil {
          position: relative;
          width: 44%;
          height: 44%;
          border-radius: 50%;
          background: #e8266d;
          animation: db-pupil 5.6s ease-in-out infinite;
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
          0%, 12%     { transform: translateY(0) rotate(-6deg); }
          16%         { transform: translateY(2px) rotate(-4deg); }
          20%, 25%    { transform: translateY(0) rotate(-6deg); }
          48%, 51%    { transform: translateY(0) rotate(-6deg); }
          72%         { transform: translateY(-1px) rotate(-6deg); }
          76%         { transform: translateY(-4px) rotate(-2deg); }
          84%         { transform: translateY(1px) rotate(-7deg); }
          90%, 100%   { transform: translateY(0) rotate(-6deg); }
        }

        @keyframes db-eyewrap {
          0%, 12%    { transform: scale(1, 1); }
          16%        { transform: scale(1, 0.85); }
          20%        { transform: scale(1, 1); }
          22%        { transform: scale(1, 0.06); }
          25%        { transform: scale(1, 1); }
          46%        { transform: scale(1, 1); }
          48%        { transform: scale(1, 0.06); }
          51%        { transform: scale(1, 1); }
          72%        { transform: scale(1.05, 1.05); }
          76%        { transform: scale(1.2, 1.2); }
          84%        { transform: scale(0.96, 0.96); }
          90%, 100%  { transform: scale(1, 1); }
        }

        @keyframes db-pupil {
          0%, 28%    { transform: translateX(0) scale(1); }
          34%, 44%   { transform: translateX(-26%) scale(1); }
          51%        { transform: translateX(-26%) scale(1); }
          58%, 66%   { transform: translateX(24%) scale(1); }
          70%        { transform: translateX(0) scale(1); }
          76%        { transform: translateX(0) scale(1.28); }
          84%        { transform: translateX(0) scale(0.95); }
          90%, 100%  { transform: translateX(0) scale(1); }
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
          <span className="db-eye-outer">
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
export { DullBotLogo as DullBotLogoEye };
