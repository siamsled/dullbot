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

    let scrollPos = el.scrollLeft;

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    const handleTouchStart = () => { isPaused = true; };
    const handleTouchEnd = () => { isPaused = false; };
    const handleTouchCancel = () => { isPaused = false; };
    
    const handleScroll = () => {
      // Sync float tracker with physical position if changed by manual swipe/momentum
      if (Math.abs(el.scrollLeft - scrollPos) > 1.5) {
        scrollPos = el.scrollLeft;
      }
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchCancel);
    el.addEventListener('scroll', handleScroll);

    const tick = () => {
      if (!isPaused) {
        scrollPos += scrollSpeed;
        
        // Loop back seamlessly once we scroll past the first set of items
        const halfWidth = el.scrollWidth / 2;
        if (scrollPos >= halfWidth) {
          scrollPos = scrollPos - halfWidth;
        }
        el.scrollLeft = Math.round(scrollPos);
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
      el.removeEventListener('scroll', handleScroll);
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
