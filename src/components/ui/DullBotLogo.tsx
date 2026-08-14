'use client';

import React, { useState, useEffect } from 'react';

/**
 * DullBot logo — "The Fracture" (Entity-inspired)
 *
 * Takes the visual idea from the Entity — a mass that shatters into
 * fragments and reassembles itself, glowing at the seams — without
 * borrowing its menace. A solid square glyph periodically breaks into
 * four shards, drifts apart with a faint red-orange glow filling the
 * gaps, hangs there for a beat, then snaps back together with a
 * slight elastic overshoot. Read as intelligence taking something
 * apart and putting it back together with an answer, not a threat.
 *
 * All four shards share one @keyframes rule — each just carries its
 * own CSS custom properties (--dx/--dy/--rot) for which direction it
 * flies, so the shatter stays perfectly synced without four separate
 * animations to keep in sync by hand.
 *
 * The glyph is already square, so collapsing doesn't crop anything —
 * the wordmark just folds away and the fracture becomes the icon,
 * still shattering and reassembling at any size.
 *
 * Click the mark (or the button) to toggle. Drive it programmatically
 * with `collapsed` + `onToggle` as controlled props if you wire this
 * into a real header/breakpoint.
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
    const t1 = setTimeout(() => setInternalCollapsed(true), 1800);
    const t2 = setTimeout(() => {
      setInternalCollapsed(false);
      setAutoPlayed(true);
    }, 3400);
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

  const sizeScales = {
    sm: {
      glyph: 'w-6 h-6',
      glyphCollapsed: 'w-7 h-7',
      text: 'text-lg',
      wordMaxWidth: 'max-w-[100px]',
      gap: 'gap-2',
      offset: 5,
    },
    md: {
      glyph: 'w-8 h-8',
      glyphCollapsed: 'w-9 h-9',
      text: 'text-2xl',
      wordMaxWidth: 'max-w-[140px]',
      gap: 'gap-3',
      offset: 7,
    },
    lg: {
      glyph: 'w-10 h-10',
      glyphCollapsed: 'w-13 h-13',
      text: 'text-4xl',
      wordMaxWidth: 'max-w-[210px]',
      gap: 'gap-4',
      offset: 9,
    },
  };

  const cur = sizeScales[size] || sizeScales.md;

  return (
    <div className={`db-logo-root inline-flex flex-col items-center justify-center select-none ${className}`}>
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

        .db-glyph {
          position: relative;
          flex-shrink: 0;
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .db-glow {
          position: absolute;
          inset: -30%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232, 42, 30, 0.65) 0%, rgba(232, 42, 30, 0) 68%);
          opacity: 0;
          animation: db-glow 3.2s ease-in-out infinite;
          pointer-events: none;
        }

        .db-shard {
          position: absolute;
          inset: 0;
          background: #16161a;
          animation: db-fracture 3.2s cubic-bezier(0.5, 0, 0.15, 1) infinite;
        }
        :global(.dark) .db-shard,
        .dark .db-shard {
          background: #f4f4f5;
        }

        .db-shard.tl { clip-path: polygon(0 0, 100% 0, 50% 50%); --dx: 0px; --dy: -${cur.offset}px; --rot: -10deg; animation-delay: 0s; }
        .db-shard.tr { clip-path: polygon(100% 0, 100% 100%, 50% 50%); --dx: ${cur.offset}px; --dy: 0px; --rot: 10deg; animation-delay: 0.05s; }
        .db-shard.br { clip-path: polygon(100% 100%, 0 100%, 50% 50%); --dx: 0px; --dy: ${cur.offset}px; --rot: -10deg; animation-delay: 0.1s; }
        .db-shard.bl { clip-path: polygon(0 100%, 0 0, 50% 50%); --dx: -${cur.offset}px; --dy: 0px; --rot: 10deg; animation-delay: 0.15s; }

        .db-frame.collapsed .db-shard.tl { --dy: -${Math.round(cur.offset * 1.35)}px; }
        .db-frame.collapsed .db-shard.tr { --dx: ${Math.round(cur.offset * 1.35)}px; }
        .db-frame.collapsed .db-shard.br { --dy: ${Math.round(cur.offset * 1.35)}px; }
        .db-frame.collapsed .db-shard.bl { --dx: -${Math.round(cur.offset * 1.35)}px; }

        @keyframes db-fracture {
          0%, 10%   { transform: translate(0, 0) rotate(0deg); }
          32%       { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }
          55%       { transform: translate(calc(var(--dx) * 1.15), calc(var(--dy) * 1.15)) rotate(calc(var(--rot) * 1.2)); }
          70%       { transform: translate(calc(var(--dx) * 0.3), calc(var(--dy) * 0.3)) rotate(calc(var(--rot) * 0.3)); }
          82%       { transform: translate(calc(var(--dx) * -0.08), calc(var(--dy) * -0.08)) rotate(0deg); }
          100%      { transform: translate(0, 0) rotate(0deg); }
        }

        @keyframes db-glow {
          0%, 10%   { opacity: 0; }
          32%       { opacity: 0.55; }
          55%       { opacity: 0.75; }
          82%       { opacity: 0.1; }
          100%      { opacity: 0; }
        }

        .db-word {
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          color: #16161a;
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          margin-left: 10px;
          opacity: 1;
          transition:
            max-width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            margin-left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            opacity 0.3s ease;
        }
        :global(.dark) .db-word,
        .dark .db-word {
          color: #f4f4f5;
        }
        .db-frame.collapsed .db-word { max-width: 0; margin-left: 0; opacity: 0; }

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
          .db-frame, .db-glyph, .db-glow, .db-shard, .db-word {
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
        <div className={`db-glyph ${collapsed ? cur.glyphCollapsed : cur.glyph}`}>
          <div className="db-glow" />
          <div className="db-shard tl" />
          <div className="db-shard tr" />
          <div className="db-shard br" />
          <div className="db-shard bl" />
        </div>
        <span className={`db-word ${cur.text} ${collapsed ? 'max-w-0' : cur.wordMaxWidth}`}>
          dullbot
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
