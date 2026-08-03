"use client";

import { cn } from "@/lib/utils";

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string | string[];
  shineColor?: string | string[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * @name Shine Border
 * @description An animated background border effect component with configurable color, border-radius, and duration.
 */
export function ShineBorder({
  borderRadius = 12,
  borderWidth = 1,
  duration = 14,
  color,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  className,
  children,
}: ShineBorderProps) {
  const activeColor = color || shineColor;
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        "relative min-h-[60px] w-full rounded-[var(--border-radius)] p-px",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(circle,transparent,rgba(0,0,0,0.5) 100%)`,
            "--shine-pulse-duration": `${duration}s`,
            "--shine-gradient": `conic-gradient(from 0deg at 50% 50%, ${
              Array.isArray(activeColor) ? activeColor.join(",") : activeColor
            })`,
          } as React.CSSProperties
        }
        className={`before:bg-shine-gradient pointer-events-none before:absolute before:inset-0 before:size-full before:rounded-[var(--border-radius)] before:p-[var(--border-width)] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] motion-safe:before:animate-shine`}
      />
      {children}
    </div>
  );
}
