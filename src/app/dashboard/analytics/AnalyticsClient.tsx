'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, FunnelChart, Funnel, LabelList
} from 'recharts';

type DailyCredit = { date: string; credits: number };
type CarrierBar = { carrier: string; count: number };
type FunnelPoint = { name: string; value: number; fill: string };
type StatCard = { label: string; value: string; sub: string };

interface Props {
  dailyCredits: DailyCredit[];
  carrierDistribution: CarrierBar[];
  funnelData: FunnelPoint[];
  stats: StatCard[];
  topUnanswered: string[];
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#fafaf9', border: '1px solid #e5e0d8', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#6b6461', fontSize: '11px' }
};

export default function AnalyticsClient({ dailyCredits, carrierDistribution, funnelData, stats, topUnanswered }: Props) {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Analytics</h1>
        <p className="text-ash text-lg">Understand your conversations, conversions, and AI performance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-5">
            <p className="text-xs text-ash uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-serif text-ink">{s.value}</p>
            <p className="text-xs text-ash mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Credit Usage Chart */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-6">
          <h2 className="text-base font-medium text-ink mb-1">Credit Usage</h2>
          <p className="text-xs text-ash mb-4">Daily AI credits billed (last 30 days)</p>
          {dailyCredits.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-ash text-sm">No usage data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailyCredits} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c1917" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1c1917" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9b9290' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9b9290' }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="credits" stroke="#1c1917" strokeWidth={1.5} fill="url(#creditGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Customer Carrier Distribution */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-6">
          <h2 className="text-base font-medium text-ink mb-1">Customer Regions</h2>
          <p className="text-xs text-ash mb-4">Conversations by phone carrier prefix</p>
          {carrierDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-ash text-sm">No conversation data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={carrierDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                <XAxis dataKey="carrier" tick={{ fontSize: 10, fill: '#9b9290' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9b9290' }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#e8d5c0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Funnel */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-6">
          <h2 className="text-base font-medium text-ink mb-1">Conversation Funnel</h2>
          <p className="text-xs text-ash mb-4">Where customers drop off in the sales flow</p>
          {funnelData.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-ash text-sm">No funnel data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <FunnelChart>
                <Tooltip {...TOOLTIP_STYLE} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#6b6461" stroke="none" dataKey="name" style={{ fontSize: '11px' }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Unanswered / Escalated Queries */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-6">
          <h2 className="text-base font-medium text-ink mb-1">Top Unanswered Questions</h2>
          <p className="text-xs text-ash mb-4">Queries that triggered human escalation most often</p>
          {topUnanswered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-ash text-sm">No escalations recorded</div>
          ) : (
            <ol className="space-y-2.5">
              {topUnanswered.map((q, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-fog rounded-inputs">
                  <span className="text-xs font-bold text-ash w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <p className="text-sm text-ink line-clamp-2">{q}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
