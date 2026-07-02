import React from 'react';
import { getFusedMatches, getGroupStandings, getAllFixtures, FusedMatch, Group } from '@/lib/fsportz';
import MatchCard from '@/components/fsportz/MatchCard';
import Link from 'next/link';

export const revalidate = 60;

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMatchTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

function FixtureRow({ match, streamId }: { match: FusedMatch; streamId: string | null }) {
  const isLive = match.status === 'in';
  const isPost = match.status === 'post';
  const isPre = match.status === 'pre';

  const inner = (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-3 rounded-xl transition-all ${
      isLive 
        ? 'bg-red-500/5 border border-red-500/20 hover:bg-red-500/10' 
        : isPre 
          ? 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-emerald-500/30 cursor-pointer' 
          : 'bg-slate-800/20 border border-slate-800/50'
    }`}>
      {/* Team 1 */}
      <div className="flex items-center gap-1.5 md:gap-2 justify-end min-w-0">
        <span className={`text-xs md:text-sm font-bold truncate ${isPost ? 'text-slate-300' : 'text-white'}`}>{match.team1.name}</span>
        {match.team1.logo && <img src={match.team1.logo} alt={match.team1.name} className="w-4 h-4 md:w-6 md:h-6 object-contain flex-shrink-0" />}
      </div>

      {/* Score / Time */}
      <div className="flex flex-col items-center min-w-[80px]">
        {isPost || isLive ? (
          <div className="flex items-center gap-1.5 font-black text-lg tabular-nums">
            <span>{match.team1.score}</span>
            <span className="text-slate-500">-</span>
            <span>{match.team2.score}</span>
          </div>
        ) : (
          <span className="text-emerald-400 font-bold text-sm">{formatMatchTime(match.date)}</span>
        )}
        {isLive && (
          <span className="text-[10px] font-bold text-red-400 animate-pulse tracking-widest">● LIVE {match.statusDetail}</span>
        )}
        {isPost && (
          <span className="text-[10px] text-slate-500 font-semibold">{match.statusDetail}</span>
        )}
        {isPre && (
          <span className="text-[10px] text-slate-500 font-semibold">{formatMatchDate(match.date)}</span>
        )}
      </div>

      {/* Team 2 */}
      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
        {match.team2.logo && <img src={match.team2.logo} alt={match.team2.name} className="w-4 h-4 md:w-6 md:h-6 object-contain flex-shrink-0" />}
        <span className={`text-xs md:text-sm font-bold truncate ${isPost ? 'text-slate-300' : 'text-white'}`}>{match.team2.name}</span>
        {isLive && streamId && (
          <span className="ml-auto bg-red-500 text-white text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-md flex-shrink-0">WATCH</span>
        )}
        {isPre && streamId && (
          <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-md border border-emerald-500/20 flex-shrink-0">SET</span>
        )}
      </div>
    </div>
  );

  const linkId = streamId || match.id;
  if (isLive || isPre) {
    return (
      <Link href={`/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(match.team1.name + ' vs ' + match.team2.name)}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function GroupTable({ group }: { group: Group }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-sm md:text-base">
      <div className="bg-slate-800/60 px-3 md:px-4 py-3 flex items-center justify-between">
        <h3 className="font-black text-xs md:text-sm tracking-widest uppercase text-slate-200">{group.name}</h3>
        <span className="text-[9px] md:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          W<span className="hidden sm:inline"> D L GF GA</span> GD PTS
        </span>
      </div>
      <div className="divide-y divide-slate-800/50">
        {group.entries.map((entry, i) => (
          <div key={entry.team.name} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 ${entry.advanced ? 'bg-emerald-500/5' : ''}`}>
            <span className={`w-4 md:w-5 text-center font-black text-xs md:text-sm ${i < 2 ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
            {entry.team.logo 
              ? <img src={entry.team.logo} alt={entry.team.name} className="w-4 h-4 md:w-5 md:h-5 object-contain" />
              : <div className="w-4 h-4 md:w-5 md:h-5 rounded bg-slate-700" />
            }
            <span className="flex-1 text-xs md:text-sm font-semibold text-slate-200 truncate">{entry.team.name}</span>
            {entry.advanced && (
              <span className="text-[8px] md:text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1 md:px-1.5 py-0.5 rounded border border-emerald-500/20 mr-1 hidden sm:inline-block">ADV</span>
            )}
            <div className="flex gap-2 md:grid md:grid-cols-7 md:gap-2 text-[10px] md:text-xs font-mono text-right items-center">
              <span className="text-slate-400 w-3 text-center">{entry.w}</span>
              <span className="text-slate-400 w-3 text-center hidden sm:inline-block">{entry.d}</span>
              <span className="text-slate-400 w-3 text-center hidden sm:inline-block">{entry.l}</span>
              <span className="text-slate-500 w-4 text-center hidden sm:inline-block">{entry.gf}</span>
              <span className="text-slate-500 w-4 text-center hidden sm:inline-block">{entry.ga}</span>
              <span className={`w-5 text-center ${Number(entry.gd) > 0 ? 'text-emerald-400' : Number(entry.gd) < 0 ? 'text-red-400' : 'text-slate-400'}`}>{entry.gd}</span>
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

  // Build a lookup of stremio IDs by team name pairs
  const stremioMap = new Map<string, string>();
  fusedMatches.forEach(m => {
    if (m.stremioId) {
      stremioMap.set(`${m.team1.name}|${m.team2.name}`, m.stremioId);
      stremioMap.set(`${m.team2.name}|${m.team1.name}`, m.stremioId);
    }
  });

  // Enrich allFixtures with stremio IDs and group by date
  const enrichedFixtures = allFixtures.map(m => ({
    ...m,
    stremioId: stremioMap.get(`${m.team1.name}|${m.team2.name}`) || null,
  }));

  // Sort by date
  const sortedFixtures = [...enrichedFixtures].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by date string
  const fixturesByDate = sortedFixtures.reduce((acc: Record<string, typeof sortedFixtures>, m) => {
    const key = formatMatchDate(m.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const today = new Date().toDateString();
  const upcomingFixtureDates = Object.keys(fixturesByDate).filter(dateKey => {
    const matches = fixturesByDate[dateKey];
    return matches.some(m => m.status === 'pre');
  });
  const pastFixtureDates = Object.keys(fixturesByDate).filter(dateKey => {
    const matches = fixturesByDate[dateKey];
    return matches.every(m => m.status === 'post');
  }).slice(-5); // last 5 completed days

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-slate-900 text-sm">F</div>
            <span className="font-extrabold text-lg tracking-tight">FSportz <span className="text-emerald-400">Live</span></span>
          </div>
          <div className="flex items-center gap-3">
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                {liveMatches.length} Live
              </div>
            )}
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hidden sm:block">
              FIFA World Cup 2026
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-400 mb-4 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Round of 32 — 2026 FIFA World Cup
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            Your FIFA <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">HQ</span>
          </h1>
          <p className="mt-3 text-slate-400 max-w-lg mx-auto text-sm">
            Live scores, full standings, fixtures & streams — everything you need to follow the 2026 World Cup.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-16">

        {/* LIVE SECTION */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h2 className="text-xl font-black uppercase tracking-widest text-red-400">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {liveMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* UPCOMING MATCH CARDS */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300 mb-6">Up Next</h2>
            <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
              {upcomingMatches.map(match => (
                <div key={match.id} className="snap-start flex-shrink-0">
                  <MatchCard match={match} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MAIN LAYOUT: Fixtures + Standings */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-10 items-start">

          {/* LEFT: All Fixtures by date */}
          <section>
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300 mb-6">All Fixtures</h2>
            <div className="space-y-8">
              
              {/* Upcoming fixtures */}
              {upcomingFixtureDates.map(dateKey => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{dateKey}</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                  </div>
                  <div className="space-y-2">
                    {fixturesByDate[dateKey].map(m => (
                      <FixtureRow key={m.id} match={m} streamId={m.stremioId} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Completed fixtures */}
              {pastFixtureDates.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Completed</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                  </div>
                  {[...pastFixtureDates].reverse().map(dateKey => (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">{dateKey}</span>
                        <div className="flex-1 h-px bg-slate-800"></div>
                      </div>
                      <div className="space-y-2 opacity-70">
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

          {/* RIGHT: Group Standings */}
          <aside className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300 mb-6">Group Standings</h2>
            {groups.map(group => (
              <GroupTable key={group.name} group={group} />
            ))}
          </aside>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}
