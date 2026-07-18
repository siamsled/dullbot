import { getCurrentShop } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';
import {
  getRevenueTrend,
  getPeakOrderTimes,
  getCustomerGrowth,
  getTopRegions,
  getChannelPerformance,
  getTopProducts,
  getPaymentStats
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const shop = await getCurrentShop();
  if (!shop) {
    redirect('/login');
  }

  const { range } = await searchParams;
  const rawRange = Number(range);
  // 0 = all time (use 3650 days as proxy); default to 30
  const days = rawRange === 0 ? 3650 : [7, 30, 90].includes(rawRange) ? rawRange : 30;
  // active value passed to client for button highlight (0 means All Time pill is active)
  const activeRange = rawRange === 0 ? 0 : days;

  const [
    revenueTrend,
    peakTimes,
    customerGrowth,
    topRegions,
    channelPerformance,
    topProducts,
    paymentStats
  ] = await Promise.all([
    getRevenueTrend(shop.id, days),
    getPeakOrderTimes(shop.id, days),
    getCustomerGrowth(shop.id, days),
    getTopRegions(shop.id, days),
    getChannelPerformance(shop.id, days),
    getTopProducts(shop.id, days),
    getPaymentStats(shop.id, days)
  ]);

  return (
    <AnalyticsClient
      range={activeRange}

      revenueTrend={revenueTrend}
      peakTimes={peakTimes}
      customerGrowth={customerGrowth}
      topRegions={topRegions}
      channelPerformance={channelPerformance}
      topProducts={topProducts}
      paymentStats={paymentStats}
    />
  );
}
