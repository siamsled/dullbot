'use client';

import React, { useState, useEffect } from 'react';
import HlsPlayer from './HlsPlayer';
import StreamWaiting from './StreamWaiting';

const PRE_ROLL_SECONDS = 6 * 60;

export default function MatchCountdown({ targetDate, stream, matchName }: { targetDate: string, stream?: any, matchName?: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, str: '' });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= PRE_ROLL_SECONDS * 1000) {
        setIsReady(true);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const str = d > 0
        ? `${d}d ${String(h).padStart(2,'0')}h`
        : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      setTimeLeft({ d, h, m, s, str });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isReady && stream) return <HlsPlayer src={stream.url} />;
  if (isReady && !stream) return <StreamWaiting matchName={matchName || 'this match'} />;

  const parts = timeLeft.str.includes(':')
    ? timeLeft.str.split(':')
    : null;

  return (
    <div className="w-full aspect-video rounded-2xl flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0b1a0e 0%, #0f2313 50%, #071209 100%)' }}>
      
      {/* Stadium green glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />
      
      {/* Pitch lines decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-10 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(180deg, transparent, transparent 20px, rgba(34,197,94,0.5) 20px, rgba(34,197,94,0.5) 21px)' }} />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: '#4ade80' }}>
          Kickoff In
        </div>

        {parts ? (
          /* HH:MM:SS display */
          <div className="flex items-center gap-3 md:gap-5">
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className="text-5xl md:text-8xl font-black tabular-nums text-white leading-none"
                    style={{ textShadow: '0 0 40px rgba(34,197,94,0.3)', letterSpacing: '-0.03em' }}>
                    {part}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest mt-2" style={{ color: '#4b6e53' }}>
                    {i === 0 ? 'HRS' : i === 1 ? 'MIN' : 'SEC'}
                  </div>
                </div>
                {i < parts.length - 1 && (
                  <div className="text-4xl md:text-6xl font-black mb-4" style={{ color: '#22c55e' }}>:</div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-5xl md:text-8xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
            {timeLeft.str || '00:00:00'}
          </div>
        )}

        <p className="text-xs font-semibold mt-8" style={{ color: '#2d4a33' }}>
          Stream opens 6 min before kickoff
        </p>
      </div>
    </div>
  );
}
