'use client';

import React, { useRef, useEffect } from 'react';
import MatchCard from './MatchCard';
import { FusedMatch } from '@/lib/fsportz';

export default function UpNextCarousel({ matches }: { matches: FusedMatch[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matches.length === 0) return;

    let animationFrameId: number;
    const scrollSpeed = 0.35; // Pixels per frame (very slow and smooth)
    let isPaused = false;

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    const handleTouchStart = () => { isPaused = true; };
    const handleTouchEnd = () => { isPaused = false; };
    const handleTouchCancel = () => { isPaused = false; };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchCancel);

    const tick = () => {
      if (!isPaused) {
        el.scrollLeft += scrollSpeed;
        
        // Loop back seamlessly once we scroll past the first set of items
        const halfWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= halfWidth) {
          el.scrollLeft = el.scrollLeft - halfWidth;
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [matches]);

  return (
    <div ref={ref} className="fs-carousel">
      {matches.map(m => (
        <MatchCard key={m.id} match={m} />
      ))}
      {/* Seamless loop duplication */}
      {matches.map(m => (
        <MatchCard key={`${m.id}-dup`} match={m} />
      ))}
    </div>
  );
}
