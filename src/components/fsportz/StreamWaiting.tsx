'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Radio } from 'lucide-react';

export default function StreamWaiting({ matchName }: { matchName: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full aspect-video rounded-2xl flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f1a12 0%, #162214 60%, #1a2e1e 100%)' }}>
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-green-500/10 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute w-48 h-48 rounded-full border border-green-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Radio className="w-9 h-9 animate-pulse" style={{ color: '#22c55e' }} />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Stream Loading</h3>
        <p className="text-sm mb-6 max-w-xs" style={{ color: '#6b7c6e' }}>
          The broadcast for <span className="text-white font-semibold">{matchName}</span> hasn't been picked up yet.
          <br />Checking again in 30 seconds...
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full transition-all"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>
    </div>
  );
}
