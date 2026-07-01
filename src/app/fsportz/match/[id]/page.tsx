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

  // Filter for specific English (TSN 4) and Spanish (TELEMUNDO) broadcasts
  const allowedStreams = streams.filter(s => {
    const name = s.name?.toUpperCase() || '';
    return name.includes('TELEMUNDO') || name.includes('TSN 4');
  }).map(s => {
    const name = s.name?.toUpperCase() || '';
    return {
      ...s,
      displayName: name.includes('TELEMUNDO') ? 'Spanish' : 'English'
    };
  });

  const selectedStreamIdx = searchParams.source ? parseInt(searchParams.source, 10) : 0;
  const currentStream = allowedStreams[selectedStreamIdx] || allowedStreams[0];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/fsportz" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Matches</span>
          </Link>
          <div className="font-bold flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             {meta.name}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Player Section */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {currentStream ? (
            <HlsPlayer src={currentStream.url} />
          ) : (
            <div className="w-full aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-2xl">
              <div className="text-slate-500 text-center">
                <MonitorPlay className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No streams available yet.</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <h1 className="text-2xl font-black">{meta.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{meta.description}</p>
          </div>
        </div>

        {/* Sources List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-fit max-h-[600px] overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Available Sources
          </h3>
          
          <div className="space-y-2">
            {allowedStreams.length === 0 && <p className="text-slate-500 text-sm px-2">Waiting for streams...</p>}
            
            {allowedStreams.map((stream, idx) => (
              <Link 
                key={idx} 
                href={`/fsportz/match/${encodeURIComponent(matchId)}?source=${idx}`}
                className={`block p-3 rounded-xl border transition-all ${
                  selectedStreamIdx === idx 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-800/30 border-transparent hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{(stream as any).displayName}</div>
                {stream.title && (
                  <div className="text-xs mt-1 opacity-60 line-clamp-1">{stream.title}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </main>
  );
}
