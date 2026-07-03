import React from 'react';
import { getFusedMatches, getGroupStandings, getAllFixtures, FusedMatch, Group } from '@/lib/fsportz';
import MatchCard from '@/components/fsportz/MatchCard';
import LocalTime from '@/components/fsportz/LocalTime';
import Link from 'next/link';

export const revalidate = 60;

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
function formatDateKey(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function FixtureRow({ match, streamId }: { match: FusedMatch; streamId: string | null }) {
  const isLive = match.status === 'in';
  const isPost = match.status === 'post';
  const isPre = match.status === 'pre';
  const linkId = streamId || match.id;
  const href = `/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(match.team1.name + ' vs ' + match.team2.name)}`;

  const inner = (
    <div className={`fr-row ${isLive ? 'fr-live' : isPre ? 'fr-pre' : 'fr-post'} ${isLive || isPre ? 'fr-clickable' : ''}`}>
      {isLive && <div className="fr-live-bar" />}

      {/* Team 1 */}
      <div className="fr-team fr-team-l">
        <span className={`fr-name ${isPost ? 'fr-muted' : ''}`}>{match.team1.name}</span>
        {match.team1.logo && (
          <div className="fr-flag">
            <img src={match.team1.logo} alt="" />
          </div>
        )}
      </div>

      {/* Center */}
      <div className="fr-mid">
        {isPost || isLive ? (
          <div className="fr-score">
            <span className={isPost ? 'fr-score-muted' : ''}>{match.team1.score}</span>
            <span className="fr-score-sep">{isLive ? '●' : '–'}</span>
            <span className={isPost ? 'fr-score-muted' : ''}>{match.team2.score}</span>
          </div>
        ) : (
          <span className="fr-time"><LocalTime dateStr={match.date} format="time" /></span>
        )}
        {isLive && <div className="fr-live-label">LIVE</div>}
        {isPost && <div className="fr-post-label">{match.statusDetail}</div>}
      </div>

      {/* Team 2 */}
      <div className="fr-team fr-team-r">
        {match.team2.logo && (
          <div className="fr-flag">
            <img src={match.team2.logo} alt="" />
          </div>
        )}
        <span className={`fr-name ${isPost ? 'fr-muted' : ''}`}>{match.team2.name}</span>
        {isLive && <span className="fr-watch-pill">WATCH</span>}
      </div>
    </div>
  );

  return (isLive || isPre) ? <Link href={href}>{inner}</Link> : inner;
}

function GroupTable({ group }: { group: Group }) {
  return (
    <div className="gt-wrap">
      <div className="gt-head">
        <span className="gt-name">{group.name}</span>
        <span className="gt-cols">W<span className="gt-hide-sm"> D L GF GA</span> GD PTS</span>
      </div>
      <div className="gt-rows">
        {group.entries.map((entry, i) => (
          <div key={entry.team.name} className={`gt-row ${entry.advanced ? 'gt-adv' : ''}`}>
            <span className={`gt-rank ${i < 2 ? 'gt-rank-q' : 'gt-rank-dim'}`}>{i + 1}</span>
            <div className="gt-logo">
              {entry.team.logo
                ? <img src={entry.team.logo} alt="" />
                : <div className="gt-logo-ph" />}
            </div>
            <span className="gt-team-name">{entry.team.name}</span>
            {entry.advanced && <span className="gt-adv-badge">ADV</span>}
            <div className="gt-stats">
              <span>{entry.w}</span>
              <span className="gt-hide-sm">{entry.d}</span>
              <span className="gt-hide-sm">{entry.l}</span>
              <span className="gt-hide-sm gt-dim">{entry.gf}</span>
              <span className="gt-hide-sm gt-dim">{entry.ga}</span>
              <span className={Number(entry.gd) > 0 ? 'gt-pos' : Number(entry.gd) < 0 ? 'gt-neg' : 'gt-dim'}>{entry.gd}</span>
              <span className="gt-pts">{entry.pts}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function FSportzHome() {
  const [fusedMatches, groups, allFixtures] = await Promise.all([
    getFusedMatches(),
    getGroupStandings(),
    getAllFixtures(),
  ]);

  const liveMatches = fusedMatches.filter(m => m.status === 'in');
  const upcomingMatches = allFixtures
    .filter(m => m.status === 'pre')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const stremioMap = new Map<string, string>();
  fusedMatches.forEach(m => {
    if (m.stremioId) {
      stremioMap.set(`${m.team1.name}|${m.team2.name}`, m.stremioId);
      stremioMap.set(`${m.team2.name}|${m.team1.name}`, m.stremioId);
    }
  });

  const sortedFixtures = [...allFixtures]
    .map(m => ({ ...m, stremioId: stremioMap.get(`${m.team1.name}|${m.team2.name}`) || null }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const fixturesByDate = sortedFixtures.reduce((acc: Record<string, typeof sortedFixtures>, m) => {
    const k = formatDateKey(m.date);
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});

  const upcomingDates = Object.keys(fixturesByDate).filter(k => fixturesByDate[k].some(m => m.status !== 'post'));
  const pastDates = Object.keys(fixturesByDate).filter(k => fixturesByDate[k].every(m => m.status === 'post')).slice(-5);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        /* ===== PAGE ===== */
        .fs-page {
          min-height: 100vh;
          background: #060e07;
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ===== HEADER ===== */
        .fs-header {
          position: sticky; top: 0; z-index: 100;
          height: 60px;
          backdrop-filter: blur(24px) saturate(180%);
          background: rgba(6,14,7,0.82);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center;
        }
        .fs-header-inner {
          max-width: 1280px; width: 100%; margin: 0 auto;
          padding: 0 20px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .fs-logo {
          display: flex; align-items: center; gap: 10px;
        }
        .fs-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 15px; color: #060e07;
          box-shadow: 0 4px 14px rgba(255,255,255,0.4);
        }
        .fs-logo-name {
          font-weight: 800; font-size: 17px; letter-spacing: -0.02em; color: #fff;
        }
        .fs-logo-name span { color: #ffffff; }
        .fs-header-right { display: flex; align-items: center; gap: 10px; }
        .fs-live-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 99px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #ef4444;
          animation: pillPulse 2s ease-in-out infinite;
        }
        @keyframes pillPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .fs-live-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
        .fs-wc-pill {
          display: none;
          padding: 5px 12px; border-radius: 99px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
        }
        @media (min-width: 640px) { .fs-wc-pill { display: flex; } }

        /* ===== HERO POSTER ===== */
        .fs-hero {
          position: relative; overflow: hidden;
          min-height: 540px; 
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 20px 60px;
          text-align: center;
        }
        .fs-poster-bg {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: linear-gradient(180deg, #111, #060e07);
        }
        .fs-poster-glow {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(circle at 50% -20%, rgba(220, 40, 40, 0.35), transparent 70%);
          mix-blend-mode: screen;
        }
        .fs-poster-logo-bg {
          position: absolute; top: 50%; transform: translateY(-50%); width: 50vw; max-width: 500px; height: 50vw; max-height: 500px;
          opacity: 0.08; object-fit: contain; filter: blur(4px) grayscale(0.5); z-index: 1; pointer-events: none;
        }
        .fs-poster-logo-bg-l { left: -10vw; }
        .fs-poster-logo-bg-r { right: -10vw; }
        
        .fs-poster-content { position: relative; z-index: 2; width: 100%; max-width: 1000px; margin: 0 auto; }
        
        .fs-poster-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase;
          color: rgba(255,255,255,0.7); margin-bottom: 24px;
        }
        .fs-poster-dot { width: 6px; height: 6px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 10px #fff; }
        
        .fs-poster-title {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          line-height: 0.85; margin-bottom: 24px; position: relative; z-index: 3;
        }
        .fs-poster-t1, .fs-poster-t2 {
          font-size: clamp(48px, 11vw, 130px); font-weight: 900; letter-spacing: -0.04em; text-transform: uppercase;
          color: #fff; text-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .fs-poster-vs {
          font-size: clamp(24px, 4vw, 40px); font-weight: 900; color: rgba(255,255,255,0.3);
          margin: -10px 0; text-transform: uppercase; z-index: 4;
        }
        
        .fs-poster-date {
          display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 40px;
        }
        .fs-poster-date-badge {
          background: #fff; color: #000; padding: 4px 10px; border-radius: 4px;
          font-size: 13px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .fs-poster-date-time {
          font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9);
        }
        
        .fs-poster-cta { display: flex; justify-content: center; }
        .fs-poster-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: #ffffff; color: #000000; padding: 16px 36px; border-radius: 99px;
          font-size: 16px; font-weight: 800; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none; box-shadow: 0 10px 30px rgba(255,255,255,0.15);
        }
        .fs-poster-btn:hover { transform: scale(1.05); box-shadow: 0 14px 40px rgba(255,255,255,0.25); }

        /* ===== SECTIONS ===== */
        .fs-main { max-width: 1280px; margin: 0 auto; padding: 0 20px 80px; }
        .fs-section { margin-bottom: 60px; }
        .fs-section-head {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .fs-section-title {
          font-size: 11px; font-weight: 800; letter-spacing: 0.25em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
        }
        .fs-section-line {
          flex: 1; height: 1px; background: rgba(255,255,255,0.05);
        }
        .fs-section-head-live .fs-section-title { color: rgba(239,68,68,0.8); }

        /* ===== LIVE GRID ===== */
        .fs-live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        /* ===== CAROUSEL ===== */
        .fs-carousel {
          display: flex; gap: 14px;
          overflow-x: auto; padding-bottom: 16px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .fs-carousel::-webkit-scrollbar { display: none; }
        .fs-carousel > * { scroll-snap-align: start; }

        /* ===== MAIN GRID ===== */
        .fs-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 1200px) { .fs-grid { grid-template-columns: 1fr 360px; } }

        /* ===== FIXTURE DATE GROUP ===== */
        .fg-group { margin-bottom: 24px; }
        .fg-date-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
        }
        .fg-date-pill {
          font-size: 10px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; padding: 4px 12px; border-radius: 99px;
        }
        .fg-date-pill-live {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: rgba(239,68,68,0.8);
        }
        .fg-date-pill-upcoming {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.6);
        }
        .fg-date-pill-past {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.2);
        }
        .fg-line { flex: 1; height: 1px; background: rgba(255,255,255,0.04); }
        .fg-rows { display: flex; flex-direction: column; gap: 6px; }

        /* ===== FIXTURE ROW ===== */
        .fr-row {
          display: grid;
          grid-template-columns: 1fr 90px 1fr;
          align-items: center; gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          transition: all 0.2s;
        }
        .fr-clickable { cursor: pointer; }
        .fr-live {
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.15);
          position: relative; overflow: hidden;
        }
        .fr-live:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }
        .fr-pre {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .fr-pre:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
        .fr-post {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.03);
          opacity: 0.85;
        }
        .fr-live-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 1.5px;
          background: linear-gradient(90deg, transparent 0%, #ef4444 50%, transparent 100%);
          animation: liveBar 3s ease-in-out infinite;
        }
        @keyframes liveBar { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .fr-team { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .fr-team-l { justify-content: flex-end; }
        .fr-team-r { justify-content: flex-start; }
        .fr-flag {
          width: 26px; height: 26px; border-radius: 50%; overflow: hidden;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fr-flag img { width: 18px; height: 18px; object-fit: contain; }
        .fr-name {
          font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .fr-muted { color: rgba(255,255,255,0.6); }
        .fr-mid { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .fr-score {
          display: flex; align-items: center; gap: 5px;
          font-size: 16px; font-weight: 900; color: #fff;
          font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
        }
        .fr-score-sep { color: rgba(255,255,255,0.2); font-size: 12px; }
        .fr-score-muted { color: rgba(255,255,255,0.7); }
        .fr-time {
          font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7);
        }
        .fr-live-label {
          font-size: 8px; font-weight: 900; letter-spacing: 0.2em;
          color: #ef4444; animation: liveLabel 1.5s step-end infinite;
        }
        @keyframes liveLabel { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .fr-post-label { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.2); }
        .fr-watch-pill {
          margin-left: auto; font-size: 8px; font-weight: 900; letter-spacing: 0.15em;
          padding: 3px 7px; border-radius: 99px;
          background: rgba(239,68,68,0.1); color: #ef4444;
          border: 1px solid rgba(239,68,68,0.25);
          flex-shrink: 0;
        }

        /* ===== GROUP TABLE ===== */
        .gt-wrap {
          border-radius: 16px; overflow: hidden;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 10px;
        }
        .gt-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .gt-name {
          font-size: 10px; font-weight: 800; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(255,255,255,0.6);
        }
        .gt-cols {
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
        }
        .gt-hide-sm { display: none; }
        @media (min-width: 400px) { .gt-hide-sm { display: inline; } }
        .gt-rows { display: flex; flex-direction: column; }
        .gt-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.15s;
        }
        .gt-row:last-child { border-bottom: none; }
        .gt-adv { background: rgba(255,255,255,0.03); }
        .gt-rank { width: 16px; text-align: center; font-size: 11px; font-weight: 800; }
        .gt-rank-q { color: #ffffff; }
        .gt-rank-dim { color: rgba(255,255,255,0.2); }
        .gt-logo {
          width: 20px; height: 20px; border-radius: 50%; overflow: hidden;
          background: rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .gt-logo img { width: 14px; height: 14px; object-fit: contain; }
        .gt-logo-ph { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .gt-team-name { flex: 1; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.75); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gt-adv-badge {
          font-size: 7px; font-weight: 900; letter-spacing: 0.1em;
          padding: 2px 5px; border-radius: 99px;
          background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.15); display: none;
        }
        @media (min-width: 360px) { .gt-adv-badge { display: inline; } }
        .gt-stats {
          display: flex; gap: 10px;
          font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums;
          color: rgba(255,255,255,0.4);
        }
        .gt-dim { color: rgba(255,255,255,0.2); }
        .gt-pos { color: #ffffff; }
        .gt-neg { color: #ef4444; }
        .gt-pts { font-weight: 900; color: #fff; }

        /* ===== COMPLETED DIVIDER ===== */
        .fg-completed-head {
          display: flex; align-items: center; gap: 10px; margin: 32px 0 16px;
        }
        .fg-completed-label {
          font-size: 9px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase;
          color: rgba(255,255,255,0.15);
        }
        .fg-completed-line { flex: 1; height: 1px; background: rgba(255,255,255,0.04); }
      `}</style>

      <main className="fs-page">
        {/* Header */}
        <header className="fs-header">
          <div className="fs-header-inner">
            <div className="fs-logo">
              <div className="fs-logo-mark">F</div>
              <span className="fs-logo-name">FSportz <span>Live</span></span>
            </div>
            <div className="fs-header-right">
              {liveMatches.length > 0 && (
                <div className="fs-live-pill">
                  <span className="fs-live-pill-dot" />
                  {liveMatches.length} Live
                </div>
              )}
              <div className="fs-wc-pill">FIFA World Cup 2026</div>
            </div>
          </div>
        </header>

        {/* Hero Poster */}
        <section className="fs-hero">
          <div className="fs-poster-bg">
            <div className="fs-poster-glow" />
          </div>

          {upcomingMatches.length > 0 ? (() => {
            const nextMatch = upcomingMatches[0];
            const href = `/fsportz/match/${encodeURIComponent(nextMatch.stremioId || nextMatch.id)}?date=${encodeURIComponent(nextMatch.date)}&status=${nextMatch.status}&name=${encodeURIComponent(nextMatch.team1.name + ' vs ' + nextMatch.team2.name)}`;
            
            return (
              <>
                {nextMatch.team1.logo && <img src={nextMatch.team1.logo} alt="" className="fs-poster-logo-bg fs-poster-logo-bg-l" />}
                {nextMatch.team2.logo && <img src={nextMatch.team2.logo} alt="" className="fs-poster-logo-bg fs-poster-logo-bg-r" />}

                <div className="fs-poster-content">
                  <div className="fs-poster-eyebrow">
                    <span className="fs-poster-dot" /> 2026 FIFA WORLD CUP
                  </div>

                  <div className="fs-poster-title">
                    <span className="fs-poster-t1">{nextMatch.team1.name}</span>
                    <span className="fs-poster-vs">vs</span>
                    <span className="fs-poster-t2">{nextMatch.team2.name}</span>
                  </div>

                  <div className="fs-poster-date">
                    <span className="fs-poster-date-badge">{formatDateKey(nextMatch.date).split(',')[0]}</span>
                    <span className="fs-poster-date-time"><LocalTime dateStr={nextMatch.date} format="time" /></span>
                  </div>

                  <div className="fs-poster-cta">
                    <Link href={href} className="fs-poster-btn">
                      <span className="fs-poster-btn-icon">⚽</span>
                      Watch Match
                    </Link>
                  </div>
                </div>
              </>
            );
          })() : (
            <div className="fs-poster-content">
              <h1 className="fs-poster-t1" style={{ fontSize: 'clamp(30px, 8vw, 80px)' }}>NO UPCOMING MATCHES</h1>
            </div>
          )}
        </section>

        <div className="fs-main">

          {/* Live Now */}
          {liveMatches.length > 0 && (
            <section className="fs-section">
              <div className="fs-section-head fs-section-head-live">
                <span className="fs-section-title">● Live Now</span>
                <div className="fs-section-line" />
              </div>
              <div className="fs-live-grid">
                {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {/* Up Next */}
          {upcomingMatches.length > 0 && (
            <section className="fs-section">
              <div className="fs-section-head">
                <span className="fs-section-title">Up Next</span>
                <div className="fs-section-line" />
              </div>
              <div className="fs-carousel">
                {upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {/* Fixtures + Standings */}
          <div className="fs-grid">

            {/* Fixtures */}
            <section className="fs-section">
              <div className="fs-section-head">
                <span className="fs-section-title">All Fixtures</span>
                <div className="fs-section-line" />
              </div>

              {upcomingDates.map(dk => {
                const matches = fixturesByDate[dk];
                const hasLive = matches.some(m => m.status === 'in');
                return (
                  <div key={dk} className="fg-group">
                    <div className="fg-date-row">
                      <span className={`fg-date-pill ${hasLive ? 'fg-date-pill-live' : 'fg-date-pill-upcoming'}`}>
                        <LocalTime dateStr={matches[0].date} format="date" />
                      </span>
                      <div className="fg-line" />
                    </div>
                    <div className="fg-rows">
                      {matches.map(m => <FixtureRow key={m.id} match={m} streamId={m.stremioId} />)}
                    </div>
                  </div>
                );
              })}

              {pastDates.length > 0 && (
                <>
                  <div className="fg-completed-head">
                    <span className="fg-completed-label">Completed</span>
                    <div className="fg-completed-line" />
                  </div>
                  {[...pastDates].reverse().map(dk => (
                    <div key={dk} className="fg-group">
                      <div className="fg-date-row">
                        <span className="fg-date-pill fg-date-pill-past">
                          <LocalTime dateStr={fixturesByDate[dk][0].date} format="date" />
                        </span>
                        <div className="fg-line" />
                      </div>
                      <div className="fg-rows">
                        {fixturesByDate[dk].map(m => <FixtureRow key={m.id} match={m} streamId={m.stremioId} />)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>

            {/* Group Standings */}
            <aside>
              <div className="fs-section-head">
                <span className="fs-section-title">Group Standings</span>
                <div className="fs-section-line" />
              </div>
              {groups.map(g => <GroupTable key={g.name} group={g} />)}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
