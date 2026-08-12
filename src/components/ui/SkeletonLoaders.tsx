'use client';

import React from 'react';

/**
 * UI_TASTE.md compliant Skeleton Loaders for DullBot Dashboard
 * Each skeleton mirrors its corresponding real page layout 1-to-1.
 */

// ─── Shared pulse wrapper ──────────────────────────────────────────────────
const Bone = ({ className = '' }: { className?: string }) => (
  <div className={`bg-dove/20 rounded-md animate-pulse ${className}`} />
);

// ══════════════════════════════════════════════════════════════════════════════
// INBOX  —  3-pane: left conv list | center thread | (optional right sidebar)
// Real layout: flex flex-col h-full gap-4 p-6 > flex-1 bg-white rounded-cards
//              w-1/3 conv list | flex-1 thread area
// ══════════════════════════════════════════════════════════════════════════════
export function ConversationListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="space-y-1.5 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-fog/60 border border-dove/10 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-dove/20 shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-2.5 w-8" />
            </div>
            <Bone className="h-2.5 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="flex-1 p-5 space-y-4 overflow-hidden animate-pulse">
      {/* Customer message left */}
      <div className="flex flex-col items-start gap-1 max-w-[65%]">
        <Bone className="h-2.5 w-16 mb-0.5" />
        <div className="h-12 w-52 bg-fog rounded-2xl rounded-tl-sm border border-dove/10" />
      </div>
      {/* Agent message right */}
      <div className="flex flex-col items-end gap-1 max-w-[65%] ml-auto">
        <Bone className="h-2.5 w-16 mb-0.5" />
        <div className="h-16 w-64 bg-ink/8 rounded-2xl rounded-tr-sm" />
      </div>
      {/* Customer message */}
      <div className="flex flex-col items-start gap-1 max-w-[65%]">
        <Bone className="h-2.5 w-16 mb-0.5" />
        <div className="h-10 w-44 bg-fog rounded-2xl rounded-tl-sm border border-dove/10" />
      </div>
      {/* Agent message */}
      <div className="flex flex-col items-end gap-1 max-w-[65%] ml-auto">
        <Bone className="h-2.5 w-16 mb-0.5" />
        <div className="h-14 w-56 bg-ink/8 rounded-2xl rounded-tr-sm" />
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
      {/* Main container — mirrors real bg-white rounded-cards shadow-subtle */}
      <div className="flex-1 min-h-0 bg-white rounded-cards shadow-subtle border border-dove/20 flex overflow-hidden">
        {/* Left: conversation list — w-1/3 border-r bg-fog */}
        <div className="w-1/3 border-r border-dove/20 flex flex-col bg-fog">
          {/* Search + filter header */}
          <div className="p-3.5 border-b border-dove/10 bg-white space-y-2.5 animate-pulse">
            <div className="h-8 w-full bg-fog rounded-xl border border-dove/10" />
            <div className="h-7 w-full bg-fog rounded-xl border border-dove/10" />
            <div className="h-7 w-full bg-fog rounded-xl border border-dove/10" />
          </div>
          <ConversationListSkeleton count={7} />
        </div>

        {/* Right: message thread area */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Thread header */}
          <div className="h-14 px-5 border-b border-dove/20 flex items-center justify-between animate-pulse shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-dove/20" />
              <div className="space-y-1.5">
                <Bone className="h-3.5 w-28" />
                <Bone className="h-2.5 w-16" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-fog rounded-xl border border-dove/10" />
              <div className="h-7 w-7 bg-fog rounded-xl border border-dove/10" />
            </div>
          </div>
          <MessageThreadSkeleton />
          {/* Input bar */}
          <div className="shrink-0 p-3 border-t border-dove/10 animate-pulse">
            <div className="h-10 w-full bg-fog rounded-xl border border-dove/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS  —  Lifecycle Control
// Real: max-w-[1200px] mx-auto py-8 px-4 > header | funnel strip | search | table
// ══════════════════════════════════════════════════════════════════════════════
export function OrdersListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full animate-pulse">
      <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* HEADER — title + export button */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <Bone className="h-11 w-56 rounded-xl" />
            <Bone className="h-3.5 w-80" />
          </div>
          <Bone className="h-9 w-40 rounded-buttons" />
        </div>

        {/* FUNNEL STRIP — 4 main + 2 off-funnel */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5">
          {/* Main funnel: 4 cards */}
          <div className="md:col-span-4 bg-white rounded-cards shadow-subtle border border-dove/10 p-2 flex flex-col sm:flex-row gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 p-3 rounded-inputs border border-dove/10 space-y-2 bg-fog/40">
                <div className="flex items-center justify-between">
                  <Bone className="h-2.5 w-16" />
                  <div className="w-4 h-4 rounded-full bg-dove/20" />
                </div>
                <Bone className="h-7 w-9 rounded-lg" />
                <Bone className="h-2 w-20" />
              </div>
            ))}
          </div>
          {/* Off-funnel: 2 cards */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-3 rounded-cards border border-dove/10 space-y-2 bg-white shadow-subtle">
                <div className="flex items-center justify-between">
                  <Bone className="h-2.5 w-14" />
                  <div className="w-4 h-4 rounded-full bg-dove/20" />
                </div>
                <Bone className="h-7 w-9 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="h-11 w-full max-w-md bg-white rounded-full border border-dove/20 shadow-xs" />

        {/* ORDERS TABLE */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          {/* Table header */}
          <div className="p-4 border-b border-dove/10 flex items-center justify-between">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-14" />
          </div>
          {/* Table rows */}
          <div className="divide-y divide-dove/10">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                {/* Checkbox */}
                <div className="w-4 h-4 rounded border border-dove/20 bg-fog shrink-0" />
                {/* Customer info */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Bone className="h-3.5 w-32" />
                  <Bone className="h-2.5 w-24" />
                </div>
                {/* Address */}
                <Bone className="h-3 w-36 hidden md:block" />
                {/* Amount */}
                <Bone className="h-3.5 w-20" />
                {/* Status badge */}
                <div className="h-5 w-24 bg-fog border border-dove/15 rounded-full" />
                {/* Payment pill */}
                <div className="h-5 w-16 bg-fog border border-dove/15 rounded-full hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY  —  max-w-6xl header + stat pills + 4-tab nav + catalogue table
// Real: h1 "Inventory" + retail/cost stat boxes + tab strip + CatalogueTable
// ══════════════════════════════════════════════════════════════════════════════
export function InventoryTableSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full animate-pulse">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* HEADER — title + stat pills */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Bone className="h-10 w-40 rounded-xl" />
            <Bone className="h-4 w-52" />
          </div>
          {/* Retail Value + Cost Basis pills */}
          <div className="flex gap-4">
            <div className="bg-sky-100/60 rounded-xl px-4 py-2.5 space-y-1">
              <Bone className="h-2.5 w-16" />
              <Bone className="h-5 w-24 rounded-lg" />
            </div>
            <div className="bg-orange-50/60 rounded-xl px-4 py-2.5 space-y-1">
              <Bone className="h-2.5 w-14" />
              <Bone className="h-5 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* TAB STRIP — Live Catalogue | Suppliers | Activity | Reports */}
        <div className="flex gap-1 mb-6 border-b border-dove/10">
          {[80, 60, 52, 52].map((w, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2.5 ${i === 0 ? 'border-b-2 border-dove/30' : ''}`}>
              <div className="w-4 h-4 rounded bg-dove/15" />
              <Bone className={`h-3.5 w-${w === 80 ? '24' : w === 60 ? '16' : '14'}`} />
            </div>
          ))}
        </div>

        {/* CATALOGUE TABLE — toolbar + rows */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-cards border border-dove/10 shadow-subtle">
            <div className="h-8 w-60 bg-fog rounded-xl border border-dove/10" />
            <div className="flex gap-2">
              <div className="h-8 w-28 bg-fog rounded-xl border border-dove/10" />
              <div className="h-8 w-28 bg-ink/10 rounded-xl" />
            </div>
          </div>
          {/* Product rows */}
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-cards shadow-subtle border border-dove/10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-4 h-4 rounded border border-dove/20 bg-fog shrink-0" />
                <div className="w-12 h-12 rounded-xl bg-fog/80 shrink-0 border border-dove/10" />
                <div className="space-y-2">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-3 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-6 w-16 bg-fog rounded-full border border-dove/15" />
                <Bone className="h-4 w-14" />
                <div className="h-8 w-8 bg-fog rounded-lg border border-dove/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS  —  max-w-[1200px]
// Real: h1 "Analytics" + date filter pills | Revenue Trend chart |
//        2-col (heatmap + customer growth) | 2-col (regions + channels) |
//        3-col (top products[2] + payment stats[1])
// ══════════════════════════════════════════════════════════════════════════════
export function AnalyticsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full animate-pulse">
      <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* HEADER — title + date range pills */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Bone className="h-11 w-44 rounded-xl" />
            <Bone className="h-3.5 w-80" />
          </div>
          {/* 7d / 30d / 90d / All filter */}
          <div className="flex gap-1 bg-fog p-1 rounded-inputs border border-dove/5 self-start">
            {['7d', '30d', '90d', 'All'].map((label, i) => (
              <div
                key={label}
                className={`px-3.5 py-1.5 rounded-buttons text-xs font-semibold ${i === 0 ? 'bg-white shadow-subtle' : ''}`}
              >
                <Bone className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>

        {/* REVENUE TREND chart card */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-4 h-4 rounded bg-dove/20" />
            <div className="space-y-1">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-2.5 w-48" />
            </div>
          </div>
          {/* Chart area */}
          <div className="h-[260px] flex items-end gap-1 px-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-fog rounded-t-sm border-t border-dove/15"
                style={{ height: `${15 + Math.abs(Math.sin(i * 0.9)) * 70}%` }}
              />
            ))}
          </div>
        </div>

        {/* 2-col: Peak Times heatmap + Customer Growth chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heatmap */}
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-4 h-4 rounded bg-dove/20" />
              <div className="space-y-1">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-2.5 w-52" />
              </div>
            </div>
            {/* Grid cells: 7 days × 3 sessions */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: '40px 1fr 1fr 1fr' }}>
              {/* Header */}
              <div />
              {['Morning', 'Afternoon', 'Evening'].map(s => (
                <Bone key={s} className="h-3 w-full" />
              ))}
              {/* Rows */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <React.Fragment key={day}>
                  <Bone className="h-10 w-8" />
                  {[0, 1, 2].map(j => (
                    <div key={j} className="h-10 rounded-inputs bg-fog/60 border border-dove/10" />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Customer Growth stacked bar */}
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-4 h-4 rounded bg-dove/20" />
              <div className="space-y-1">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-2.5 w-56" />
              </div>
            </div>
            <div className="h-[230px] flex items-end gap-3 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
                  <div className="w-full bg-dove/15 rounded-t-sm" style={{ height: `${30 + i * 12}%` }} />
                  <div className="w-full bg-fog border border-dove/10 rounded-b-sm" style={{ height: `${15 + i * 5}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2-col: Top Regions + Channel Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[['Top Customer Regions', 5], ['Channel Performance', 4]].map(([title, rows]) => (
            <div key={title as string} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-4 h-4 rounded bg-dove/20" />
                <div className="space-y-1">
                  <Bone className="h-3.5 w-36" />
                  <Bone className="h-2.5 w-48" />
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: rows as number }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Bone className="h-3 w-16 shrink-0" />
                    <div className="flex-1 h-2.5 rounded-full bg-fog overflow-hidden">
                      <div className="h-full bg-dove/30 rounded-full" style={{ width: `${80 - i * 15}%` }} />
                    </div>
                    <Bone className="h-3 w-8 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 3-col: Top Products (2) + Payment Stats (1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products — spans 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-4 h-4 rounded bg-dove/20" />
              <div className="space-y-1">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-2.5 w-52" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3 w-24 shrink-0" />
                  <div className="flex-1 h-2.5 rounded-full bg-fog overflow-hidden">
                    <div className="h-full bg-dove/30 rounded-full" style={{ width: `${90 - i * 15}%` }} />
                  </div>
                  <Bone className="h-3 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </div>
          {/* Payment Verification Stats */}
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-4 h-4 rounded bg-dove/20" />
              <div className="space-y-1">
                <Bone className="h-3.5 w-28" />
                <Bone className="h-2.5 w-36" />
              </div>
            </div>
            <div className="space-y-3">
              {['T1', 'T2', 'ERR'].map(tier => (
                <div key={tier} className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-dove/20 border border-dove/10" />
                    <div className="space-y-1">
                      <Bone className="h-3 w-32" />
                      <Bone className="h-2.5 w-24" />
                    </div>
                  </div>
                  <Bone className="h-3.5 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS  —  p-6 md:p-10 max-w-7xl
// Real: icon+h1 header | 4-col stat cards | green banner | search+filter | table
// ══════════════════════════════════════════════════════════════════════════════
export function TransactionsSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-pulse">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dove/20 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-dove/20" />
          <div className="space-y-1.5">
            <Bone className="h-6 w-48" />
            <Bone className="h-3 w-72" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-white border border-dove/30 rounded-xl" />
          <div className="h-9 w-36 bg-ink/10 rounded-xl" />
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Total Logs', 'Total Volume', 'Matched Orders', 'Active Devices'].map((label) => (
          <div key={label} className="p-4 rounded-2xl bg-white border border-dove/20 shadow-xs space-y-1.5">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-8 w-24 rounded-lg" />
            <Bone className="h-2.5 w-28" />
          </div>
        ))}
      </div>

      {/* GREEN ISOLATION BANNER */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl flex items-center gap-3">
        <div className="w-4 h-4 rounded bg-emerald-200/60 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-3 w-64" />
          <Bone className="h-3 w-48" />
        </div>
      </div>

      {/* SEARCH + FILTER ROW */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="h-9 flex-1 max-w-md bg-white border border-dove/25 rounded-xl" />
        <div className="h-9 w-32 bg-white border border-dove/25 rounded-xl" />
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="bg-white border border-dove/20 rounded-2xl overflow-hidden shadow-xs">
        {/* Table header */}
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-dove/10">
          {['TrxID', 'Amount', 'Sender', 'Provider', 'Status'].map(col => (
            <Bone key={col} className="h-3 w-16" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3.5 border-b border-dove/5 last:border-0">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-3.5 w-16" />
            <Bone className="h-3.5 w-20" />
            <div className="h-5 w-14 bg-fog border border-dove/15 rounded-full" />
            <div className="h-5 w-20 bg-fog border border-dove/15 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI TUNING  —  flex h-full: w-72 sidebar | flex-1 main panel
// Real: aside (persona list) | main (tabs header + form sections)
// ══════════════════════════════════════════════════════════════════════════════
export function AiTuningSkeleton() {
  return (
    <div className="flex h-full overflow-hidden bg-fog animate-pulse">
      {/* LEFT SIDEBAR — persona list */}
      <aside className="w-72 shrink-0 bg-white border-r border-dove/20 flex flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-dove/20 space-y-2">
          <Bone className="h-7 w-40 rounded-lg" />
          <Bone className="h-3 w-28" />
        </div>
        <div className="overflow-y-auto py-3 px-3 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`p-3.5 rounded-2xl border border-dove/10 space-y-2 ${i === 0 ? 'bg-dove/15' : 'bg-fog/40'}`}>
              <div className="flex items-center justify-between">
                <Bone className="h-3.5 w-24" />
                <div className="w-3.5 h-3.5 rounded bg-dove/20" />
              </div>
              <Bone className="h-2.5 w-36" />
              <div className="flex gap-1.5">
                <div className="h-4 w-14 bg-dove/15 rounded-full" />
                <div className="h-4 w-16 bg-dove/15 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-dove/20 px-4 py-4">
          <div className="h-11 w-full bg-fog rounded-full border border-dove/15" />
        </div>
      </aside>

      {/* MAIN PANEL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-dove/20 px-8 pt-4 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bone className="h-6 w-32 rounded-lg" />
                <div className="h-5 w-20 bg-apricot-wash/60 rounded-full border border-dove/10" />
              </div>
              <Bone className="h-3 w-56" />
            </div>
            <div className="h-5 w-24 bg-fog rounded-full" />
          </div>
          {/* Tabs strip */}
          <div className="flex gap-1">
            {[100, 80, 80, 80, 80].map((w, i) => (
              <div key={i} className={`h-9 rounded-t-lg border-b-2 ${i === 0 ? 'border-ink/40' : 'border-transparent'}`}>
                <div className={`h-full px-4 flex items-center`}>
                  <Bone className={`h-3 w-${i === 0 ? '24' : '16'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-cards border border-dove/10 shadow-subtle p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-dove/10">
                <div className="w-4 h-4 rounded bg-dove/20" />
                <Bone className="h-4 w-32" />
              </div>
              <div className="space-y-3">
                <Bone className="h-3 w-24" />
                <div className="h-24 bg-fog rounded-inputs border border-dove/10" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL  —  max-w-[760px]
// Real: header + Add Post URL button | filter bar (platform pills + sort) | post cards feed
// ══════════════════════════════════════════════════════════════════════════════
export function SocialSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-fog/30 animate-pulse">
      <div className="max-w-[760px] mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <Bone className="h-10 w-52 rounded-xl" />
            <Bone className="h-3.5 w-80" />
          </div>
          <div className="h-9 w-32 bg-ink/10 rounded-buttons self-start" />
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white rounded-cards border border-dove/10 shadow-subtle">
          <div className="flex items-center gap-1 bg-fog p-1 rounded-inputs border border-dove/10 w-full sm:w-auto">
            {['All', 'Facebook', 'Instagram'].map(p => (
              <div key={p} className="px-3 py-1.5 rounded-lg">
                <Bone className="h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Bone className="h-3 w-12" />
            <div className="h-8 w-24 bg-fog rounded-inputs border border-dove/10" />
          </div>
        </div>

        {/* POST CARDS FEED */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-cards border border-dove/10 shadow-subtle overflow-hidden">
              {/* Post header */}
              <div className="flex items-center gap-3 p-4 border-b border-dove/10">
                <div className="w-12 h-12 rounded-inputs bg-fog border border-dove/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3.5 w-full max-w-xs" />
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 bg-blue-50 rounded border border-blue-200/60" />
                    <Bone className="h-3 w-16" />
                  </div>
                </div>
                <div className="h-8 w-8 bg-fog rounded-full border border-dove/10" />
              </div>
              {/* Config sections */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Bone className="h-3 w-28" />
                  <div className="h-6 w-11 bg-dove/20 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Bone className="h-3 w-36" />
                  <div className="h-6 w-11 bg-dove/20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREDITS  —  max-w-5xl
// Real: h1 "Credits" + subtitle | 3 stat cards (h-36) | usage log table
// ══════════════════════════════════════════════════════════════════════════════
export function CreditsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full animate-pulse">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-10 space-y-2">
          <Bone className="h-10 w-36 rounded-xl" />
          <Bone className="h-5 w-56" />
        </div>

        {/* 3 STAT CARDS — h-36 each */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {['Current Balance', 'Total Spent', 'Last Top-up'].map((label) => (
            <div key={label} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/10 h-36 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <Bone className="h-3.5 w-28" />
                <div className="w-9 h-9 rounded-lg bg-fog border border-dove/10" />
              </div>
              <div className="space-y-1">
                <Bone className="h-8 w-32 rounded-lg" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* USAGE LOG TABLE */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <div className="p-5 border-b border-dove/10">
            <Bone className="h-4 w-28" />
          </div>
          <div className="divide-y divide-dove/10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Bone className="h-3 w-20 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Bone className="h-3.5 w-48" />
                  <Bone className="h-2.5 w-64" />
                </div>
                <Bone className="h-3.5 w-16 shrink-0" />
                <div className="h-5 w-14 bg-fog border border-dove/15 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS  —  max-w-4xl space-y-10
// Real: h1 "Workspace Settings" | Business Profile card (avatar + name + edit button) |
//       multiple section cards (Autopilot, Channels, Payment, Courier, Widget, Companion)
// ══════════════════════════════════════════════════════════════════════════════
export function SettingsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto h-full w-full animate-pulse">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">

        {/* PAGE HEADER */}
        <div className="space-y-1">
          <Bone className="h-10 w-56 rounded-xl" />
          <Bone className="h-3.5 w-80" />
        </div>

        {/* SECTION: Business Profile */}
        <div className="space-y-3">
          <Bone className="h-2.5 w-28" />
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-apricot-wash/60 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-48" />
              </div>
              <div className="h-8 w-24 bg-fog rounded-buttons border border-dove/20 shrink-0" />
            </div>
          </div>
        </div>

        {/* SECTION: Autopilot */}
        <div className="space-y-3">
          <Bone className="h-2.5 w-20" />
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Bone className="h-4 w-36" />
                <Bone className="h-3 w-64" />
              </div>
              <div className="h-6 w-11 bg-dove/20 rounded-full" />
            </div>
            <div className="border-t border-dove/10 pt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-dove/10 bg-fog/40 space-y-1.5">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-2.5 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION: Channels (Facebook / Instagram / WhatsApp) */}
        <div className="space-y-3">
          <Bone className="h-2.5 w-16" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-fog border border-dove/10" />
                  <div className="space-y-1.5">
                    <Bone className="h-4 w-28" />
                    <Bone className="h-3 w-52" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-fog rounded-full border border-dove/20" />
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: Payment Verification */}
        <div className="space-y-3">
          <Bone className="h-2.5 w-36" />
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-4">
            <div className="space-y-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-72" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-dove/10 space-y-1.5">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-2.5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION: Courier + Widget (compact cards) */}
        <div className="space-y-3">
          <Bone className="h-2.5 w-24" />
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fog border border-dove/10" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-48" />
              </div>
              <div className="h-8 w-24 bg-fog rounded-inputs border border-dove/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW (Dashboard root)  —  used by /dashboard/loading.tsx
// Real: OverviewClient — stat cards + recent orders/conversations
// ══════════════════════════════════════════════════════════════════════════════
export function OverviewSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8 animate-pulse max-w-7xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-3">
            <Bone className="h-3 w-28" />
            <Bone className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      {/* List card */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-4">
        <Bone className="h-4 w-36 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-dove/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-fog border border-dove/10" />
              <div className="space-y-1.5">
                <Bone className="h-3.5 w-36" />
                <Bone className="h-2.5 w-24" />
              </div>
            </div>
            <Bone className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD WORKSPACE  —  generic fallback for /dashboard/loading.tsx
// ══════════════════════════════════════════════════════════════════════════════
export function DashboardWorkspaceSkeleton() {
  return <OverviewSkeleton />;
}
