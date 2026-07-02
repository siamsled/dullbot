'use client';

import React, { useState, useEffect } from 'react';
import { FusedMatch } from '@/lib/fsportz';
import Link from 'next/link';

function Countdown({ targetDate }: { targetDate: string }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const t = new Date(targetDate).getTime();
    const go = () => {
      const diff = t - Date.now();
      if (diff <= 0) { setTxt('Starting'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTxt(h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    go();
    const iv = setInterval(go, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return <span>{txt}</span>;
}

export default function MatchCard({ match }: { match: FusedMatch }) {
  const isLive = match.status === 'in';
  const isPost = match.status === 'post';
  const isUpcoming = match.status === 'pre';
  const isClickable = isLive || isUpcoming;
  const linkId = match.stremioId || match.id;
  const href = `/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(match.team1.name + ' vs ' + match.team2.name)}`;

  const card = (
    <div className={`mc-card ${isLive ? 'mc-live' : isUpcoming ? 'mc-upcoming' : 'mc-past'} ${isClickable ? 'mc-clickable' : ''}`}>
      {isLive && <div className="mc-live-glow" />}
      {isLive && (
        <div className="mc-live-shimmer" />
      )}

      {/* Badge */}
      <div className="mc-top">
        <span className="mc-league">{match.league?.replace(/-/g, ' ')}</span>
        {isLive ? (
          <span className="mc-badge mc-badge-live">
            <span className="mc-badge-dot" />LIVE
          </span>
        ) : isUpcoming ? (
          <span className="mc-badge mc-badge-pre">UP NEXT</span>
        ) : (
          <span className="mc-badge mc-badge-post">FT</span>
        )}
      </div>

      {/* Teams */}
      <div className="mc-teams">
        <div className="mc-team">
          <div className="mc-flag">
            {match.team1.logo
              ? <img src={match.team1.logo} alt={match.team1.name} />
              : <div className="mc-flag-ph" />}
          </div>
          <span className="mc-name">{match.team1.name}</span>
        </div>

        <div className="mc-center">
          {isLive || isPost ? (
            <div className="mc-score">
              <span>{match.team1.score}</span>
              <span className="mc-sep">–</span>
              <span>{match.team2.score}</span>
            </div>
          ) : (
            <div className="mc-vs">VS</div>
          )}
          {isLive && <div className="mc-time-detail">{match.statusDetail}</div>}
        </div>

        <div className="mc-team mc-team-r">
          <div className="mc-flag">
            {match.team2.logo
              ? <img src={match.team2.logo} alt={match.team2.name} />
              : <div className="mc-flag-ph" />}
          </div>
          <span className="mc-name">{match.team2.name}</span>
        </div>
      </div>

      {/* CTA */}
      {isClickable && (
        <div className={`mc-cta ${isLive ? 'mc-cta-live' : 'mc-cta-pre'}`}>
          {isLive ? (
            <>
              <span className="mc-cta-icon">▶</span> Watch Live
            </>
          ) : (
            <>
              <span className="mc-cta-icon">⏱</span>
              <Countdown targetDate={match.date} />
            </>
          )}
        </div>
      )}

      <style>{`
        .mc-card {
          position: relative;
          flex-shrink: 0;
          width: clamp(240px, 85vw, 280px);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 0;
          isolation: isolate;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
        }
        .mc-card.mc-clickable { cursor: pointer; }
        .mc-card.mc-clickable:hover {
          transform: translateY(-6px) scale(1.02);
        }
        .mc-live {
          background: linear-gradient(160deg, #0d1f10 0%, #091507 100%);
          border: 1px solid rgba(239,68,68,0.3);
          box-shadow: 0 0 0 1px rgba(239,68,68,0.1), 0 20px 60px rgba(0,0,0,0.5);
        }
        .mc-live:hover {
          box-shadow: 0 0 0 1px rgba(239,68,68,0.4), 0 24px 60px rgba(239,68,68,0.15), 0 40px 80px rgba(0,0,0,0.5);
        }
        .mc-upcoming {
          background: linear-gradient(160deg, #0c1a0f 0%, #081308 100%);
          border: 1px solid rgba(34,197,94,0.18);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .mc-upcoming:hover {
          box-shadow: 0 0 0 1px rgba(34,197,94,0.3), 0 24px 60px rgba(34,197,94,0.08), 0 40px 80px rgba(0,0,0,0.4);
        }
        .mc-past {
          background: linear-gradient(160deg, #0a120b 0%, #070d08 100%);
          border: 1px solid rgba(255,255,255,0.05);
          opacity: 0.7;
        }
        .mc-live-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #ef4444, transparent);
          animation: glowScan 3s ease-in-out infinite;
        }
        @keyframes glowScan {
          0% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%); }
        }
        .mc-live-shimmer {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(135deg, transparent 40%, rgba(239,68,68,0.03) 50%, transparent 60%);
          animation: shimmer 4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .mc-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 0;
        }
        .mc-league {
          font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,255,255,0.25);
        }
        .mc-badge {
          font-size: 9px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; padding: 3px 8px; border-radius: 99px;
          display: flex; align-items: center; gap: 5px;
        }
        .mc-badge-live { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .mc-badge-pre { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
        .mc-badge-post { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.08); }
        .mc-badge-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: liveDot 1.2s ease-in-out infinite;
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .mc-teams {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 16px;
          gap: 8px;
        }
        .mc-team {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; flex: 1; min-width: 0;
        }
        .mc-team-r { align-items: center; }
        .mc-flag {
          width: 52px; height: 52px; border-radius: 50%;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          flex-shrink: 0;
        }
        .mc-flag img { width: 38px; height: 38px; object-fit: contain; }
        .mc-flag-ph { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .mc-name {
          font-size: 11px; font-weight: 700; text-align: center;
          color: rgba(255,255,255,0.8); line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 80px;
        }
        .mc-center { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
        .mc-score {
          display: flex; align-items: center; gap: 6px;
          font-size: 30px; font-weight: 900; color: #fff;
          letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 20px rgba(255,255,255,0.1);
        }
        .mc-sep { color: rgba(255,255,255,0.2); font-size: 20px; }
        .mc-vs {
          font-size: 14px; font-weight: 900; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.15);
        }
        .mc-time-detail {
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #ef4444;
        }
        .mc-cta {
          margin: 0 12px 12px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 10px; border-radius: 12px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
          transition: all 0.2s;
        }
        .mc-cta-live {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #ef4444;
        }
        .mc-cta-pre {
          background: rgba(34,197,94,0.07);
          border: 1px solid rgba(34,197,94,0.2);
          color: rgba(34,197,94,0.8);
        }
        .mc-cta-icon { font-size: 10px; }
      `}</style>
    </div>
  );

  if (isClickable) return <Link href={href}>{card}</Link>;
  return card;
}
