"use client";

import React from "react";
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

export function ShineBorder({
  borderRadius = 16,
  borderWidth = 2,
  duration = 8,
  color,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  className,
  children,
}: ShineBorderProps) {
  const activeColor = color || shineColor;
  const gradientString = Array.isArray(activeColor)
    ? activeColor.join(", ")
    : activeColor;

  return (
    <div
      className={cn("relative p-[2px] rounded-[18px] overflow-hidden", className)}
    >
      {/* Animated Conic Gradient Border */}
      <div
        className="absolute inset-[-200%] animate-spin-slow pointer-events-none"
        style={{
          background: `conic-gradient(from 0deg, ${gradientString}, ${gradientString})`,
          animationDuration: `${duration}s`,
        }}
      />

      {/* Subtle Glowing Blur Effect around border */}
      <div
        className="absolute inset-[-10%] blur-md opacity-70 animate-spin-slow pointer-events-none"
        style={{
          background: `conic-gradient(from 0deg, ${gradientString}, ${gradientString})`,
          animationDuration: `${duration}s`,
        }}
      />

      {/* Card Content Wrapper */}
      <div className="relative z-10 w-full h-full rounded-[16px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
