'use client';
import { useEffect, useRef } from 'react';

export default function FootballCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const positionRef = useRef({ x: -100, y: -100 });
  const isClickingRef = useRef(false);

  useEffect(() => {
    // Inject a global style to hide the default cursor everywhere
    const style = document.createElement('style');
    style.innerHTML = `
      * { cursor: none !important; }
    `;
    document.head.appendChild(style);

    let animationFrameId: number;

    const updateCursor = () => {
      if (cursorRef.current) {
        // Add a slight spin based on horizontal movement
        const scale = isClickingRef.current ? 0.6 : 1;
        
        cursorRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0) translate(-50%, -50%)`;
        cursorRef.current.style.scale = scale.toString();
        cursorRef.current.style.rotate = `${rotationRef.current}deg`;
      }
      animationFrameId = requestAnimationFrame(updateCursor);
    };

    updateCursor();

    const onMouseMove = (e: MouseEvent) => {
      // Calculate delta for rotation spin
      const dx = e.movementX;
      rotationRef.current += dx * 0.5; // spin amount based on mouse speed
      positionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseDown = () => {
      isClickingRef.current = true;
    };
    
    const onMouseUp = () => {
      isClickingRef.current = false;
    };

    const onMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
    };
    
    const onMouseEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animationFrameId);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        pointerEvents: 'none', // Critical so clicks pass through!
        zIndex: 99999,
        fontSize: '26px',
        lineHeight: 1,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
        transition: 'scale 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s',
        willChange: 'transform, scale, rotate',
        opacity: 0, // start hidden until mouse enters
      }}
    >
      ⚽
    </div>
  );
}
