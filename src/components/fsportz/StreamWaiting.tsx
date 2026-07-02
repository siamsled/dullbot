'use client';

import React, { useEffect } from 'react';

export default function StreamWaiting({ matchName }: { matchName: string }) {
  useEffect(() => {
    const timer = setTimeout(() => window.location.reload(), 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="sw-root">
      <div className="sw-bg" />
      <div className="sw-noise" />

      {/* Animated radar rings */}
      <div className="sw-radar">
        {[0,1,2,3].map(i => (
          <div key={i} className="sw-ring" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <div className="sw-radar-dot" />
      </div>

      <div className="sw-content">
        <div className="sw-title">Stream Loading</div>
        <p className="sw-body">
          Waiting for <strong>{matchName}</strong> broadcast<br />
          <span>Auto-refreshing in 30 seconds</span>
        </p>
        <button className="sw-btn" onClick={() => window.location.reload()}>
          <span className="sw-btn-icon">↻</span>
          Refresh Now
        </button>
      </div>

      <style>{`
        .sw-root {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }
        .sw-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 100% 100% at 50% 50%, #071a0a 0%, #040c06 70%, #000 100%);
        }
        .sw-noise {
          position: absolute; inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px;
        }
        .sw-radar {
          position: absolute;
          width: clamp(160px,30vw,260px);
          height: clamp(160px,30vw,260px);
          display: flex; align-items: center; justify-content: center;
        }
        .sw-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(34,197,94,0.2);
          animation: radarExpand 2.4s ease-out infinite;
        }
        @keyframes radarExpand {
          0%   { width: 0; height: 0; opacity: 0.8; border-color: rgba(34,197,94,0.5); }
          100% { width: 260px; height: 260px; opacity: 0; border-color: rgba(34,197,94,0); }
        }
        .sw-radar-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 20px 6px rgba(34,197,94,0.4);
          animation: dotPulse2 1.5s ease-in-out infinite;
          position: relative; z-index: 2;
        }
        @keyframes dotPulse2 {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px 6px rgba(34,197,94,0.4); }
          50% { transform: scale(0.7); box-shadow: 0 0 10px 3px rgba(34,197,94,0.2); }
        }
        .sw-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          text-align: center; padding: 24px;
        }
        .sw-title {
          font-size: clamp(18px, 3vw, 28px);
          font-weight: 900; color: #fff;
          letter-spacing: -0.02em;
          text-shadow: 0 0 40px rgba(34,197,94,0.3);
        }
        .sw-body {
          font-size: clamp(12px, 1.5vw, 15px);
          color: rgba(255,255,255,0.3);
          line-height: 1.7; margin: 0;
        }
        .sw-body strong { color: rgba(255,255,255,0.6); font-weight: 600; }
        .sw-body span { font-size: 0.85em; color: rgba(34,197,94,0.4); }
        .sw-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 99px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.25);
          color: #22c55e; font-weight: 700; font-size: 13px;
          cursor: pointer; transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .sw-btn:hover {
          background: rgba(34,197,94,0.15);
          border-color: rgba(34,197,94,0.5);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(34,197,94,0.1);
        }
        .sw-btn-icon { font-size: 16px; display: inline-block; transition: transform 0.3s; }
        .sw-btn:hover .sw-btn-icon { transform: rotate(180deg); }
      `}</style>
    </div>
  );
}
