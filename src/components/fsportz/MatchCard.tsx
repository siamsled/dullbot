'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MatchMeta } from '@/lib/fsportz';
import Link from 'next/link';
import { Play } from 'lucide-react';

export default function MatchCard({ match }: { match: MatchMeta }) {
  const isLive = match.releaseInfo === 'LIVE' || match.description?.includes('LIVE NOW');

  return (
    <Link href={`/fsportz/match/${encodeURIComponent(match.id)}`}>
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex-shrink-0 w-72 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 shadow-xl cursor-pointer"
      >
        <div className="relative aspect-video">
          <img 
            src={match.background || match.poster} 
            alt={match.name} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
          
          {/* Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-emerald-500/80 p-3 rounded-full backdrop-blur-sm">
              <Play fill="currentColor" className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {isLive && (
            <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse">
              LIVE
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-slate-100 line-clamp-1">{match.name}</h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{match.description?.split('\n')[0]}</p>
        </div>
      </motion.div>
    </Link>
  );
}
