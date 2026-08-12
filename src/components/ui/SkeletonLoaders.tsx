'use client';

import React from 'react';

/**
 * UI_TASTE.md compliant Skeleton Loaders for DullBot Dashboard
 */

export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 p-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-2xl bg-fog/60 border border-dove/10"
        >
          <div className="w-10 h-10 rounded-full bg-dove/20 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-28 bg-dove/25 rounded-md" />
              <div className="h-2.5 w-10 bg-dove/20 rounded-md" />
            </div>
            <div className="h-3 w-40 bg-dove/15 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 overflow-hidden animate-pulse">
      <div className="flex flex-col items-start space-y-1 max-w-[65%]">
        <div className="h-2.5 w-20 bg-dove/20 rounded-md mb-1" />
        <div className="h-12 w-56 bg-fog rounded-2xl rounded-tl-xs border border-dove/10 p-3" />
      </div>

      <div className="flex flex-col items-end space-y-1 max-w-[65%] ml-auto">
        <div className="h-2.5 w-20 bg-dove/20 rounded-md mb-1" />
        <div className="h-16 w-64 bg-ink/10 rounded-2xl rounded-tr-xs p-3" />
      </div>

      <div className="flex flex-col items-start space-y-1 max-w-[65%]">
        <div className="h-2.5 w-20 bg-dove/20 rounded-md mb-1" />
        <div className="h-10 w-48 bg-fog rounded-2xl rounded-tl-xs border border-dove/10 p-3" />
      </div>

      <div className="flex flex-col items-end space-y-1 max-w-[65%] ml-auto">
        <div className="h-2.5 w-20 bg-dove/20 rounded-md mb-1" />
        <div className="h-12 w-52 bg-ink/10 rounded-2xl rounded-tr-xs p-3" />
      </div>
    </div>
  );
}

export function InventoryTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-white rounded-cards shadow-subtle border border-dove/10"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-fog/80 shrink-0 border border-dove/10" />
            <div className="space-y-2">
              <div className="h-4 w-36 bg-dove/25 rounded-md" />
              <div className="h-3 w-20 bg-dove/15 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-6 w-20 bg-fog rounded-full border border-dove/15" />
            <div className="h-4 w-16 bg-dove/25 rounded-md" />
            <div className="h-8 w-8 bg-fog rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrdersListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-cards shadow-subtle border border-dove/10 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-dove/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-24 bg-dove/25 rounded-md" />
              <div className="h-5 w-20 bg-fog rounded-full border border-dove/15" />
            </div>
            <div className="h-3.5 w-16 bg-dove/20 rounded-md" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 bg-dove/25 rounded-md" />
              <div className="h-3 w-24 bg-dove/15 rounded-md" />
            </div>
            <div className="h-5 w-24 bg-dove/30 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-5 space-y-3">
            <div className="h-3 w-24 bg-dove/20 rounded-md" />
            <div className="h-7 w-20 bg-dove/30 rounded-md" />
            <div className="h-2.5 w-32 bg-dove/15 rounded-md" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 h-72 flex flex-col justify-end space-y-4">
        <div className="flex items-end justify-between h-48 gap-2 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-full bg-fog rounded-t-lg border border-dove/10"
              style={{ height: `${20 + (i * 11) % 70}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-3">
            <div className="h-3 w-28 bg-dove/20 rounded-md" />
            <div className="h-8 w-24 bg-dove/35 rounded-md" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-4">
        <div className="h-4 w-36 bg-dove/25 rounded-md mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-dove/10">
            <div className="h-3.5 w-40 bg-dove/20 rounded-md" />
            <div className="h-3.5 w-16 bg-dove/25 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardWorkspaceSkeleton() {
  return (
    <div className="w-full h-full min-h-[70vh] p-6 space-y-6 animate-pulse">
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between pb-4 border-b border-dove/10">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-dove/25 rounded-xl" />
          <div className="h-3 w-64 bg-dove/15 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-fog rounded-full border border-dove/15" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-5 space-y-3">
            <div className="h-3.5 w-24 bg-dove/20 rounded-md" />
            <div className="h-7 w-20 bg-dove/35 rounded-md" />
            <div className="h-2.5 w-32 bg-dove/15 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-4 min-h-[320px]">
        <div className="flex items-center justify-between pb-2 border-b border-dove/10">
          <div className="h-4 w-40 bg-dove/25 rounded-md" />
          <div className="h-3 w-20 bg-dove/15 rounded-md" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-dove/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-fog border border-dove/10" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 bg-dove/25 rounded-md" />
                <div className="h-2.5 w-24 bg-dove/15 rounded-md" />
              </div>
            </div>
            <div className="h-4 w-20 bg-dove/20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
