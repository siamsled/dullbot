import React from 'react';
import { getMeta, getStreams } from '@/lib/fsportz';
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
  let [meta, streams] = await Promise.all([getMeta(matchId), getStreams(matchId)]);

  const matchStatus = searchParams.status;
  const matchDate = searchParams.date;
  const matchName = searchParams.name;
  const isUpcoming = matchStatus === 'pre' && matchDate;

  if (!meta && (isUpcoming || matchStatus === 'in') && matchName) {
    meta = {
      id: matchId,
      type: 'sport',
      name: matchName,
      poster: '',
      posterShape: 'landscape',
      background: '',
      genres: [],
      description: 'Live broadcast will be available when the match starts.',
      releaseInfo: '',
    };
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1209' }}>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Match Not Found</h2>
          <p className="text-sm mb-6" style={{ color: '#4b6e53' }}>The requested match data could not be loaded.</p>
          <Link href="/fsportz"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            ← Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

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
      qualityLabel: is1080 ? 'FHD' : 'HD',
    };
  });

  const selectedStreamIdx = searchParams.source ? parseInt(searchParams.source, 10) : 0;
  const currentStream = allowedStreams[selectedStreamIdx] || allowedStreams[0];

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a1209', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <header className="shrink-0 backdrop-blur-xl"
        style={{ background: 'rgba(10,18,9,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/fsportz"
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: '#4b6e53' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
            onMouseOut={e => (e.currentTarget.style.color = '#4b6e53')}>
            <ArrowLeft className="w-4 h-4" />
            Back to Matches
          </Link>
          <div className="flex items-center gap-2.5 font-bold text-sm text-white">
            {matchStatus === 'in' && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            )}
            <span className="truncate max-w-[200px] md:max-w-none">{meta.name}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* Player */}
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          {isUpcoming ? (
            <MatchCountdown targetDate={matchDate!} stream={currentStream} matchName={meta.name} />
          ) : currentStream ? (
            <HlsPlayer src={currentStream.url} />
          ) : (
            <StreamWaiting matchName={meta.name} />
          )}
        </div>

        {/* Match info + source selector */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{meta.name}</h1>
            {matchStatus === 'in' && (
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />LIVE
              </span>
            )}
            {isUpcoming && (
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                Upcoming
              </span>
            )}
          </div>
          <p className="text-sm mb-5" style={{ color: '#4b6e53' }}>{meta.description}</p>

          {/* Sources */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#2d4a33' }}>
              Available Broadcasts
            </p>
            {allowedStreams.length === 0 ? (
              <p className="text-sm" style={{ color: '#2d4a33' }}>No HD broadcasts available.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {allowedStreams.map((stream: any, idx: number) => {
                  const isSelected = selectedStreamIdx === idx;
                  return (
                    <Link
                      key={idx}
                      href={`/fsportz/match/${encodeURIComponent(matchId)}?source=${idx}&status=${matchStatus}&date=${encodeURIComponent(matchDate || '')}&name=${encodeURIComponent(meta.name)}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: isSelected ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isSelected ? '0 0 20px rgba(34,197,94,0.08)' : 'none',
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                        style={{
                          background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#22c55e' : '#4b6e53',
                        }}>
                        {stream.displayName.charAt(0)}
                      </div>
                      <span className="font-bold text-sm" style={{ color: isSelected ? '#22c55e' : '#9ca3af' }}>
                        {stream.displayName}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md"
                        style={{
                          background: stream.qualityLabel === 'FHD'
                            ? 'rgba(251,191,36,0.1)' : 'rgba(59,130,246,0.1)',
                          color: stream.qualityLabel === 'FHD' ? '#fbbf24' : '#60a5fa',
                          border: stream.qualityLabel === 'FHD'
                            ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(59,130,246,0.2)',
                        }}>
                        {stream.qualityLabel}
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
  );
}
