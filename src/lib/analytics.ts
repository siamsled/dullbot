/**
 * src/lib/analytics.ts
 * Shared aggregation helpers — single source of truth for all dashboard metrics.
 * Used by Overview, Analytics, and Orders pages to guarantee consistency.
 */

import { supabaseAdmin } from './supabase-admin';

const DHAKA_OFFSET = 6 * 60; // Asia/Dhaka = UTC+6, in minutes

function toDhakaDate(isoString: string): Date {
  const utc = new Date(isoString);
  return new Date(utc.getTime() + DHAKA_OFFSET * 60 * 1000);
}

function dhakaDateStr(isoString: string): string {
  const d = toDhakaDate(isoString);
  return d.toISOString().slice(0, 10);
}

function nDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

import { BD_DISTRICTS } from './districts';

export function extractDistrict(address: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const d of BD_DISTRICTS) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  return null;
}

export interface ShopStats {
  revenueSeries: number[];
  revenueTotal: number;
  revenueDelta: number;
  ordersSeries: number[];
  ordersTotal: number;
  ordersDelta: number;
  convSeries: number[];
  convsTotal: number;
  convDelta: number;
  autopilotRate: number;
  autopilotSeries: number[];
  funnelConversations: number;
  funnelOrderIntent: number;
  funnelConfirmed: number;
  funnelFulfilled: number;
  aiResolved: number;
  humanEscalated: number;
  pendingOrders: number;
  paymentMismatches: number;
  lowStockProducts: number;
}

function buildCustomSeries<T extends { created_at: string }>(
  rows: T[] | null,
  startStr: string,
  endStr: string,
  rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
  getValue: (row: T) => number
): number[] {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = end.getTime() - start.getTime();

  if (rangeType === 'daily') {
    const series = new Array(24).fill(0);
    for (const row of rows ?? []) {
      const d = new Date(row.created_at);
      const diffHours = Math.floor((end.getTime() - d.getTime()) / (60 * 60 * 1000));
      const idx = 23 - diffHours;
      if (idx >= 0 && idx < 24) {
        series[idx] += getValue(row);
      }
    }
    return series;
  }
  
  if (rangeType === 'yearly') {
    const series = new Array(12).fill(0);
    for (const row of rows ?? []) {
      const d = new Date(row.created_at);
      const diffMonths = (end.getFullYear() - d.getFullYear()) * 12 + (end.getMonth() - d.getMonth());
      const idx = 11 - diffMonths;
      if (idx >= 0 && idx < 12) {
        series[idx] += getValue(row);
      }
    }
    return series;
  }

  const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000)) || 1;
  const series = new Array(diffDays).fill(0);
  for (const row of rows ?? []) {
    const d = new Date(row.created_at);
    const diff = Math.floor((end.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    const idx = (diffDays - 1) - diff;
    if (idx >= 0 && idx < diffDays) {
      series[idx] += getValue(row);
    }
  }
  return series;
}

export async function getShopStats(
  shopId: string,
  rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'weekly',
  customStart?: string,
  customEnd?: string
): Promise<ShopStats> {
  let startStr: string;
  let endStr: string;
  let prevStartStr: string;
  let prevEndStr: string;
  
  const now = new Date();
  
  if (rangeType === 'daily') {
    const todayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    startStr = todayStart.toISOString();
    endStr = now.toISOString();
    
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    prevStartStr = yesterdayStart.toISOString();
    prevEndStr = todayStart.toISOString();
  } else if (rangeType === 'monthly') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startStr = start.toISOString();
    endStr = now.toISOString();
    
    const prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevStartStr = prevStart.toISOString();
    prevEndStr = start.toISOString();
  } else if (rangeType === 'yearly') {
    const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    startStr = start.toISOString();
    endStr = now.toISOString();
    
    const prevStart = new Date(start.getTime() - 365 * 24 * 60 * 60 * 1000);
    prevStartStr = prevStart.toISOString();
    prevEndStr = start.toISOString();
  } else if (rangeType === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    startStr = start.toISOString();
    endStr = end.toISOString();
    
    const diff = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - diff);
    prevStartStr = prevStart.toISOString();
    prevEndStr = start.toISOString();
  } else {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startStr = start.toISOString();
    endStr = now.toISOString();
    
    const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevStartStr = prevStart.toISOString();
    prevEndStr = start.toISOString();
  }

  const [
    { data: orders7 },
    { data: orders14 },
    { data: convs7 },
    { data: convs14 },
    { data: pendingOrders },
    { data: lowStock },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('created_at, total_amount, status, conversation_id, id').eq('shop_id', shopId).gte('created_at', startStr).lte('created_at', endStr).order('created_at'),
    supabaseAdmin.from('orders').select('created_at, total_amount, status').eq('shop_id', shopId).gte('created_at', prevStartStr).lt('created_at', startStr).order('created_at'),
    supabaseAdmin.from('conversations').select('id, created_at, status').eq('shop_id', shopId).gte('created_at', startStr).lte('created_at', endStr).order('created_at'),
    supabaseAdmin.from('conversations').select('id, created_at, status').eq('shop_id', shopId).gte('created_at', prevStartStr).lt('created_at', startStr).order('created_at'),
    supabaseAdmin.from('orders').select('id').eq('shop_id', shopId).in('status', ['pending_verification','confirmed']),
    supabaseAdmin.from('products').select('id').eq('shop_id', shopId).lt('stock_quantity', 5),
  ]);

  const revenueSeries = buildCustomSeries(orders7 ?? [], startStr, endStr, rangeType, (o: any) => Number(o.total_amount ?? 0));
  const revenueTotal = revenueSeries.reduce((a, b) => a + b, 0);
  const revenuePrev = (orders14 ?? []).reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);
  const revenueDelta = revenuePrev > 0 ? Math.round(((revenueTotal - revenuePrev) / revenuePrev) * 100) : 0;

  const ordersSeries = buildCustomSeries(orders7 ?? [], startStr, endStr, rangeType, () => 1);
  const ordersTotal = (orders7 ?? []).length;
  const ordersPrev = (orders14 ?? []).length;
  const ordersDelta = ordersPrev > 0 ? Math.round(((ordersTotal - ordersPrev) / ordersPrev) * 100) : 0;

  const convSeries = buildCustomSeries(convs7 ?? [], startStr, endStr, rangeType, () => 1);
  const convsTotal = (convs7 ?? []).length;
  const convsPrev = (convs14 ?? []).length;
  const convDelta = convsPrev > 0 ? Math.round(((convsTotal - convsPrev) / convsPrev) * 100) : 0;

  const aiHandled = (convs7 ?? []).filter((c: any) => c.status !== 'human_takeover').length;
  const humanEsc = (convs7 ?? []).filter((c: any) => c.status === 'human_takeover').length;
  const autopilotRate = convsTotal > 0 ? Math.round((aiHandled / convsTotal) * 100) : 0;
  const autopilotSeries = buildCustomSeries(
    (convs7 ?? []).filter((c: any) => c.status !== 'human_takeover'),
    startStr,
    endStr,
    rangeType,
    () => 1
  );

  const orderConvIds = new Set((orders7 ?? []).map((o: any) => o.conversation_id));
  const funnelConversations = convsTotal;
  const funnelOrderIntent = (convs7 ?? []).filter((c: any) => orderConvIds.has(c.id)).length;
  const funnelConfirmed = (orders7 ?? []).filter((o: any) => ['confirmed','fulfilled'].includes(o.status)).length;
  const funnelFulfilled = (orders7 ?? []).filter((o: any) => o.status === 'fulfilled').length;

  const orderIds7 = (orders7 ?? []).map((o: any) => o.id);
  let paymentMismatches = 0;
  if (orderIds7.length > 0) {
    const { count } = await supabaseAdmin
      .from('payment_verifications')
      .select('id', { count: 'exact', head: true })
      .in('order_id', orderIds7)
      .eq('status', 'mismatch');
    paymentMismatches = count ?? 0;
  }

  return {
    revenueSeries, revenueTotal, revenueDelta,
    ordersSeries, ordersTotal, ordersDelta,
    convSeries, convsTotal, convDelta,
    autopilotRate, autopilotSeries,
    funnelConversations,
    funnelOrderIntent,
    funnelConfirmed,
    funnelFulfilled,
    aiResolved: aiHandled,
    humanEscalated: humanEsc,
    pendingOrders: (pendingOrders ?? []).length,
    paymentMismatches,
    lowStockProducts: (lowStock ?? []).length,
  };
}

export async function getRevenueTrend(shopId: string, days: number) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('created_at, total_amount')
    .eq('shop_id', shopId)
    .gte('created_at', nDaysAgo(days))
    .order('created_at');

  const map: Record<string, number> = {};
  for (const o of orders ?? []) {
    const date = dhakaDateStr(o.created_at);
    map[date] = (map[date] ?? 0) + Number(o.total_amount ?? 0);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date: date.slice(5), revenue: Math.round(revenue) }));
}

export async function getPeakOrderTimes(shopId: string, days: number) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('created_at')
    .eq('shop_id', shopId)
    .gte('created_at', nDaysAgo(days));

  const matrix: number[][] = Array.from({ length: 7 }, () => [0, 0, 0]);
  for (const o of orders ?? []) {
    const d = toDhakaDate(o.created_at);
    const day = d.getDay();
    const hour = d.getHours();
    const session = hour < 12 ? 0 : hour < 18 ? 1 : 2;
    matrix[day][session]++;
  }
  return matrix; // [dayOfWeek 0=Sun][0=morning,1=afternoon,2=evening]
}

export async function getCustomerGrowth(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('created_at, customer_phone')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .order('created_at');

  const firstSeen: Record<string, string> = {};
  const { data: allPrior } = await supabaseAdmin
    .from('orders')
    .select('customer_phone, created_at')
    .eq('shop_id', shopId)
    .lt('created_at', since)
    .order('created_at');
  for (const o of allPrior ?? []) {
    if (o.customer_phone && !firstSeen[o.customer_phone]) {
      firstSeen[o.customer_phone] = o.created_at;
    }
  }

  const weekMap: Record<string, { newC: number; returning: number }> = {};
  for (const o of orders ?? []) {
    const d = toDhakaDate(o.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const wk = monday.toISOString().slice(0, 10);
    if (!weekMap[wk]) weekMap[wk] = { newC: 0, returning: 0 };
    const isNew = !firstSeen[o.customer_phone ?? ''];
    if (isNew) {
      weekMap[wk].newC++;
      if (o.customer_phone) firstSeen[o.customer_phone] = o.created_at;
    } else {
      weekMap[wk].returning++;
    }
  }
  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { newC, returning }]) => ({ week: week.slice(5), new: newC, returning }));
}

export async function getTopRegions(shopId: string, days: number) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('customer_district, customer_address')
    .eq('shop_id', shopId)
    .gte('created_at', nDaysAgo(days));

  const map: Record<string, number> = {};
  for (const o of orders ?? []) {
    const district = o.customer_district ?? extractDistrict(o.customer_address ?? '') ?? null;
    if (!district) continue;
    map[district] = (map[district] ?? 0) + 1;
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([district, count]) => ({ district, count, share: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

export async function getChannelPerformance(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: convs } = await supabaseAdmin
    .from('conversations')
    .select('id, channel')
    .eq('shop_id', shopId)
    .gte('created_at', since);

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('conversation_id')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .in('status', ['confirmed', 'fulfilled']);

  const orderConvIds = new Set((orders ?? []).map((o: any) => o.conversation_id));
  const channelMap: Record<string, { total: number; converted: number }> = {};
  for (const c of convs ?? []) {
    const ch = c.channel ?? 'facebook';
    if (!channelMap[ch]) channelMap[ch] = { total: 0, converted: 0 };
    channelMap[ch].total++;
    if (orderConvIds.has(c.id)) channelMap[ch].converted++;
  }
  return Object.entries(channelMap).map(([channel, { total, converted }]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    convRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    total,
  }));
}

export async function getTopProducts(shopId: string, days: number) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('product_id, total_amount, products(name)')
    .eq('shop_id', shopId)
    .gte('created_at', nDaysAgo(days))
    .in('status', ['confirmed', 'fulfilled']);

  const map: Record<string, { name: string; revenue: number }> = {};
  for (const o of orders ?? []) {
    const pid = o.product_id;
    if (!pid) continue;
    const name = (o as any).products?.name ?? 'Unknown';
    if (!map[pid]) map[pid] = { name, revenue: 0 };
    map[pid].revenue += Number(o.total_amount ?? 0);
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export async function getPaymentStats(shopId: string, days: number) {
  const { data: orderRows } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('shop_id', shopId)
    .gte('created_at', nDaysAgo(days));
  const orderIds = (orderRows ?? []).map((o: any) => o.id);

  if (orderIds.length === 0) return { tier1Rate: 0, tier2Rate: 0, mismatchRate: 0, total: 0 };

  const { data: pvs } = await supabaseAdmin
    .from('payment_verifications')
    .select('method, status')
    .in('order_id', orderIds);

  const total = (pvs ?? []).length;
  const tier1 = (pvs ?? []).filter((p: any) => p.method === 'notification_app' && p.status === 'confirmed').length;
  const tier2 = (pvs ?? []).filter((p: any) => p.method === 'merchant_api' && p.status === 'confirmed').length;
  const mismatches = (pvs ?? []).filter((p: any) => p.status === 'mismatch').length;

  return {
    tier1Rate: total > 0 ? Math.round((tier1 / total) * 100) : 0,
    tier2Rate: total > 0 ? Math.round((tier2 / total) * 100) : 0,
    mismatchRate: total > 0 ? Math.round((mismatches / total) * 100) : 0,
    total,
  };
}
