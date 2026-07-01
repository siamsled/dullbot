import React from 'react';
import { getFusedMatches } from '@/lib/fsportz';
import MatchCard from '@/components/fsportz/MatchCard';

export const revalidate = 30; // Fast revalidation for live scores

export default async function FSportzHome() {
  const matches = await getFusedMatches();

  const liveMatches = matches.filter(m => m.status === 'in');
  const upcomingMatches = matches.filter(m => m.status === 'pre');
  const completedMatches = matches.filter(m => m.status === 'post');

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-slate-900">
              F
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              FSportz <span className="text-emerald-400">Live</span>
            </span>
          </div>
          <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Powered by Real-Time Data
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* Live Section */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h2 className="text-2xl font-bold">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {liveMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Section */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-slate-200">Upcoming Matches</h2>
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
              {upcomingMatches.map(match => (
                <div key={match.id} className="snap-start">
                  <MatchCard match={match} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed Section */}
        {completedMatches.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-slate-200">Completed</h2>
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
              {completedMatches.map(match => (
                <div key={match.id} className="snap-start">
                  <MatchCard match={match} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}
