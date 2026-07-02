'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Radio } from 'lucide-react';

export default function StreamWaiting({ matchName }: { matchName: string }) {
  // Auto-refresh the page every 30 seconds waiting for streams to come online
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04)_0%,transparent_70%)]"></div>
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
          <Radio className="w-7 h-7 text-emerald-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">Stream Loading</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          The broadcast for <span className="text-slate-200 font-semibold">{matchName}</span> hasn't been picked up yet. Checking again in 30 seconds...
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm px-4 py-2 rounded-lg transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>
    </div>
  );
}
