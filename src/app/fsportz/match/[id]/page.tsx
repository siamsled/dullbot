import React from 'react';
import { getMeta, getStreams, getFusedMatches, getAllFixtures, FusedMatch } from '@/lib/fsportz';
import HlsPlayer from '@/components/fsportz/HlsPlayer';
import MatchCountdown from '@/components/fsportz/MatchCountdown';
import StreamWaiting from '@/components/fsportz/StreamWaiting';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MatchPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string; status?: string; date?: string; name?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const matchId = decodeURIComponent(params.id);
  let [meta, streams, fusedMatches, allFixturesArray] = await Promise.all([getMeta(matchId), getStreams(matchId), getFusedMatches(), getAllFixtures()]);

  let fused: FusedMatch | undefined = fusedMatches.find(m => m.stremioId === matchId || m.id === matchId);
  if (!fused) {
    fused = allFixturesArray.find(m => m.stremioId === matchId || m.id === matchId);
  }

  const matchStatus = searchParams.status;
  const matchDate = searchParams.date;
  const matchName = searchParams.name;
  const isUpcoming = matchStatus === 'pre' && matchDate;

  if (!meta && (isUpcoming || matchStatus === 'in') && matchName) {
    meta = {
      id: matchId, type: 'sport', name: matchName,
      poster: '', posterShape: 'landscape', background: '',
      genres: [], description: 'Live broadcast will be available when the match starts.', releaseInfo: '',
    };
  }

  if (!meta) {
    return (
      <>
        <style>{`
          .mp-notfound {
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: #060e07; font-family: 'Inter', system-ui, sans-serif;
          }
          .mp-notfound-inner { text-align: center; }
          .mp-notfound h2 { font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 8px; }
          .mp-notfound p { color: rgba(255,255,255,0.3); font-size: 14px; margin-bottom: 24px; }
          .mp-notfound a {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 22px; border-radius: 99px; font-size: 13px; font-weight: 700;
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.25);
            color: #ffffff; text-decoration: none; transition: all 0.2s;
          }
          .mp-notfound a:hover { background: rgba(255,255,255,0.15); transform: translateY(-1px); }
        `}</style>
        <div className="mp-notfound">
          <div className="mp-notfound-inner">
            <h2>Match Not Found</h2>
            <p>The requested match data could not be loaded.</p>
            <Link href="/fsportz">← Return to Homepage</Link>
          </div>
        </div>
      </>
    );
  }

  const allowedStreams = streams.filter(s => {
    const name = s.name?.toUpperCase() || '';
    const title = s.title || '';
    return (name.includes('TELEMUNDO') || name.includes('TSN 4')) &&
      (title.includes('1080') || title.includes('720'));
  }).map(s => {
    const name = s.name?.toUpperCase() || '';
    const is1080 = s.title?.includes('1080');
    return { ...s, displayName: name.includes('TELEMUNDO') ? 'Spanish' : 'English', qualityLabel: is1080 ? 'FHD' : 'HD' };
  });

  const selectedStreamIdx = searchParams.source ? parseInt(searchParams.source, 10) : 0;
  const currentStream = allowedStreams[selectedStreamIdx] || allowedStreams[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #060e07; }
        .mp-page {
          min-height: 100vh;
          background: #060e07;
          color: #fff;
          font-family: 'Barlow Condensed', 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          display: flex; flex-direction: column;
        }
        /* Ambient glow bg */
        .mp-page::before {
          content: '';
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 60% 40% at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 80% 80%, rgba(16,185,129,0.03) 0%, transparent 60%);
        }
        .mp-header {
          position: sticky; top: 0; z-index: 50;
          height: 60px;
          backdrop-filter: blur(24px) saturate(180%);
          background: rgba(6,14,7,0.4);
          display: flex; align-items: center;
        }
        .fs-menu-btn {
          background: none; border: none; cursor: pointer;
          display: flex; flex-direction: column; gap: 4px;
          padding: 8px 6px; border-radius: 8px;
          transition: background 0.2s;
          text-decoration: none;
        }
        .fs-menu-btn:hover {
          background: rgba(255,255,255,0.06);
        }
        .fs-menu-bar {
          width: 18px; height: 1.5px; background: #fff;
          border-radius: 99px; transition: all 0.2s ease-in-out;
        }
        .fs-menu-bar:last-child {
          width: 12px; align-self: flex-end;
        }
        .fs-menu-btn:hover .fs-menu-bar:last-child {
          width: 18px;
        }
        .mp-header-inner {
          max-width: 1100px; width: 100%; margin: 0 auto;
          padding: 0 20px;
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px;
        }
        .mp-back {
          justify-self: start;
          display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.4); text-decoration: none;
          font-size: 14px; font-weight: 600; transition: color 0.2s;
        }
        .mp-back:hover { color: #fff; }
        .mp-match-header-teams {
          justify-self: center; display: flex; align-items: center; gap: 12px;
        }
        .mp-team {
          display: flex; align-items: center; gap: 8px;
        }
        .mp-team-name {
          font-family: 'Anton', Impact, sans-serif;
          font-size: clamp(16px, 3vw, 22px); font-weight: 400; color: #fff;
          text-transform: uppercase;
        }
        .mp-team-logo {
          width: 24px; height: 24px; object-fit: contain;
        }
        .mp-team-vs {
          font-family: 'Anton', Impact, sans-serif;
          font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.2); margin: 0 4px;
          text-transform: uppercase;
        }
        .mp-match-title {
          font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .mp-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #ef4444;
          box-shadow: 0 0 10px #ef4444;
          animation: liveDot 1.5s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes liveDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .mp-body {
          position: relative; z-index: 1;
          flex: 1; max-width: 1100px; width: 100%; margin: 0 auto;
          padding: 24px 20px 60px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mp-player-wrap {
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .mp-info-card {
          border-radius: 20px; overflow: hidden;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 16px 20px;
        }
        .mp-info-top {
          display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
        }
        .mp-title {
          font-size: clamp(18px, 3vw, 26px);
          font-weight: 900; letter-spacing: -0.02em; color: #fff;
        }
        .mp-live-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 99px;
          font-size: 10px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;
          background: rgba(239,68,68,0.1); color: #ef4444;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .mp-pre-badge {
          display: inline-flex; padding: 4px 12px; border-radius: 99px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
          background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.18);
        }
        .mp-desc {
          font-size: 13px; color: rgba(255,255,255,0.3); line-height: 1.6;
        }
        .mp-sources-label {
          font-size: 9px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase;
          color: rgba(255,255,255,0.2);
        }
        .mp-sources-empty { font-size: 13px; color: rgba(255,255,255,0.2); }
        .mp-sources-list { display: flex; gap: 8px; }
        .mp-source-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px 12px; border-radius: 8px;
          text-decoration: none; transition: all 0.2s;
          cursor: pointer; flex: 1; white-space: nowrap;
        }
        .mp-source-btn-active {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 0 15px rgba(255,255,255,0.08);
        }
        .mp-source-btn-inactive {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .mp-source-btn-inactive:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
        }
        .mp-source-icon { display: none; }
        .mp-source-info { display: flex; flex-direction: row; align-items: center; gap: 6px; }
        .mp-source-name {
          font-size: 13px; font-weight: 700;
        }
        .mp-source-name-active { color: #ffffff; }
        .mp-source-name-inactive { color: rgba(255,255,255,0.6); }
        .mp-quality-tag {
          font-size: 9px; font-weight: 900; letter-spacing: 0.1em;
          padding: 2px 6px; border-radius: 4px;
          display: inline-block;
        }
        .mp-quality-fhd { background: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.3); }
        .mp-quality-hd { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.15); }
      `}</style>
      <main className="mp-page">
        <header className="mp-header">
          <div className="mp-header-inner">
            <Link href="/fsportz" className="mp-back">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            
            <div className="mp-match-header-teams">
              {fused ? (
                <>
                  <div className="mp-team">
                    <span className="mp-team-name">{fused.team1.name}</span>
                    {fused.team1.logo && <img src={fused.team1.logo} alt="" className="mp-team-logo" />}
                  </div>
                  <div className="mp-team-vs">VS</div>
                  <div className="mp-team">
                    {fused.team2.logo && <img src={fused.team2.logo} alt="" className="mp-team-logo" />}
                    <span className="mp-team-name">{fused.team2.name}</span>
                  </div>
                </>
              ) : (
                <div className="mp-match-title">
                  {matchStatus === 'in' && <span className="mp-live-dot" />}
                  {meta.name}
                </div>
              )}
            </div>
            
            <div className="justify-self-end">
              <Link href="/dashboard" className="fs-menu-btn" aria-label="Main Menu">
                <span className="fs-menu-bar" />
                <span className="fs-menu-bar" />
              </Link>
            </div>
          </div>
        </header>

        <div className="mp-body">
          {/* Player Area */}
          <>
            {currentStream ? (
              <HlsPlayer src={currentStream.url} />
            ) : isUpcoming ? (
              <div className="mp-player-wrap"><MatchCountdown targetDate={matchDate!} stream={currentStream} matchName={meta.name} /></div>
            ) : (
              <div className="mp-player-wrap"><StreamWaiting matchName={meta.name} /></div>
            )}
          </>

          {/* Info + Sources */}
          <div className="mp-info-card flex flex-row items-center justify-between gap-3 md:gap-4">
            {/* Left: Badge & Label */}
            <div className="flex items-center gap-4 shrink-0">
              {matchStatus === 'in' && (
                <span className="mp-live-badge">
                  <span className="mp-live-dot" style={{ width: 6, height: 6 }} />LIVE
                </span>
              )}
              {isUpcoming && <span className="mp-pre-badge">Upcoming</span>}
              <p className="mp-sources-label hidden md:block">Available Broadcasts</p>
            </div>

            {/* Right: Sources */}
            <div className="flex-1 flex justify-end overflow-x-auto no-scrollbar">
              {allowedStreams.length === 0 ? (
                <p className="mp-sources-empty">No HD broadcasts available.</p>
              ) : (
                <div className="mp-sources-list flex w-max">
                  {allowedStreams.map((s: any, idx: number) => {
                    const active = selectedStreamIdx === idx;
                    const href = `/fsportz/match/${encodeURIComponent(matchId)}?source=${idx}&status=${matchStatus}&date=${encodeURIComponent(matchDate || '')}&name=${encodeURIComponent(meta.name)}`;
                    return (
                      <Link key={idx} href={href}
                        className={`mp-source-btn flex-none ${active ? 'mp-source-btn-active' : 'mp-source-btn-inactive'}`}>
                        <span className={`mp-source-name ${active ? 'mp-source-name-active' : 'mp-source-name-inactive'}`}>
                            {s.displayName}
                          </span>
                          <span className={`mp-quality-tag ${s.qualityLabel === 'FHD' ? 'mp-quality-fhd' : 'mp-quality-hd'}`}>
                            {s.qualityLabel}
                          </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
