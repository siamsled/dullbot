'use client';

import React, { useRef, useState, useEffect } from 'react';
import MatchCard from './MatchCard';
import { FusedMatch } from '@/lib/fsportz';

export default function UpNextCarousel({ matches }: { matches: FusedMatch[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [posX, setPosX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollSpeed = 0.20; // Calm, slow auto-scroll speed (pixels per frame)

  const dragStart = useRef(0);
  const dragStartPosX = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  const totalMatches = matches.length;

  useEffect(() => {
    if (totalMatches === 0) return;

    const tick = () => {
      if (!isDragging) {
        setPosX(prev => {
          let next = prev - scrollSpeed;
          
          if (trackRef.current) {
            // Because we duplicated the list, half the scrollWidth is one full cycle
            const halfWidth = trackRef.current.scrollWidth / 2;
            if (Math.abs(next) >= halfWidth) {
              next = next + halfWidth;
            }
          }
          return next;
        });
      }
      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isDragging, totalMatches]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStart.current = e.touches[0].clientX;
    dragStartPosX.current = posX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - dragStart.current;
    let nextX = dragStartPosX.current + deltaX;

    if (trackRef.current) {
      const halfWidth = trackRef.current.scrollWidth / 2;
      if (nextX > 0) {
        nextX = nextX - halfWidth;
      } else if (Math.abs(nextX) >= halfWidth) {
        nextX = nextX + halfWidth;
      }
    }
    setPosX(nextX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse handlers for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = e.clientX;
    dragStartPosX.current = posX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current;
    let nextX = dragStartPosX.current + deltaX;

    if (trackRef.current) {
      const halfWidth = trackRef.current.scrollWidth / 2;
      if (nextX > 0) {
        nextX = nextX - halfWidth;
      } else if (Math.abs(nextX) >= halfWidth) {
        nextX = nextX + halfWidth;
      }
    }
    setPosX(nextX);
  };

  return (
    <div 
      ref={containerRef}
      className="fs-carousel-viewport"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div 
        ref={trackRef}
        className="fs-carousel-track"
        style={{ transform: `translate3d(${posX}px, 0, 0)` }}
      >
        {matches.map(m => (
          <MatchCard key={m.id} match={m} />
        ))}
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
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          cursor: grab;
          user-select: none;
        }
        .fs-carousel-viewport:active {
          cursor: grabbing;
        }
        
        .fs-carousel-track {
          display: flex;
          gap: 14px;
          width: max-content;
          padding-top: 16px;
          padding-bottom: 36px;
          will-change: transform;
          padding-left: max(20px, calc((100vw - 1240px) / 2));
        }
      `}</style>
    </div>
  );
}
