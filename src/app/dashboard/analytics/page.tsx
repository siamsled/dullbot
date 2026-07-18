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
  const days = Number(range) === 7 ? 7 : Number(range) === 90 ? 90 : 30;

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
      range={days}
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
