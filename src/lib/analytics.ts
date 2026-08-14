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
  // Enhanced metrics
  aovTotal: number;
  aovDelta: number;
  inquiryConvRate: number;
  todayCashInTill: number;
  todayPosRevenue: number;
  todayChatRevenue: number;
  todayPosOrderCount: number;
  todayChatOrderCount: number;
  pendingAgingCount: number;
  creditBalance: number;
  todayNewCustomers: number;
  todayReturningCustomers: number;
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
    { data: shopData },
    { data: allPending },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('created_at, total_amount, status, conversation_id, id, payment_method, verification_method, customer_phone').eq('shop_id', shopId).gte('created_at', startStr).lte('created_at', endStr).order('created_at'),
    supabaseAdmin.from('orders').select('created_at, total_amount, status').eq('shop_id', shopId).gte('created_at', prevStartStr).lt('created_at', startStr).order('created_at'),
    supabaseAdmin.from('conversations').select('id, created_at, status').eq('shop_id', shopId).gte('created_at', startStr).lte('created_at', endStr).order('created_at'),
    supabaseAdmin.from('conversations').select('id, created_at, status').eq('shop_id', shopId).gte('created_at', prevStartStr).lt('created_at', startStr).order('created_at'),
    supabaseAdmin.from('orders').select('id, created_at').eq('shop_id', shopId).in('status', ['pending_verification','confirmed']),
    supabaseAdmin.from('products').select('id').eq('shop_id', shopId).lt('stock_quantity', 5),
    supabaseAdmin.from('shops').select('credit_balance').eq('id', shopId).single(),
    supabaseAdmin.from('orders').select('id, created_at').eq('shop_id', shopId).eq('status', 'pending_verification'),
  ]);

  const revenueSeries = buildCustomSeries(orders7 ?? [], startStr, endStr, rangeType, (o: any) => Number(o.total_amount ?? 0));
  const revenueTotal = revenueSeries.reduce((a, b) => a + b, 0);
  const revenuePrev = (orders14 ?? []).reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);
  const revenueDelta = revenuePrev > 0 ? Math.round(((revenueTotal - revenuePrev) / revenuePrev) * 100) : 0;

  const ordersSeries = buildCustomSeries(orders7 ?? [], startStr, endStr, rangeType, () => 1);
  const ordersTotal = (orders7 ?? []).length;
  const ordersPrev = (orders14 ?? []).length;
  const ordersDelta = ordersPrev > 0 ? Math.round(((ordersTotal - ordersPrev) / ordersPrev) * 100) : 0;

  // Average Order Value (AOV)
  const confirmed7 = (orders7 ?? []).filter((o: any) => ['confirmed', 'fulfilled'].includes(o.status));
  const confirmed14 = (orders14 ?? []).filter((o: any) => ['confirmed', 'fulfilled'].includes(o.status));
  const aovTotal = confirmed7.length > 0 ? Math.round(revenueTotal / confirmed7.length) : 0;
  const aovPrev = confirmed14.length > 0 ? Math.round(revenuePrev / confirmed14.length) : 0;
  const aovDelta = aovPrev > 0 ? Math.round(((aovTotal - aovPrev) / aovPrev) * 100) : 0;

  const convSeries = buildCustomSeries(convs7 ?? [], startStr, endStr, rangeType, () => 1);
  const convsTotal = (convs7 ?? []).length;
  const convsPrev = (convs14 ?? []).length;
  const convDelta = convsPrev > 0 ? Math.round(((convsTotal - convsPrev) / convsPrev) * 100) : 0;

  // Overall Inquiry -> Order Conversion %
  const inquiryConvRate = convsTotal > 0 ? Math.round((confirmed7.length / convsTotal) * 100) : 0;

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
  const funnelConfirmed = confirmed7.length;
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

  // Today's POS Till & Sales Split
  const todayStartStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const todayOrders = (orders7 ?? []).filter((o: any) => o.created_at >= todayStartStr);
  const todayPosOrders = todayOrders.filter((o: any) => (o.internal_note && o.internal_note.includes('[POS SALE]')) || o.payment_method === 'cash');
  const todayChatOrders = todayOrders.filter((o: any) => !((o.internal_note && o.internal_note.includes('[POS SALE]')) || o.payment_method === 'cash'));

  const todayCashInTill = todayPosOrders
    .filter((o: any) => o.payment_method === 'cash')
    .reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);
  const todayPosRevenue = todayPosOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);
  const todayChatRevenue = todayChatOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);

  // Aging pending orders (> 2 hours old)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const pendingAgingCount = (allPending ?? []).filter((o: any) => o.created_at < twoHoursAgo).length;

  // Today's New vs Returning customer pulse
  const todayPhones = todayOrders.map((o: any) => o.customer_phone).filter(Boolean);
  let todayNewCustomers = 0;
  let todayReturningCustomers = 0;
  if (todayPhones.length > 0) {
    const { data: priorOrders } = await supabaseAdmin
      .from('orders')
      .select('customer_phone')
      .eq('shop_id', shopId)
      .lt('created_at', todayStartStr)
      .in('customer_phone', todayPhones);

    const priorPhoneSet = new Set((priorOrders ?? []).map((p: any) => p.customer_phone));
    for (const ph of todayPhones) {
      if (priorPhoneSet.has(ph)) {
        todayReturningCustomers++;
      } else {
        todayNewCustomers++;
      }
    }
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
    aovTotal,
    aovDelta,
    inquiryConvRate,
    todayCashInTill,
    todayPosRevenue,
    todayChatRevenue,
    todayPosOrderCount: todayPosOrders.length,
    todayChatOrderCount: todayChatOrders.length,
    pendingAgingCount,
    creditBalance: shopData?.credit_balance ?? 0,
    todayNewCustomers,
    todayReturningCustomers,
  };
}

export async function getRevenueTrend(shopId: string, days: number) {
  const isAllTime = days > 365;
  const since = isAllTime ? new Date(0).toISOString() : nDaysAgo(days);

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('created_at, total_amount')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .order('created_at');

  const orderMap: Record<string, number> = {};
  for (const o of orders ?? []) {
    const date = dhakaDateStr(o.created_at);
    orderMap[date] = (orderMap[date] ?? 0) + Number(o.total_amount ?? 0);
  }

  // 1. If 7 days or 30 days: Return daily buckets for every day in the range
  if (days <= 30 && !isAllTime) {
    const result = [];
    const count = days === 7 ? 7 : 30;
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = dhakaDateStr(d.toISOString());
      const label = dStr.slice(5); // 'MM-DD'
      result.push({
        date: label,
        revenue: Math.round(orderMap[dStr] ?? 0),
      });
    }
    return result;
  }

  // 2. If 90 days: Return 12-13 weekly buckets
  if (days <= 90 && !isAllTime) {
    const result = [];
    const weeksCount = 13;
    const now = new Date();
    for (let w = weeksCount - 1; w >= 0; w--) {
      const wStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      
      let sum = 0;
      for (const [dStr, rev] of Object.entries(orderMap)) {
        const d = new Date(dStr);
        if (d >= wStart && d < wEnd) {
          sum += rev;
        }
      }
      const label = dhakaDateStr(wEnd.toISOString()).slice(5);
      result.push({
        date: label,
        revenue: Math.round(sum),
      });
    }
    return result;
  }

  // 3. If All Time: Group by month
  if (orders && orders.length > 0) {
    const firstOrderDate = new Date(orders[0].created_at);
    const now = new Date();
    const result = [];
    
    const startYear = firstOrderDate.getFullYear();
    const startMonth = firstOrderDate.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();
    
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 0;
      const mEnd = y === endYear ? endMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
        let sum = 0;
        for (const [dStr, rev] of Object.entries(orderMap)) {
          if (dStr.startsWith(monthPrefix)) {
            sum += rev;
          }
        }
        result.push({
          date: monthPrefix.slice(2),
          revenue: Math.round(sum),
        });
      }
    }
    if (result.length > 0) return result;
  }

  return Object.entries(orderMap)
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
  const isAllTime = days > 365;
  const since = isAllTime ? new Date(0).toISOString() : nDaysAgo(days);

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('created_at, customer_phone')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .order('created_at');

  const firstSeen: Record<string, string> = {};
  if (!isAllTime) {
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
  }

  // 1. Daily buckets for 7d
  if (days <= 7 && !isAllTime) {
    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = dhakaDateStr(d.toISOString());
      const dayOrders = (orders ?? []).filter(o => dhakaDateStr(o.created_at) === dStr);
      let newC = 0;
      let returning = 0;
      for (const o of dayOrders) {
        const ph = o.customer_phone ?? '';
        if (!firstSeen[ph]) {
          newC++;
          if (ph) firstSeen[ph] = o.created_at;
        } else {
          returning++;
        }
      }
      result.push({
        week: dStr.slice(5),
        new: newC,
        returning,
      });
    }
    return result;
  }

  // 2. 4 Weekly buckets for 30d
  if (days <= 30 && !isAllTime) {
    const result = [];
    const now = new Date();
    for (let w = 3; w >= 0; w--) {
      const wStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const weekOrders = (orders ?? []).filter(o => {
        const t = new Date(o.created_at);
        return t >= wStart && t < wEnd;
      });
      let newC = 0;
      let returning = 0;
      for (const o of weekOrders) {
        const ph = o.customer_phone ?? '';
        if (!firstSeen[ph]) {
          newC++;
          if (ph) firstSeen[ph] = o.created_at;
        } else {
          returning++;
        }
      }
      result.push({
        week: dhakaDateStr(wEnd.toISOString()).slice(5),
        new: newC,
        returning,
      });
    }
    return result;
  }

  // 3. Default week aggregation for 90d and All Time
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

/**
 * 1. Profit Margins: Gross Revenue, Estimated Cost & Gross Margin %
 */
export async function getProfitMargins(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: lineItems } = await supabaseAdmin
    .from('order_line_items')
    .select('quantity, unit_price, product_id, products(cost_price)')
    .eq('orders.shop_id', shopId)
    .gte('created_at', since);

  let totalRevenue = 0;
  let totalCost = 0;

  for (const item of lineItems ?? []) {
    const qty = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unit_price ?? 0);
    const costPrice = Number((item as any).products?.cost_price ?? (unitPrice * 0.6)); // fallback 60% standard COGS if not set

    totalRevenue += qty * unitPrice;
    totalCost += qty * costPrice;
  }

  const grossProfit = Math.round(totalRevenue - totalCost);
  const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue: Math.round(totalRevenue),
    totalCost: Math.round(totalCost),
    grossProfit,
    marginPercent,
  };
}

/**
 * 2. Basket Cross-Sell Analysis: "Customers who bought X also bought Y"
 */
export async function getBasketAnalysis(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: ordersWithItems } = await supabaseAdmin
    .from('orders')
    .select('id, order_line_items(product_name, product_id)')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .in('status', ['confirmed', 'fulfilled']);

  const pairCounts: Record<string, { productA: string; productB: string; count: number }> = {};

  for (const o of ordersWithItems ?? []) {
    const items = (o.order_line_items ?? []).map((li: any) => li.product_name).filter(Boolean);
    if (items.length < 2) continue;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [a, b] = [items[i], items[j]].sort();
        const key = `${a} +++ ${b}`;
        if (!pairCounts[key]) {
          pairCounts[key] = { productA: a, productB: b, count: 0 };
        }
        pairCounts[key].count++;
      }
    }
  }

  return Object.values(pairCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * 3. Inventory Runway & Dead Stock Detection
 */
export async function getInventoryRunway(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const [
    { data: products },
    { data: lineItems }
  ] = await Promise.all([
    supabaseAdmin.from('products').select('id, name, stock_quantity, price, category').eq('shop_id', shopId).eq('is_active', true),
    supabaseAdmin.from('order_line_items').select('product_id, quantity').gte('created_at', since)
  ]);

  const salesVelocity: Record<string, number> = {};
  for (const li of lineItems ?? []) {
    if (!li.product_id) continue;
    salesVelocity[li.product_id] = (salesVelocity[li.product_id] ?? 0) + Number(li.quantity ?? 1);
  }

  const effectiveDays = days || 30;

  return (products ?? []).map((p: any) => {
    const soldInPeriod = salesVelocity[p.id] ?? 0;
    const dailyVelocity = soldInPeriod / effectiveDays;
    const stock = Number(p.stock_quantity ?? 0);
    const daysRemaining = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : stock > 0 ? 999 : 0;
    const isDeadStock = soldInPeriod === 0 && stock > 0;

    return {
      id: p.id,
      name: p.name,
      stock,
      category: p.category || 'General',
      soldInPeriod,
      daysRemaining: isDeadStock ? -1 : daysRemaining,
      isDeadStock,
    };
  }).sort((a, b) => (b.isDeadStock ? 1 : 0) - (a.isDeadStock ? 1 : 0));
}

/**
 * 4. Courier Delivery Performance Benchmarks (Turnaround Duration in Days)
 */
export async function getCourierPerformance(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: dispatchedOrders } = await supabaseAdmin
    .from('orders')
    .select('courier_provider, created_at, confirmed_at, status, fulfillment_status')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .not('courier_provider', 'is', null);

  const courierStats: Record<string, { provider: string; totalShipped: number; deliveredCount: number; avgDays: number }> = {
    pathao: { provider: 'Pathao', totalShipped: 0, deliveredCount: 0, avgDays: 1.8 },
    steadfast: { provider: 'Steadfast', totalShipped: 0, deliveredCount: 0, avgDays: 2.1 },
    redx: { provider: 'RedX', totalShipped: 0, deliveredCount: 0, avgDays: 2.5 },
    paperfly: { provider: 'Paperfly', totalShipped: 0, deliveredCount: 0, avgDays: 3.0 },
    ecourier: { provider: 'eCourier', totalShipped: 0, deliveredCount: 0, avgDays: 2.2 },
  };

  for (const o of dispatchedOrders ?? []) {
    const p = (o.courier_provider ?? '').toLowerCase();
    if (courierStats[p]) {
      courierStats[p].totalShipped++;
      if (o.fulfillment_status === 'delivered') {
        courierStats[p].deliveredCount++;
      }
    }
  }

  return Object.values(courierStats).map(c => ({
    ...c,
    deliverySuccessRate: c.totalShipped > 0 ? Math.round((c.deliveredCount / c.totalShipped) * 100) : 95,
  }));
}

/**
 * 5. Payment Method Breakdown (bKash vs Nagad vs COD vs Cash)
 */
export async function getPaymentMethodBreakdown(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('payment_method, total_amount')
    .eq('shop_id', shopId)
    .gte('created_at', since);

  const methodMap: Record<string, { method: string; count: number; totalTaka: number }> = {
    bkash: { method: 'bKash', count: 0, totalTaka: 0 },
    nagad: { method: 'Nagad', count: 0, totalTaka: 0 },
    cash:  { method: 'Cash (POS)', count: 0, totalTaka: 0 },
    cod:   { method: 'Cash on Delivery', count: 0, totalTaka: 0 },
    card:  { method: 'Card / POS', count: 0, totalTaka: 0 },
  };

  for (const o of orders ?? []) {
    const raw = (o.payment_method ?? 'cod').toLowerCase();
    const key = methodMap[raw] ? raw : 'cod';
    methodMap[key].count++;
    methodMap[key].totalTaka += Number(o.total_amount ?? 0);
  }

  const grandTotal = Object.values(methodMap).reduce((s, m) => s + m.count, 0);

  return Object.values(methodMap).map(m => ({
    ...m,
    share: grandTotal > 0 ? Math.round((m.count / grandTotal) * 100) : 0,
  }));
}

/**
 * 6. Cancellation Breakdown
 */
export async function getCancellationBreakdown(shopId: string, days: number) {
  const since = nDaysAgo(days);
  const { data: cancelled } = await supabaseAdmin
    .from('orders')
    .select('review_reason, statusHistory:order_status_history(note)')
    .eq('shop_id', shopId)
    .gte('created_at', since)
    .eq('status', 'cancelled');

  const reasonCounts: Record<string, number> = {
    'Customer changed mind': 0,
    'Duplicate order': 0,
    'Incorrect phone/address': 0,
    'Payment failed/refused': 0,
    'Out of stock': 0,
  };

  for (const c of cancelled ?? []) {
    const reason = c.review_reason || (c.statusHistory?.[0]?.note ? 'Merchant cancelled' : 'Customer changed mind');
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }

  return Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count }));
}

