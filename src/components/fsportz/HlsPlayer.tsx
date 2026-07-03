'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { RefreshCw } from 'lucide-react';

export default function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true,
      });
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("Autoplay blocked:", e));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("fatal network error encountered, try to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("fatal media error encountered, try to recover");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log("Autoplay blocked:", e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
      
      <button 
        onClick={() => window.location.reload()}
        className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/80 backdrop-blur-md text-white/60 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 border border-white/10"
        title="Reload Stream"
      >
        <RefreshCw size={18} />
      </button>

      <video
        ref={videoRef}
        controls
        autoPlay
        className="w-full h-full live-video-player"
        playsInline
        crossOrigin="anonymous"
      />
      
      {/* CSS to hide native timeline controls for a broadcast feel */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Webkit / Chrome / Safari */
        .live-video-player::-webkit-media-controls-timeline,
        .live-video-player::-webkit-media-controls-current-time-display,
        .live-video-player::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }
      `}} />
    </div>
  );
}
