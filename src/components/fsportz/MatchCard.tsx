'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FusedMatch } from '@/lib/fsportz';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Starting soon...');
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-emerald-400 font-bold">{timeLeft}</span>;
}

export default function MatchCard({ match }: { match: FusedMatch }) {
  const isLive = match.status === 'in';
  const isFinished = match.status === 'post';
  const isUpcoming = match.status === 'pre';
  
  const isClickable = isUpcoming || (isLive && match.stremioId);
  const linkId = match.stremioId || match.id;
  const matchName = `${match.team1.name} vs ${match.team2.name}`;

  const cardContent = (
    <motion.div 
      whileHover={{ scale: isClickable ? 1.05 : 1 }}
      whileTap={{ scale: isClickable ? 0.98 : 1 }}
      className={`group relative flex-shrink-0 w-80 rounded-2xl overflow-hidden bg-slate-800 border shadow-xl flex flex-col justify-between ${
        isClickable ? 'border-emerald-500/50 cursor-pointer' : 'border-slate-700/50 opacity-80'
      }`}
    >
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center text-xs font-bold">
        <span className="text-slate-400">{match.league}</span>
        {isLive ? (
          <span className="text-red-400 flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span> LIVE
          </span>
        ) : (
          <span className="text-slate-500">{match.statusDetail}</span>
        )}
      </div>

      <div className="flex-1 p-6 flex justify-between items-center gap-4">
        <div className="flex flex-col items-center flex-1">
          <img src={match.team1.logo} alt={match.team1.name} className="w-12 h-12 object-contain" />
          <span className="mt-2 text-sm font-semibold text-center line-clamp-1">{match.team1.name}</span>
        </div>

        <div className="text-2xl font-black tabular-nums tracking-wider text-white">
          {isLive || isFinished ? `${match.team1.score} - ${match.team2.score}` : 'vs'}
        </div>

        <div className="flex flex-col items-center flex-1">
          <img src={match.team2.logo} alt={match.team2.name} className="w-12 h-12 object-contain" />
          <span className="mt-2 text-sm font-semibold text-center line-clamp-1">{match.team2.name}</span>
        </div>
      </div>

      {isClickable && isLive && (
        <div className="bg-emerald-500/20 text-emerald-400 p-3 text-center text-sm font-bold flex items-center justify-center gap-2 border-t border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
          <Play className="w-4 h-4" /> Watch Stream
        </div>
      )}
      
      {isClickable && isUpcoming && (
        <div className="bg-slate-800/80 text-slate-300 p-3 text-center text-sm font-bold flex items-center justify-center gap-2 border-t border-slate-700 transition-colors">
          <Clock className="w-4 h-4 text-emerald-500 opacity-70" /> 
          <Countdown targetDate={match.date} />
        </div>
      )}
    </motion.div>
  );

  if (isClickable) {
    return (
      <Link href={`/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(matchName)}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
