'use client';

import React, { useEffect, useRef, useMemo } from 'react';

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

interface SiriOrbProps {
  amplitude?: number;
  size?: string;
  state?: AIState;
  className?: string;
}

interface Point3D {
  ux: number;
  uy: number;
  uz: number;
  phi: number;
  theta: number;
}

export default function SiriOrb({
  amplitude = 0.2,
  size = '36px',
  state = 'idle',
  className = '',
}: SiriOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate 3D sphere grid points (staggered ring lattice for uniform organic dot texture)
  const points = useMemo<Point3D[]>(() => {
    const pts: Point3D[] = [];
    const rings = 40;
    const pointsPerRing = 52;

    for (let i = 0; i < rings; i++) {
      const theta = ((i + 0.5) / rings - 0.5) * Math.PI; // -PI/2 to PI/2
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const ringPoints = Math.max(6, Math.floor(pointsPerRing * cosTheta));

      for (let j = 0; j < ringPoints; j++) {
        const phi = (j / ringPoints) * 2 * Math.PI + (i * 0.37); // offset phi per ring for lattice
        pts.push({
          ux: cosTheta * Math.cos(phi),
          uy: sinTheta,
          uz: cosTheta * Math.sin(phi),
          phi,
          theta,
        });
      }
    }
    return pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || parseFloat(size) || 36;
      const height = rect.height || parseFloat(size) || 36;
      const dpr = window.devicePixelRatio || 2;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = width * 0.38;

      // Speed & noise multipliers based on AIState
      const speedMult = state === 'listening' ? 1.8 : state === 'thinking' ? 1.5 : state === 'streaming' ? 2.2 : 0.85;
      const ampMult = state === 'listening' ? 1.4 : state === 'streaming' ? 1.6 : 1.0;
      time += 0.014 * speedMult;

      // Rotations around Y and subtle tilt on X & Z
      const rotY = time * 0.35;
      const rotX = Math.sin(time * 0.2) * 0.25 + 0.15;
      const rotZ = Math.cos(time * 0.15) * 0.1;

      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);
      const sinZ = Math.sin(rotZ), cosZ = Math.cos(rotZ);

      const projected = [];

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Organic multi-harmonic wave displacement (creates the wavy deformed non-spherical blob)
        const w1 = Math.sin(2.2 * pt.ux + time * 1.3) * Math.cos(2.0 * pt.uy - time * 0.9);
        const w2 = Math.cos(3.1 * pt.uy + time * 1.6) * Math.sin(2.8 * pt.uz + time * 1.1);
        const w3 = Math.sin(4.2 * pt.ux - time * 1.0) * Math.cos(3.8 * pt.uz + time * 1.4);
        const w4 = Math.sin(5.5 * pt.phi + time * 2.0) * 0.5;

        const displacement = (0.18 * w1 + 0.14 * w2 + 0.09 * w3 + 0.05 * w4 + (amplitude * 0.22 * ampMult * Math.sin(4 * pt.uy + time * 3)));
        const radius = baseRadius * (1 + displacement);

        // 3D coordinates before rotation
        const x = pt.ux * radius;
        const y = pt.uy * radius;
        const z = pt.uz * radius;

        // Apply Y rotation
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Apply X rotation
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Apply Z rotation
        const x3 = x1 * cosZ - y2 * sinZ;
        const y3 = x1 * sinZ + y2 * cosZ;

        // Perspective projection
        const cameraDist = baseRadius * 3.5;
        const scale = cameraDist / (cameraDist - z2);
        const px = centerX + x3 * scale;
        const py = centerY + y3 * scale;

        const depthNorm = z2 / baseRadius;

        projected.push({
          px,
          py,
          pz: z2,
          ny: y3 / baseRadius, // normalized screen Y height
          nx: x3 / baseRadius,
          depthNorm,
          scale,
        });
      }

      // Sort points back-to-front for depth layering
      projected.sort((a, b) => a.pz - b.pz);

      const dotBaseRadius = Math.max(0.65, width * 0.019);

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];

        const isBack = p.pz < 0;
        const depthAlpha = isBack
          ? 0.15 + 0.35 * ((p.pz + baseRadius) / baseRadius)
          : 0.5 + 0.5 * (p.pz / baseRadius);

        const alpha = Math.max(0.08, Math.min(1.0, depthAlpha));
        const currentDotRadius = Math.max(0.4, dotBaseRadius * (0.65 + 0.55 * Math.max(0, p.depthNorm + 0.5)));

        // Color mapping matching reference image:
        // Top: Warm Yellow/Coral -> Mid: Neon Fuchsia/Pink -> Lower: Violet/Electric Blue
        let r = 240, g = 30, b = 150;

        if (state === 'error') {
          r = 239; g = 68; b = 68;
        } else {
          const normY = p.ny; // -1 top to +1 bottom
          if (normY < -0.2) {
            // Top: Golden Yellow (255, 215, 110) -> Fuchsia Pink (245, 55, 160)
            const t = Math.min(1, Math.max(0, (normY + 1.0) / 0.8));
            r = Math.round(255 * (1 - t) + 245 * t);
            g = Math.round(215 * (1 - t) + 55 * t);
            b = Math.round(110 * (1 - t) + 160 * t);
          } else if (normY < 0.35) {
            // Mid: Fuchsia Pink (245, 55, 160) -> Deep Purple (155, 35, 215)
            const t = Math.min(1, Math.max(0, (normY + 0.2) / 0.55));
            r = Math.round(245 * (1 - t) + 155 * t);
            g = Math.round(55 * (1 - t) + 35 * t);
            b = Math.round(160 * (1 - t) + 215 * t);
          } else {
            // Bottom: Deep Purple (155, 35, 215) -> Royal Electric Blue (45, 95, 255)
            const t = Math.min(1, Math.max(0, (normY - 0.35) / 0.65));
            r = Math.round(155 * (1 - t) + 45 * t);
            g = Math.round(35 * (1 - t) + 95 * t);
            b = Math.round(215 * (1 - t) + 255 * t);
          }
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, currentDotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [points, state, amplitude, size]);

  return (
    <div
      aria-label={`AI State: ${state}`}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="w-full h-full block pointer-events-none"
      />
    </div>
  );
}
