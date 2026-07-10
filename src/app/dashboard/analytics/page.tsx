import { supabaseAdmin } from '@/lib/supabase-admin';
import AnalyticsClient from './AnalyticsClient';



// Map phone prefixes to carrier/region names
function classifyCarrier(phone: string): string {
  const normalized = phone.replace(/^\+880/, '0').replace(/\D/g, '');
  const prefix = normalized.slice(0, 4);
  const carriers: Record<string, string> = {
    '0171': 'GP', '0172': 'Robi', '0173': 'GP', '0174': 'Robi',
    '0175': 'Teletalk', '0176': 'Robi', '0177': 'Teletalk',
    '0178': 'BL', '0179': 'BL', '0180': 'BL', '0181': 'Robi',
    '0182': 'GP', '0183': 'GP', '0184': 'Robi', '0185': 'BL', '0186': 'BL',
    '0188': 'Robi', '0189': 'BL', '0190': 'BL', '0191': 'GP',
  };
  return carriers[prefix] ?? 'Other';
}

export default async function AnalyticsPage() {
  const shopSlug = 'dull-store';

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id')
    .eq('slug', shopSlug)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  // Parallel fetch
  const [
    { data: usageLogs },
    { data: conversations },
    { data: orders },
  ] = await Promise.all([
    supabaseAdmin.from('usage_logs').select('created_at, billed_credits').eq('shop_id', shop.id).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('created_at'),
    supabaseAdmin.from('conversations').select('id, customer_phone, status').eq('shop_id', shop.id),
    supabaseAdmin.from('orders').select('id, status').eq('shop_id', shop.id),
  ]);

  // Fetch messages for escalation analysis (human_takeover conversations)
  const humanConvIds = (conversations ?? []).filter((c: any) => c.status === 'human_takeover').map((c: any) => c.id);
  const { data: humanMessages } = humanConvIds.length > 0
    ? await supabaseAdmin.from('messages').select('content, sender').in('conversation_id', humanConvIds.slice(0, 20)).eq('sender', 'customer').limit(50)
    : { data: [] };

  // Daily credits for AreaChart
  const dailyMap: Record<string, number> = {};
  for (const log of usageLogs ?? []) {
    const date = log.created_at.slice(0, 10);
    dailyMap[date] = (dailyMap[date] ?? 0) + (log.billed_credits ?? 0);
  }
  const dailyCredits = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, credits]) => ({ date: date.slice(5), credits: parseFloat(credits.toFixed(4)) }));

  // Carrier distribution
  const carrierMap: Record<string, number> = {};
  for (const conv of conversations ?? []) {
    const carrier = classifyCarrier(conv.customer_phone ?? '');
    carrierMap[carrier] = (carrierMap[carrier] ?? 0) + 1;
  }
  const carrierDistribution = Object.entries(carrierMap)
    .sort(([, a], [, b]) => b - a)
    .map(([carrier, count]) => ({ carrier, count }));

  // Funnel data
  const totalConversations = (conversations ?? []).length;
  const botReplied = (usageLogs ?? []).filter(l => !l.billed_credits || l.billed_credits >= 0).length > 0
    ? (conversations ?? []).filter(c => c.status !== 'bot_active' || true).length // all convs got a reply
    : 0;
  const confirmedOrders = (orders ?? []).filter(o => o.status === 'confirmed' || o.status === 'fulfilled').length;

  const funnelData = [
    { name: 'Inquiries', value: totalConversations, fill: '#e8d5c0' },
    { name: 'Bot Replied', value: Math.min(botReplied, totalConversations), fill: '#c9b8a0' },
    { name: 'Confirmed', value: confirmedOrders, fill: '#1c1917' },
  ];

  // Simple prefix-cluster "unanswered" questions from human-escalated conversations
  const topUnanswered = [...new Set((humanMessages ?? []).map(m => m.content).filter(Boolean))].slice(0, 5);

  // Stats
  const totalReplies = (usageLogs ?? []).length;
  const geminiReplies = (usageLogs ?? []).filter(l => !l.billed_credits || true).length; // all logged calls
  const resolutionRate = totalConversations > 0
    ? Math.round((confirmedOrders / totalConversations) * 100)
    : 0;
  const totalCreditsSpent = (usageLogs ?? []).reduce((s, l) => s + (l.billed_credits ?? 0), 0);

  const stats = [
    { label: 'Total Conversations', value: totalConversations.toLocaleString(), sub: 'All time' },
    { label: 'Orders Confirmed', value: confirmedOrders.toLocaleString(), sub: 'Confirmed + fulfilled' },
    { label: 'Resolution Rate', value: `${resolutionRate}%`, sub: 'Orders / conversations' },
    { label: 'Credits Used', value: totalCreditsSpent.toFixed(3), sub: 'Last 30 days' },
  ];

  return (
    <AnalyticsClient
      dailyCredits={dailyCredits}
      carrierDistribution={carrierDistribution}
      funnelData={funnelData}
      stats={stats}
      topUnanswered={topUnanswered}
    />
  );
}
