'use client';

import React, { useEffect, useRef } from 'react';

export type AIState = 'idle' | 'listening' | 'thinking' | 'streaming' | 'done' | 'error';

export function useSimulatedAmplitude(state: AIState) {
  const [amplitude, setAmplitude] = React.useState(0.2);

  React.useEffect(() => {
    let interval: any;
    if (state === 'listening') {
      interval = setInterval(() => {
        setAmplitude(0.3 + Math.random() * 0.5);
      }, 120);
    } else if (state === 'thinking') {
      interval = setInterval(() => {
        setAmplitude(0.4 + Math.sin(Date.now() / 200) * 0.3);
      }, 80);
    } else if (state === 'streaming') {
      interval = setInterval(() => {
        setAmplitude(0.5 + Math.random() * 0.4);
      }, 100);
    } else {
      setAmplitude(0.2);
    }
    return () => clearInterval(interval);
  }, [state]);

  return amplitude;
}

export function useAudioAmplitude() {
  return { amplitude: 0.2, status: 'idle' as const, start: () => {}, stop: () => {} };
}

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

export interface SiriOrbProps {
  animationDuration?: number;
  className?: string;
  colors?: {
    bg?: string;
    c1?: string;
    c2?: string;
    c3?: string;
  };
  size?: string;
  state?: AIState;
  amplitude?: number;
}

export const SiriOrb: React.FC<SiriOrbProps> = ({
  size = '36px',
  className,
  state = 'idle',
  amplitude = 0.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const parsedSize = parseFloat(size) || 36;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : parsedSize;
      const height = rect.height > 0 ? rect.height : parsedSize;
      const dpr = Math.min(window.devicePixelRatio || 2, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = width * 0.36;

      const speedMult = state === 'listening' ? 1.8 : state === 'thinking' ? 1.4 : state === 'streaming' ? 2.2 : 0.9;
      time += 0.015 * speedMult;

      // Draw non-round organic gaseous star flares & plasma surface layers
      const layers = 5;

      for (let l = 0; l < layers; l++) {
        const layerRatio = (l + 1) / layers;
        const layerRadius = baseRadius * (0.4 + layerRatio * 0.6);
        const alpha = 0.35 + (1 - layerRatio) * 0.55;

        ctx.beginPath();
        const pointsCount = 72;

        for (let i = 0; i <= pointsCount; i++) {
          const angle = (i / pointsCount) * Math.PI * 2;

          // Solar noise displacement for coronal flares & wavy organic non-round contour
          const n1 = Math.sin(angle * 4 + time * 1.5 + l * 0.8);
          const n2 = Math.cos(angle * 7 - time * 2.1 + l * 1.2);
          const n3 = Math.sin(angle * 11 + time * 2.8);
          const flare = 0.15 * n1 + 0.1 * n2 + 0.06 * n3 + (amplitude * 0.12 * Math.sin(angle * 5 + time * 4));

          const r = layerRadius * (1 + flare);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Color palette: Pure Magenta & Purple gradients ONLY (no black, no bright blue, no hot pink)
        const radGrad = ctx.createRadialGradient(
          centerX - baseRadius * 0.15,
          centerY - baseRadius * 0.15,
          0,
          centerX,
          centerY,
          layerRadius * 1.25
        );

        if (state === 'error') {
          radGrad.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);
          radGrad.addColorStop(0.6, `rgba(185, 28, 28, ${alpha * 0.7})`);
          radGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
        } else {
          // Luminous Lavender/Magenta core -> Rich Pure Magenta -> Royal Purple -> Deep Violet edge fade
          radGrad.addColorStop(0, `rgba(232, 121, 249, ${alpha})`);      // Luminous Lavender Magenta (#e879f9)
          radGrad.addColorStop(0.4, `rgba(217, 70, 239, ${alpha * 0.95})`);  // Pure Magenta (#d946ef)
          radGrad.addColorStop(0.75, `rgba(139, 92, 246, ${alpha * 0.7})`);  // Royal Violet Purple (#8b5cf6)
          radGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');                 // Deep Purple transparent fade (#581c87)
        }

        ctx.fillStyle = radGrad;
        ctx.fill();
      }

      // Add gaseous solar surface plasma dots
      const particleCount = 180;
      for (let p = 0; p < particleCount; p++) {
        const pAngle = (p / particleCount) * Math.PI * 2 + Math.sin(p + time * 0.5);
        const pDistRatio = 0.2 + 0.75 * Math.abs(Math.sin(p * 12.3 + time * 0.8));

        const pNoise = Math.sin(pAngle * 5 + time * 2.0) * 0.15;
        const pr = baseRadius * pDistRatio * (1 + pNoise);

        const px = centerX + Math.cos(pAngle) * pr;
        const py = centerY + Math.sin(pAngle) * pr;
        const pSize = Math.max(0.5, width * (0.012 + 0.015 * Math.sin(p + time * 3)));
        const pAlpha = Math.max(0.1, 0.8 * (1 - pDistRatio) * (0.6 + 0.4 * Math.sin(p * 3 + time * 2)));

        // Pure Magenta & Purple plasma particles
        const pColor = p % 2 === 0 ? `rgba(232, 121, 249, ${pAlpha.toFixed(2)})` : `rgba(192, 132, 252, ${pAlpha.toFixed(2)})`;
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, amplitude, size]);

  return (
    <div
      aria-label={`AI State: ${state}`}
      className={cn('relative flex items-center justify-center shrink-0 bg-transparent', className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, background: 'transparent' }}
        className="w-full h-full block bg-transparent pointer-events-none"
      />
    </div>
  );
};

export default SiriOrb;
