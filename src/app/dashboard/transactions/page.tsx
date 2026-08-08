import { redirect } from 'next/navigation';
import { getCurrentShop } from '@/lib/supabase-admin';
import TransactionsClient from './TransactionsClient';
import { getShopTransactionsAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const shop = await getCurrentShop();
  if (!shop) {
    redirect('/login');
  }

  const res = await getShopTransactionsAction();

  return (
    <TransactionsClient
      shop={shop}
      initialTransactions={res.transactions || []}
      initialDevices={res.devices || []}
    />
  );
}
