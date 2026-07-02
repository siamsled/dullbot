'use client';

import React, { useState, useEffect } from 'react';
import { FusedMatch } from '@/lib/fsportz';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft('Soon'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${String(m).padStart(2,'0')}m`);
      else setTimeLeft(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return <span className="font-mono font-bold text-sm" style={{ color: '#22c55e' }}>{timeLeft}</span>;
}

export default function MatchCard({ match }: { match: FusedMatch }) {
  const isLive = match.status === 'in';
  const isFinished = match.status === 'post';
  const isUpcoming = match.status === 'pre';
  const isClickable = isUpcoming || isLive;
  const linkId = match.stremioId || match.id;
  const matchName = `${match.team1.name} vs ${match.team2.name}`;

  const card = (
    <div
      className={`relative flex-shrink-0 w-[85vw] sm:w-72 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1' : 'opacity-70'
      }`}
      style={{
        background: isLive
          ? 'linear-gradient(145deg, #0f2010 0%, #14290f 100%)'
          : 'linear-gradient(145deg, #111c13 0%, #162018 100%)',
        border: isLive
          ? '1px solid rgba(34,197,94,0.4)'
          : isUpcoming
          ? '1px solid rgba(34,197,94,0.15)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isLive ? '0 0 30px rgba(34,197,94,0.08)' : 'none',
      }}
    >
      {/* Top badge bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4b6e53' }}>
          {match.league?.replace(/-/g, ' ')}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            Live
          </span>
        ) : isUpcoming ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            Upcoming
          </span>
        ) : (
          <span className="text-[10px] font-bold" style={{ color: '#4b6e53' }}>{match.statusDetail}</span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between px-5 py-4 gap-3">
        {/* Team 1 */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}>
            {match.team1.logo
              ? <img src={match.team1.logo} alt={match.team1.name} className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 rounded-full" style={{ background: '#1e3a22' }} />}
          </div>
          <span className="text-xs font-bold text-center truncate w-full text-white">{match.team1.name}</span>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center flex-shrink-0">
          {isLive || isFinished ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white tabular-nums">{match.team1.score}</span>
                <span className="text-lg font-black" style={{ color: '#2d4a33' }}>—</span>
                <span className="text-3xl font-black text-white tabular-nums">{match.team2.score}</span>
              </div>
              {isLive && (
                <span className="text-[10px] font-bold mt-1" style={{ color: '#22c55e' }}>
                  {match.statusDetail}
                </span>
              )}
            </>
          ) : (
            <span className="text-xl font-black" style={{ color: '#2d4a33' }}>VS</span>
          )}
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}>
            {match.team2.logo
              ? <img src={match.team2.logo} alt={match.team2.name} className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 rounded-full" style={{ background: '#1e3a22' }} />}
          </div>
          <span className="text-xs font-bold text-center truncate w-full text-white">{match.team2.name}</span>
        </div>
      </div>

      {/* Bottom CTA */}
      {isClickable && (
        <div className="mx-4 mb-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#22c55e'
          }}>
          {isLive
            ? <><Play className="w-3.5 h-3.5 fill-current" /> Watch Live</>
            : <><Clock className="w-3.5 h-3.5" /> <Countdown targetDate={match.date} /></>}
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <Link href={`/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(matchName)}`}>
        {card}
      </Link>
    );
  }
  return card;
}
