'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

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
      
      {/* Broadcaster Logo Obfuscation (Sharp edge, extended left) */}
      <div className="absolute top-0 right-0 w-[35%] h-[15%] backdrop-blur-xl bg-black/10 z-10 pointer-events-none rounded-bl-2xl shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" />

      <video
        ref={videoRef}
        controls
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
