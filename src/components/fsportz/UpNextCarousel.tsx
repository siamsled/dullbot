'use client';

import React, { useState } from 'react';
import MatchCard from './MatchCard';
import { FusedMatch } from '@/lib/fsportz';

export default function UpNextCarousel({ matches }: { matches: FusedMatch[] }) {
  const [paused, setPaused] = useState(false);

  if (matches.length === 0) return null;

  return (
    <div 
      className="fs-carousel-viewport"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div 
        className="fs-carousel-track"
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
      >
        {matches.map(m => (
          <MatchCard key={m.id} match={m} />
        ))}
        {/* Seamless loop duplication */}
        {matches.map(m => (
          <MatchCard key={`${m.id}-dup`} match={m} />
        ))}
      </div>

      <style>{`
        .fs-carousel-viewport {
          overflow: hidden;
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          /* Mask edges for premium fade effect */
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        
        .fs-carousel-track {
          display: flex;
          gap: 14px;
          width: max-content;
          padding-top: 16px;
          padding-bottom: 36px;
          /* hardware accelerated translate */
          transform: translate3d(0, 0, 0);
          animation: fsMarquee 25s linear infinite;
          padding-left: max(20px, calc((100vw - 1240px) / 2));
        }

        @keyframes fsMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            /* Since we duplicated the list exactly, translating by half of the scrollWidth is perfectly seamless */
            transform: translate3d(calc(-50% - 7px), 0, 0); /* half of gap is 7px */
          }
        }
      `}</style>
    </div>
  );
}
