'use server';

import { getCurrentShop } from '@/lib/supabase-admin';
import {
  getRevenueTrend,
  getPeakOrderTimes,
  getCustomerGrowth,
  getTopRegions,
  getChannelPerformance,
  getTopProducts,
  getPaymentStats,
} from '@/lib/analytics';

export async function fetchAnalyticsByRange(rawRange: number) {
  const shop = await getCurrentShop();
  if (!shop) throw new Error('Unauthorized');

  const days = rawRange === 0 ? 3650 : [7, 30, 90].includes(rawRange) ? rawRange : 30;

  const [
    revenueTrend,
    peakTimes,
    customerGrowth,
    topRegions,
    channelPerformance,
    topProducts,
    paymentStats,
  ] = await Promise.all([
    getRevenueTrend(shop.id, days),
    getPeakOrderTimes(shop.id, days),
    getCustomerGrowth(shop.id, days),
    getTopRegions(shop.id, days),
    getChannelPerformance(shop.id, days),
    getTopProducts(shop.id, days),
    getPaymentStats(shop.id, days),
  ]);

  return {
    revenueTrend,
    peakTimes,
    customerGrowth,
    topRegions,
    channelPerformance,
    topProducts,
    paymentStats,
  };
}
