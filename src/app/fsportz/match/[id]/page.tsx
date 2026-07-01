import React from 'react';
import { getMeta, getStreams } from '@/lib/fsportz';
import HlsPlayer from '@/components/fsportz/HlsPlayer';
import Link from 'next/link';
import { ArrowLeft, MonitorPlay } from 'lucide-react';

export default async function MatchPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ source?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const matchId = decodeURIComponent(params.id);
  const [meta, streams] = await Promise.all([
    getMeta(matchId),
    getStreams(matchId)
  ]);

  if (!meta) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <Link href="/fsportz" className="text-emerald-400 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  // Filter web-ready streams (or just use all since Hls.js can handle most)
  // But Stremio hints 'notWebReady' for some
  const webStreams = streams.filter(s => !s.behaviorHints?.notWebReady);
  const selectedStreamIdx = searchParams.source ? parseInt(searchParams.source, 10) : 0;
  const currentStream = webStreams[selectedStreamIdx] || webStreams[0] || streams[0];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/fsportz" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Matches</span>
          </Link>
          <div className="font-bold">{meta.name}</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Player Section (Takes up 2 cols on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {currentStream ? (
            <HlsPlayer src={currentStream.url} />
          ) : (
            <div className="w-full aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
              <div className="text-slate-500 text-center">
                <MonitorPlay className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No playable streams found for this match right now.</p>
                <p className="text-sm mt-1">Please try again closer to kickoff.</p>
              </div>
            </div>
          )}

          <div>
            <h1 className="text-3xl font-extrabold">{meta.name}</h1>
            <p className="text-slate-400 mt-2">{meta.description}</p>
          </div>
        </div>

        {/* Sidebar / Sources List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Available Sources
          </h3>
          
          <div className="space-y-3">
            {webStreams.length === 0 && <p className="text-slate-500 text-sm">No web-ready sources yet.</p>}
            
            {webStreams.map((stream, idx) => (
              <Link 
                key={idx} 
                href={`/fsportz/match/${encodeURIComponent(matchId)}?source=${idx}`}
                className={`block p-4 rounded-xl border transition-all ${
                  selectedStreamIdx === idx 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold">{stream.name || `Source ${idx + 1}`}</div>
                {stream.title && (
                  <div className="text-xs mt-1 opacity-70 line-clamp-1">{stream.title}</div>
                )}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
