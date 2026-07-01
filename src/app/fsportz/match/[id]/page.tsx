import React from 'react';
import { getMeta, getStreams } from '@/lib/fsportz';
import HlsPlayer from '@/components/fsportz/HlsPlayer';
import MatchCountdown from '@/components/fsportz/MatchCountdown';
import Link from 'next/link';
import { ArrowLeft, MonitorPlay } from 'lucide-react';

export default async function MatchPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ source?: string, status?: string, date?: string }> }) {
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

  // Filter for specific English (TSN 4) and Spanish (TELEMUNDO) broadcasts, and ensure they are HD or FHD
  const allowedStreams = streams.filter(s => {
    const name = s.name?.toUpperCase() || '';
    const title = s.title || '';
    const isTargetLanguage = name.includes('TELEMUNDO') || name.includes('TSN 4');
    const isHighQuality = title.includes('1080') || title.includes('720');
    return isTargetLanguage && isHighQuality;
  }).map(s => {
    const name = s.name?.toUpperCase() || '';
    const is1080 = s.title?.includes('1080');
    return {
      ...s,
      displayName: name.includes('TELEMUNDO') ? 'Spanish' : 'English',
      quality: is1080 ? '1080p' : '720p',
      qualityLabel: is1080 ? 'FHD' : 'HD'
    };
  });

  const selectedStreamIdx = searchParams.source ? parseInt(searchParams.source, 10) : 0;
  const currentStream = allowedStreams[selectedStreamIdx] || allowedStreams[0];

  const matchStatus = searchParams.status;
  const matchDate = searchParams.date;
  const isUpcoming = matchStatus === 'pre' && matchDate;

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

      <div className="flex-1 max-w-5xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-8">
        
        {/* Player & Info Section */}
        <div className="flex flex-col gap-4">
          {isUpcoming ? (
            <MatchCountdown targetDate={matchDate} stream={currentStream} />
          ) : currentStream ? (
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
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black">{meta.name}</h1>
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-red-400 text-xs font-bold tracking-widest uppercase">Live</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-2">{meta.description}</p>
          </div>
        </div>

        {/* Sources List (Moved below player) */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            Available Broadcasts
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedStreams.length === 0 && <p className="text-slate-500 text-sm">No HD broadcasts available.</p>}
            
            {allowedStreams.map((stream: any, idx: number) => {
              const isSelected = selectedStreamIdx === idx;
              return (
                <Link 
                  key={idx} 
                  href={`/fsportz/match/${encodeURIComponent(matchId)}?source=${idx}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {stream.displayName.charAt(0)}
                    </div>
                    <span className="font-bold tracking-wide">{stream.displayName}</span>
                  </div>
                  <div className={`text-xs font-black px-2 py-1 rounded-md ${
                    stream.qualityLabel === 'FHD' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                  }`}>
                    {stream.qualityLabel}
                  </div>
                </Link>
              );
            })}
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
