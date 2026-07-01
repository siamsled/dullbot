'use client';

import React, { useState, useEffect } from 'react';
import HlsPlayer from './HlsPlayer';
import { Clock } from 'lucide-react';

export default function MatchCountdown({ targetDate, stream }: { targetDate: string, stream?: any }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
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
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 shadow-2xl">
        <div className="text-slate-500 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Match is starting, but streams aren't ready yet.</p>
          <p className="text-sm mt-2">Refresh the page in a few minutes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center">
        <Clock className="w-16 h-16 text-emerald-500 mb-6 opacity-80" />
        <h2 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">Match Starts In</h2>
        <div className="text-6xl md:text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
          {timeLeft || '00:00:00'}
        </div>
      </div>
    </div>
  );
}
