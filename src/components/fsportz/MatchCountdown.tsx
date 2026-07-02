'use client';

import React, { useState, useEffect, useRef } from 'react';
import HlsPlayer from './HlsPlayer';
import StreamWaiting from './StreamWaiting';

const PRE_ROLL_SECONDS = 6 * 60;

type TimeParts = { h: string; m: string; s: string };

export default function MatchCountdown({
  targetDate,
  stream,
  matchName,
}: {
  targetDate: string;
  stream?: any;
  matchName?: string;
}) {
  const [parts, setParts] = useState<TimeParts | null>(null);
  const [isReady, setIsReady] = useState(false);
  const prevRef = useRef<TimeParts | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const diff = target - Date.now() - PRE_ROLL_SECONDS * 1000;
      if (diff <= 0) { setIsReady(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParts({
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);

  if (isReady && stream) return <HlsPlayer src={stream.url} />;
  if (isReady) return <StreamWaiting matchName={matchName || 'this match'} />;

  const labels = ['Hours', 'Minutes', 'Seconds'];
  const values = parts ? [parts.h, parts.m, parts.s] : ['00', '00', '00'];

  return (
    <div className="fscd-root">
      {/* Layered background */}
      <div className="fscd-bg" />
      <div className="fscd-mesh" />
      <div className="fscd-pitch-lines" />
      <div className="fscd-vignette" />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="fscd-particle" style={{
          left: `${8 + (i * 7.5) % 90}%`,
          animationDelay: `${(i * 0.7) % 5}s`,
          animationDuration: `${4 + (i % 3)}s`,
          width: i % 3 === 0 ? '3px' : '2px',
          height: i % 3 === 0 ? '3px' : '2px',
          opacity: 0.3 + (i % 4) * 0.1,
        }} />
      ))}

      {/* Content */}
      <div className="fscd-content">
        <div className="fscd-eyebrow">
          <span className="fscd-dot" />
          Kickoff Countdown
        </div>

        <div className="fscd-timer">
          {values.map((val, i) => (
            <React.Fragment key={i}>
              <div className="fscd-unit">
                <div className="fscd-digit-wrap">
                  <div className="fscd-digit" key={val + i}>
                    {val}
                  </div>
                </div>
                <div className="fscd-label">{labels[i]}</div>
              </div>
              {i < 2 && <div className="fscd-colon">:</div>}
            </React.Fragment>
          ))}
        </div>

        <p className="fscd-sub">Stream opens 6 min before kickoff</p>
      </div>

      <style>{`
        .fscd-root {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }
        .fscd-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 120% 100% at 50% 110%, #052210 0%, #040f06 60%, #000 100%);
        }
        .fscd-mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 20% 30%, rgba(34,197,94,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 70%, rgba(16,185,129,0.04) 0%, transparent 60%);
          animation: meshFloat 8s ease-in-out infinite alternate;
        }
        @keyframes meshFloat {
          0% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1.05) rotate(1deg); }
        }
        .fscd-pitch-lines {
          position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(34,197,94,0.025) 80px, rgba(34,197,94,0.025) 81px),
            repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(34,197,94,0.025) 80px, rgba(34,197,94,0.025) 81px);
        }
        .fscd-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%);
          pointer-events: none;
        }
        .fscd-particle {
          position: absolute;
          border-radius: 50%;
          background: #22c55e;
          bottom: -10px;
          animation: particleRise linear infinite;
        }
        @keyframes particleRise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-120px) scale(0.3) translateX(20px); opacity: 0; }
        }
        .fscd-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .fscd-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.25em;
          text-transform: uppercase; color: rgba(34,197,94,0.7);
        }
        .fscd-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        .fscd-timer {
          display: flex; align-items: center; gap: clamp(8px,2vw,24px);
        }
        .fscd-unit {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .fscd-digit-wrap {
          position: relative;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 16px;
          padding: clamp(8px,2vw,18px) clamp(12px,3vw,28px);
          backdrop-filter: blur(20px);
          box-shadow: 0 0 40px rgba(34,197,94,0.04), inset 0 1px 0 rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .fscd-digit-wrap::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(34,197,94,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .fscd-digit {
          font-size: clamp(32px, 8vw, 88px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          text-shadow: 0 0 60px rgba(34,197,94,0.3), 0 2px 4px rgba(0,0,0,0.5);
          animation: digitFlip 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes digitFlip {
          0% { transform: rotateX(-30deg) translateY(-10px); opacity: 0.3; }
          100% { transform: rotateX(0deg) translateY(0); opacity: 1; }
        }
        .fscd-label {
          font-size: clamp(8px, 1.2vw, 11px);
          font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(34,197,94,0.4);
        }
        .fscd-colon {
          font-size: clamp(28px, 6vw, 72px);
          font-weight: 900; color: rgba(34,197,94,0.3);
          margin-top: -20px; line-height: 1;
          animation: colonBlink 1s step-end infinite;
        }
        @keyframes colonBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        .fscd-sub {
          font-size: 11px; font-weight: 500; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
