'use client';

import React, { useState, useEffect } from 'react';
import HlsPlayer from './HlsPlayer';
import StreamWaiting from './StreamWaiting';
import { Clock } from 'lucide-react';

const PRE_ROLL_SECONDS = 6 * 60; // Start stream 6 minutes before kickoff

export default function MatchCountdown({ targetDate, stream, matchName }: { targetDate: string, stream?: any, matchName?: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;

      // Start stream 6 minutes early
      if (diff <= PRE_ROLL_SECONDS * 1000) {
        setIsReady(true);
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isReady && stream) {
    return <HlsPlayer src={stream.url} />;
  }

  if (isReady && !stream) {
    return <StreamWaiting matchName={matchName || 'this match'} />;
  }

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06)_0%,transparent_70%)]"></div>
      <div className="relative z-10 flex flex-col items-center">
        <Clock className="w-16 h-16 text-emerald-500 mb-6 opacity-80" />
        <h2 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">Match Starts In</h2>
        <div className="text-6xl md:text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
          {timeLeft || '00:00:00'}
        </div>
        <p className="text-slate-600 text-xs mt-6 font-semibold tracking-widest uppercase">Stream opens 6 min before kickoff</p>
      </div>
    </div>
  );
}
