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
    // Keep volume state across reload
    const wasMuted = videoRef.current?.muted ?? true;
    initPlayer();
    if (videoRef.current) videoRef.current.muted = wasMuted;
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      
      <button 
        onClick={handleReload}
        disabled={isReloading}
        className={`absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/90 hover:text-white rounded-lg transition-all duration-200 border border-white/20 ${isReloading ? 'opacity-50 cursor-not-allowed' : 'opacity-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
        title="Reload Stream"
      >
        <RefreshCw size={20} className={isReloading ? 'animate-spin' : ''} />
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
