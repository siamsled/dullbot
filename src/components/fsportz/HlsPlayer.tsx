'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { RefreshCw } from 'lucide-react';

export default function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true,
      });
      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("Autoplay blocked:", e));
        setIsReloading(false);
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
        setIsReloading(false);
      }, { once: true });
    }
  };

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  const handleReload = () => {
    setIsReloading(true);
    const video = videoRef.current;
    if (video) {
      // Call play() synchronously during the user click event to unlock browser autoplay restrictions
      video.play().catch(() => {});
      
      const wasMuted = video.muted;
      initPlayer();
      video.muted = wasMuted;
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0a0a0a]">
      {/* Header bar above player */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-white/5">
        <button 
          onClick={handleReload}
          disabled={isReloading}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 border ${isReloading ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/80 hover:text-white shadow-[0_0_10px_rgba(255,255,255,0.02)]'}`}
          title="Reload Stream"
        >
          <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
          {isReloading ? 'Reloading...' : 'Reload Stream'}
        </button>
      </div>

      <div className="relative w-full aspect-video bg-black">
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
    </div>
  );
}
