import { getCurrentShop } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';
import { fetchAnalyticsByRange } from './actions';

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
  const activeRange = rawRange === 0 ? 0 : [7, 30, 90].includes(rawRange) ? rawRange : 30;

  // Pre-fetch all standard ranges concurrently so client toggles are instant
  const [data7, data30, data90, data0] = await Promise.all([
    fetchAnalyticsByRange(7),
    fetchAnalyticsByRange(30),
    fetchAnalyticsByRange(90),
    fetchAnalyticsByRange(0)
  ]);

  const initialData = {
    7: data7,
    30: data30,
    90: data90,
    0: data0
  };

  return <AnalyticsClient initialRange={activeRange} initialData={initialData} />;
}
