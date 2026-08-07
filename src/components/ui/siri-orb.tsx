'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

const VERTEX_SHADER = `
  uniform float time;
  uniform float amplitude;

  varying vec3 vPos;
  varying float vNoise;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = mix(
      mix(
        mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(
        mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);

    return n;
  }

  void main() {
    vec3 p = position;

    // Organic multi-octave 3D noise displacement
    float n1 = noise(position * 2.8 + vec3(time * 0.35, time * 0.25, time * 0.3));
    float n2 = noise(position * 5.2 - vec3(time * 0.45, time * 0.35, time * 0.4));

    float n = mix(n1, n2, 0.35);

    // Deform sphere surface along normal vector (organic wavy non-spherical blob)
    p += normalize(position) * (n - 0.5) * (0.48 + amplitude * 0.28);

    vNoise = n;
    vPos = p;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    // Points size attenuation based on camera depth
    gl_PointSize = (2.2 + amplitude * 0.8) * (160.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform float isError;
  varying vec3 vPos;
  varying float vNoise;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);

    if (d > 0.5) discard;

    // Soft glow particle disc falloff
    float alpha = smoothstep(0.5, 0.0, d);

    if (isError > 0.5) {
      gl_FragColor = vec4(0.95, 0.25, 0.25, alpha * 0.9);
      return;
    }

    // Color gradient mapping:
    // Electric Blue -> Deep Purple -> Neon Fuchsia -> Golden Peach Highlight
    vec3 electricBlue = vec3(0.18, 0.45, 1.0);
    vec3 deepPurple = vec3(0.55, 0.1, 0.85);
    vec3 neonPink = vec3(1.0, 0.15, 0.65);
    vec3 goldenYellow = vec3(1.0, 0.85, 0.4);

    float h = vPos.y * 0.55 + 0.5;

    vec3 color = mix(electricBlue, deepPurple, smoothstep(0.0, 0.4, h));
    color = mix(color, neonPink, smoothstep(0.4, 0.78, h));
    color = mix(color, goldenYellow, smoothstep(0.78, 1.0, h));

    // Subtle specular highlight on noise peaks
    color += vec3(0.12, 0.08, 0.18) * pow(vNoise, 3.0);

    gl_FragColor = vec4(color, alpha * 0.88);
  }
`;

export default function SiriOrb({
  amplitude = 0.2,
  size = '36px',
  state = 'idle',
  className = '',
}: SiriOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || parseFloat(size) || 36;
    const height = container.clientHeight || parseFloat(size) || 36;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.6;

    // WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('WebGL not supported for SiriOrb, falling back:', e);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Point cloud density dynamically scaled based on component size
    const pointCount = width > 80 ? 120000 : 45000;
    const positions = new Float32Array(pointCount * 3);

    // Uniform spherical distribution using Fibonacci spiral
    const phiGold = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < pointCount; i++) {
      const theta = 2 * Math.PI * i / phiGold;
      const y = 1 - (i / (pointCount - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));

      positions[i * 3] = radiusAtY * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = radiusAtY * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        amplitude: { value: amplitude },
        isError: { value: state === 'error' ? 1.0 : 0.0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    materialRef.current = material;

    const orbMesh = new THREE.Points(geometry, material);
    scene.add(orbMesh);

    let animId: number;
    let startTime = performance.now();

    const speed = state === 'listening' ? 1.8 : state === 'thinking' ? 1.4 : state === 'streaming' ? 2.2 : 0.9;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTime) * 0.001 * speed;

      material.uniforms.time.value = elapsed;
      material.uniforms.amplitude.value = amplitude;
      material.uniforms.isError.value = state === 'error' ? 1.0 : 0.0;

      orbMesh.rotation.y = elapsed * 0.25;
      orbMesh.rotation.x = Math.sin(elapsed * 0.15) * 0.12;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [amplitude, state, size]);

  return (
    <div
      aria-label={`AI State: ${state}`}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div ref={mountRef} className="w-full h-full block pointer-events-none" style={{ width: size, height: size }} />
    </div>
  );
}
