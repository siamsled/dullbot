'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Users, MapPin, Share2, Award, ShieldAlert
} from 'lucide-react';

interface Props {
  range: number;
  revenueTrend: any[];
  peakTimes: number[][]; // [7][3]
  customerGrowth: any[];
  topRegions: any[];
  channelPerformance: any[];
  topProducts: any[];
  paymentStats: {
    tier1Rate: number;
    tier2Rate: number;
    mismatchRate: number;
    total: number;
  };
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid rgba(163, 166, 175, 0.3)', // Dove tint
    borderRadius: '16px', // Input radius
    fontSize: '11px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    fontFamily: 'var(--font-sohne)',
  },
  labelStyle: { color: '#777b86', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const }
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSIONS = ['Morning (<12 PM)', 'Afternoon (12-6 PM)', 'Evening (>6 PM)'];

export default function AnalyticsClient({
  range,
  revenueTrend,
  peakTimes,
  customerGrowth,
  topRegions,
  channelPerformance,
  topProducts,
  paymentStats
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleRangeChange = (days: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', days.toString());
      router.replace(`/dashboard/analytics?${params.toString()}`, { scroll: false });
    });
  };

  const maxPeak = Math.max(...peakTimes.flatMap(row => row), 1);

  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

      {/* HEADER & DATE RANGE FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Analytics</h1>
          <p className="text-ash text-sm">Understand your sales performance, customer trends, and conversion channels.</p>
        </div>
        <div className="flex gap-1 bg-fog p-1 rounded-inputs self-start shadow-subtle border border-dove/5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => handleRangeChange(d)}
              disabled={isPending}
              className={`px-3.5 py-1.5 rounded-buttons text-xs font-semibold transition-all ${
                range === d
                  ? 'bg-white text-ink shadow-subtle'
                  : 'text-ash hover:text-ink disabled:opacity-50'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => handleRangeChange(0)}
            disabled={isPending}
            className={`px-3.5 py-1.5 rounded-buttons text-xs font-semibold transition-all ${
              range === 0
                ? 'bg-white text-ink shadow-subtle'
                : 'text-ash hover:text-ink disabled:opacity-50'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* REVENUE TREND */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="w-4 h-4 text-ink" />
          <div>
            <h3 className="text-sm font-semibold text-ink">Revenue Trend</h3>
            <p className="text-xs text-ash">Daily aggregated store earnings over time</p>
          </div>
        </div>
        {revenueTrend.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-ash text-xs">
            <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
            No sales recorded in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17191c" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#17191c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#17191c" strokeWidth={1.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* HEATMAP & CUSTOMER GROWTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Clock className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Peak Order Times</h3>
                <p className="text-xs text-ash">Order distribution grouped by Dhaka local time</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[420px] grid grid-cols-4 gap-2 pt-1">
                {/* Header row */}
                <div />
                {SESSIONS.map((s, idx) => (
                  <div key={idx} className="text-[10px] font-semibold text-graphite text-center truncate">{s}</div>
                ))}

                {/* Day rows */}
                {DAYS_OF_WEEK.map((day, dIdx) => (
                  <div key={day} className="contents">
                    <div className="text-[10px] font-semibold text-ink flex items-center">{day}</div>
                    {SESSIONS.map((_, sIdx) => {
                      const count = peakTimes[dIdx]?.[sIdx] ?? 0;
                      const opacity = count > 0 ? 0.08 + (count / maxPeak) * 0.92 : 0.02;
                      return (
                        <div
                          key={`cell-${dIdx}-${sIdx}`}
                          className="h-10 rounded-inputs flex items-center justify-center font-mono text-[10px] font-bold text-ink transition-all hover:scale-[1.03]"
                          style={{
                            backgroundColor: `rgba(23, 25, 28, ${opacity})`,
                            border: '1px solid rgba(23, 25, 28, 0.05)'
                          }}
                          title={`${count} orders on ${day} ${SESSIONS[sIdx].split(' ')[0]}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color scale legend */}
          <div className="mt-6 flex items-center justify-between text-[10px] text-graphite font-semibold">
            <span>Fewer orders</span>
            <div className="flex-1 mx-4 h-1.5 rounded-full bg-gradient-to-r from-ink/5 to-ink" />
            <span>More orders</span>
          </div>
        </div>

        {/* Stacked Customer Growth */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Users className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Customer Growth</h3>
                <p className="text-xs text-ash">Stacked breakdown of new vs returning purchases per week</p>
              </div>
            </div>
            {customerGrowth.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-ash text-xs">
                <Users className="w-8 h-8 opacity-20 mb-2" />
                No purchases in this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={customerGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sohne)' }} />
                  <Bar dataKey="new" name="New Customers" stackId="a" fill="#17191c" barSize={20} />
                  <Bar dataKey="returning" name="Returning" stackId="a" fill="#fbe1d1" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* REGIONS & CHANNEL PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <MapPin className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Top Customer Regions</h3>
              <p className="text-xs text-ash">Bangladeshi districts ranked by confirmed order share</p>
            </div>
          </div>
          {topRegions.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No address data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topRegions} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="district" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Order Share']} />
                <Bar dataKey="share" fill="#17191c" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Share2 className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Channel Performance</h3>
              <p className="text-xs text-ash">Conversion rate (conversations to confirmed order) per channel</p>
            </div>
          </div>
          {channelPerformance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No conversation traffic recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={channelPerformance} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Conv. Rate']} />
                <Bar dataKey="convRate" fill="#fbe1d1" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TOP PRODUCTS & PAYMENT STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Award className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Top Products</h3>
              <p className="text-xs text-ash">Best selling catalog products ranked by revenue</p>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No sales details to display</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#17191c" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Verification Tiles */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <ShieldAlert className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Verification Stats</h3>
                <p className="text-xs text-ash">Payment check audits (last {range}d)</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center text-[10px] font-bold border border-green-150">T1</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Companion App Confirmation</p>
                    <p className="text-[9px] text-graphite mt-0.5">Tier 1 Automatic verification</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-ink">{paymentStats.tier1Rate}%</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-150">T2</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Merchant API Confirmation</p>
                    <p className="text-[9px] text-graphite mt-0.5">Tier 2 Real-time API query</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-ink">{paymentStats.tier2Rate}%</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-red-750 flex items-center justify-center text-[10px] font-bold border border-red-150">ERR</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Mismatch / Escalation Rate</p>
                    <p className="text-[9px] text-graphite mt-0.5">Transferred to manual review</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-rust">{paymentStats.mismatchRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
  );
}
