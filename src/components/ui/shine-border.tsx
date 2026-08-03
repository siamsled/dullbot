"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShineBorderProps {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shine Border — wrapper implementation that is guaranteed to work cross-browser.
 * Wraps children in an animated gradient shell, with a white inner container.
 *
 * Usage:
 * <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} className="max-w-[360px]">
 *   <Card className="border-0 shadow-none">...</Card>
 * </ShineBorder>
 */
export function ShineBorder({
  borderWidth = 2,
  duration = 14,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  className,
  children,
}: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor.join(", ") : shineColor;

  return (
    <div
      style={
        {
          backgroundImage: `conic-gradient(from 270deg at 50% 50%, transparent 0deg, ${colors}, transparent 360deg)`,
          backgroundSize: "300% 300%",
          padding: `${borderWidth}px`,
          "--duration": `${duration}s`,
          borderRadius: "14px",
        } as React.CSSProperties
      }
      className={cn("animate-shine w-full shadow-xl", className)}
    >
      {/* White inner surface — border-radius is 2px less to sit flush inside */}
      <div
        style={{ borderRadius: `${14 - borderWidth}px` }}
        className="bg-white w-full h-full overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
