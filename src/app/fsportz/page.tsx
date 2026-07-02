import React from 'react';
import { getFusedMatches, getGroupStandings, getAllFixtures, FusedMatch, Group } from '@/lib/fsportz';
import MatchCard from '@/components/fsportz/MatchCard';
import Link from 'next/link';

export const revalidate = 60;

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

function formatDateKey(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function FixtureRow({ match, streamId }: { match: FusedMatch; streamId: string | null }) {
  const isLive = match.status === 'in';
  const isPost = match.status === 'post';
  const isPre = match.status === 'pre';
  const linkId = streamId || match.id;
  const matchName = `${match.team1.name} vs ${match.team2.name}`;

  const inner = (
    <div
      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-2xl transition-all ${
        isLive ? 'cursor-pointer' : isPre ? 'cursor-pointer' : ''
      }`}
      style={{
        background: isLive
          ? 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(17,28,19,0.6) 100%)'
          : isPre
          ? 'rgba(34,197,94,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: isLive
          ? '1px solid rgba(239,68,68,0.2)'
          : isPre
          ? '1px solid rgba(34,197,94,0.12)'
          : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Team 1 */}
      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
        <span className={`text-xs md:text-sm font-bold truncate ${isPost ? 'opacity-50' : 'text-white'}`}>
          {match.team1.name}
        </span>
        {match.team1.logo && (
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={match.team1.logo} alt="" className="w-5 h-5 object-contain" />
          </div>
        )}
      </div>

      {/* Center: score or time */}
      <div className="flex flex-col items-center min-w-[72px] flex-shrink-0">
        {isPost || isLive ? (
          <div className="flex items-center gap-2">
            <span className={`text-base font-black tabular-nums ${isPost ? 'opacity-50 text-white' : 'text-white'}`}>
              {match.team1.score}
            </span>
            <span className="text-xs font-black" style={{ color: isLive ? '#ef4444' : '#2d4a33' }}>
              {isLive ? '●' : '–'}
            </span>
            <span className={`text-base font-black tabular-nums ${isPost ? 'opacity-50 text-white' : 'text-white'}`}>
              {match.team2.score}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold" style={{ color: '#22c55e' }}>{formatTime(match.date)}</span>
        )}
        {isLive && (
          <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse" style={{ color: '#ef4444' }}>
            ● LIVE {match.statusDetail}
          </span>
        )}
        {isPost && (
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2d4a33' }}>
            {match.statusDetail}
          </span>
        )}
      </div>

      {/* Team 2 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {match.team2.logo && (
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={match.team2.logo} alt="" className="w-5 h-5 object-contain" />
          </div>
        )}
        <span className={`text-xs md:text-sm font-bold truncate ${isPost ? 'opacity-50' : 'text-white'}`}>
          {match.team2.name}
        </span>
        {isLive && (
          <span className="ml-auto flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            WATCH
          </span>
        )}
      </div>
    </div>
  );

  if (isLive || isPre) {
    return (
      <Link href={`/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(matchName)}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function GroupTable({ group }: { group: Group }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(34,197,94,0.06)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="font-black text-xs tracking-widest uppercase text-white">{group.name}</h3>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#2d4a33' }}>
          W<span className="hidden sm:inline"> D L GF GA</span> GD PTS
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {group.entries.map((entry, i) => (
          <div key={entry.team.name}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5"
            style={{ background: entry.advanced ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
            <span className={`w-4 text-center font-black text-xs`}
              style={{ color: i < 2 ? '#22c55e' : '#4b6e53' }}>{i + 1}</span>
            <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {entry.team.logo
                ? <img src={entry.team.logo} alt="" className="w-4 h-4 object-contain" />
                : <div className="w-3 h-3 rounded-full" style={{ background: '#1e3a22' }} />}
            </div>
            <span className="flex-1 text-xs font-semibold truncate text-white">{entry.team.name}</span>
            {entry.advanced && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full hidden sm:inline-block"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                ADV
              </span>
            )}
            <div className="flex gap-2 md:grid md:grid-cols-7 md:gap-2 text-[10px] font-mono items-center">
              <span className="w-3 text-center" style={{ color: '#4b6e53' }}>{entry.w}</span>
              <span className="w-3 text-center hidden sm:inline-block" style={{ color: '#4b6e53' }}>{entry.d}</span>
              <span className="w-3 text-center hidden sm:inline-block" style={{ color: '#4b6e53' }}>{entry.l}</span>
              <span className="w-4 text-center hidden sm:inline-block" style={{ color: '#2d4a33' }}>{entry.gf}</span>
              <span className="w-4 text-center hidden sm:inline-block" style={{ color: '#2d4a33' }}>{entry.ga}</span>
              <span className={`w-5 text-center ${Number(entry.gd) > 0 ? 'text-green-400' : Number(entry.gd) < 0 ? 'text-red-400' : ''}`}
                style={{ color: Number(entry.gd) === 0 ? '#4b6e53' : undefined }}>{entry.gd}</span>
              <span className="font-black text-white w-4 text-center">{entry.pts}</span>
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
  const upcomingMatches = fusedMatches.filter(m => m.status === 'pre');

  const stremioMap = new Map<string, string>();
  fusedMatches.forEach(m => {
    if (m.stremioId) {
      stremioMap.set(`${m.team1.name}|${m.team2.name}`, m.stremioId);
      stremioMap.set(`${m.team2.name}|${m.team1.name}`, m.stremioId);
    }
  });

  const enrichedFixtures = allFixtures.map(m => ({
    ...m,
    stremioId: stremioMap.get(`${m.team1.name}|${m.team2.name}`) || null,
  }));

  const sortedFixtures = [...enrichedFixtures].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const fixturesByDate = sortedFixtures.reduce((acc: Record<string, typeof sortedFixtures>, m) => {
    const key = formatDateKey(m.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const upcomingFixtureDates = Object.keys(fixturesByDate).filter(k =>
    fixturesByDate[k].some(m => m.status === 'pre' || m.status === 'in')
  );
  const pastFixtureDates = Object.keys(fixturesByDate).filter(k =>
    fixturesByDate[k].every(m => m.status === 'post')
  ).slice(-5);

  return (
    <main className="min-h-screen text-white selection:bg-green-500/30" style={{ background: '#0a1209', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(10,18,9,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#0a1209' }}>F</div>
            <span className="font-extrabold text-base tracking-tight">
              FSportz <span style={{ color: '#22c55e' }}>Live</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full animate-pulse"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {liveMatches.length} Live
              </div>
            )}
            <div className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
              FIFA World Cup 2026
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1209 0%, #0e1f11 40%, #0a1c0b 100%)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 120%, rgba(34,197,94,0.12) 0%, transparent 70%)' }} />
        {/* Decorative "26" */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 pointer-events-none select-none hidden md:flex">
          <span className="font-black leading-none opacity-[0.04]"
            style={{ fontSize: 'clamp(160px,20vw,280px)', color: '#22c55e', letterSpacing: '-0.04em' }}>26</span>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-5"
            style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Round of 32 — 2026 FIFA World Cup
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">
            Your FIFA <span style={{ color: '#22c55e' }}>HQ</span>
          </h1>
          <p className="mt-3 text-sm max-w-md" style={{ color: '#4b6e53' }}>
            Live scores, standings, fixtures & streams — everything for the 2026 World Cup.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-12">

        {/* LIVE NOW */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: '#ef4444' }}>Live Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {/* UP NEXT */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-5 text-white">Up Next</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {upcomingMatches.map(m => (
                <div key={m.id} className="snap-start flex-shrink-0">
                  <MatchCard match={m} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fixtures + Standings */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10 items-start">

          {/* Fixtures */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-5 text-white">All Fixtures</h2>
            <div className="space-y-6">
              {upcomingFixtureDates.map(dateKey => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
                      {dateKey}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                  <div className="space-y-2">
                    {fixturesByDate[dateKey].map(m => (
                      <FixtureRow key={m.id} match={m} streamId={m.stremioId} />
                    ))}
                  </div>
                </div>
              ))}

              {pastFixtureDates.length > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1" style={{ color: '#2d4a33' }}>
                      Completed
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                  {[...pastFixtureDates].reverse().map(dateKey => (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.03)', color: '#2d4a33', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {dateKey}
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                      <div className="space-y-2 opacity-50">
                        {fixturesByDate[dateKey].map(m => (
                          <FixtureRow key={m.id} match={m} streamId={m.stremioId} />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Group Standings */}
          <aside className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-5 text-white">Group Standings</h2>
            {groups.map(g => <GroupTable key={g.name} group={g} />)}
          </aside>
        </div>
      </div>
    </main>
  );
}
