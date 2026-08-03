"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShineBorderProps {
  /**
   * Width of the shine border in pixels.
   * @default 1
   */
  borderWidth?: number;
  /**
   * Duration of the animation in seconds.
   * @default 14
   */
  duration?: number;
  /**
   * Color of the border, as a single color string or array of colors for gradient.
   */
  shineColor?: string | string[];
  className?: string;
}

/**
 * Shine Border — exact Magic UI implementation.
 * Usage: place as a self-closing child INSIDE a `relative overflow-hidden` Card.
 * <Card className="relative overflow-hidden">
 *   <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
 *   ...card content...
 * </Card>
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  className,
}: ShineBorderProps) {
  const gradientColors = Array.isArray(shineColor)
    ? shineColor.join(", ")
    : shineColor;

  return (
    <div
      aria-hidden="true"
      style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent,transparent), conic-gradient(from calc(270deg - (360deg / 2)), ${gradientColors}, transparent 360deg)`,
          WebkitMaskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          maskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: `var(--border-width)`,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [background-size:300%_300%] animate-shine",
        className,
      )}
    />
  );
}
