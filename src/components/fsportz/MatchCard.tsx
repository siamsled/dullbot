'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FusedMatch } from '@/lib/fsportz';
import Link from 'next/link';
import { Play } from 'lucide-react';

export default function MatchCard({ match }: { match: FusedMatch }) {
  const isLive = match.status === 'in';
  const isFinished = match.status === 'post';

  const cardContent = (
    <motion.div 
      whileHover={{ scale: match.stremioId ? 1.05 : 1 }}
      whileTap={{ scale: match.stremioId ? 0.98 : 1 }}
      className={`group relative flex-shrink-0 w-80 rounded-2xl overflow-hidden bg-slate-800 border shadow-xl flex flex-col justify-between ${
        match.stremioId ? 'border-emerald-500/50 cursor-pointer' : 'border-slate-700/50'
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

      {match.stremioId && (
        <div className="bg-emerald-500/20 text-emerald-400 p-3 text-center text-sm font-bold flex items-center justify-center gap-2 border-t border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
          <Play className="w-4 h-4" /> Watch Stream
        </div>
      )}
    </motion.div>
  );

  if (match.stremioId) {
    return (
      <Link href={`/fsportz/match/${encodeURIComponent(match.stremioId)}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
