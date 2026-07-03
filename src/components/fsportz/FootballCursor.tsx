'use client';
import { useEffect, useState } from 'react';

export default function FootballCursor() {
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    // Inject a global style to use a native CSS cursor
    // This is hardware accelerated, 0 lag, and doesn't freeze over iframes/video players!
    const style = document.createElement('style');
    style.innerHTML = `
      * { 
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" style="font-size:26px;"><text y="24">⚽</text></svg>') 16 16, auto !important; 
      }
      .fs-click-effect {
        position: fixed;
        pointer-events: none;
        z-index: 99999;
        font-size: 26px;
        line-height: 1;
        transform: translate(-50%, -50%);
        animation: kickBounce 0.4s ease-out forwards;
      }
      @keyframes kickBounce {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        50% { transform: translate(-50%, -150%) scale(1.2) rotate(180deg); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1) rotate(360deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const onMouseDown = (e: MouseEvent) => {
      const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
      setClicks(prev => [...prev, newClick]);
      
      // Cleanup the effect element after animation completes
      setTimeout(() => {
        setClicks(prev => prev.filter(c => c.id !== newClick.id));
      }, 400);
    };

    window.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {clicks.map(click => (
        <div
          key={click.id}
          className="fs-click-effect"
          style={{ left: click.x, top: click.y }}
        >
          ⚽
        </div>
      ))}
    </>
  );
}
