'use client';

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Package, Clock, CheckCircle2, Search } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

type Order = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  status: string;
  totalAmount: number | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_verification: { label: 'Pending',    color: 'text-rust', bg: 'bg-apricot-wash border-rust/10' },
  confirmed:           { label: 'Confirmed',   color: 'text-ink',  bg: 'bg-fog border-dove/20' },
  fulfilled:           { label: 'Fulfilled',   color: 'text-ink',  bg: 'bg-sky-wash border-dove/10' },
  cancelled:           { label: 'Cancelled',   color: 'text-graphite', bg: 'bg-fog border-dove/10' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-graphite', bg: 'bg-fog border-dove/10' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function fmt(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrdersClient({ shopId, orders: initial }: { shopId: string; orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initial);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel(`orders:${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const o = payload.new as any;
            setOrders(prev => [{
              id: o.id,
              createdAt: o.created_at,
              customerName: o.customer_name ?? '—',
              customerPhone: o.customer_phone ?? '—',
              productName: 'New order',
              status: o.status ?? 'pending_verification',
              totalAmount: o.total_amount ?? null,
            }, ...prev]);
          }
          if (payload.eventType === 'UPDATE') {
            const o = payload.new as any;
            setOrders(prev => prev.map(ord =>
              ord.id === o.id ? { ...ord, status: o.status, totalAmount: o.total_amount ?? ord.totalAmount } : ord
            ));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId]);

  const filtered = orders.filter(o => {
    const matchSearch =
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.productName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total     = orders.length;
  const pending   = orders.filter(o => o.status === 'pending_verification').length;
  const fulfilled = orders.filter(o => o.status === 'fulfilled').length;

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
  };

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Orders</h1>
          <p className="text-ash text-sm">Track and manage your customer purchases.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite" />
            <input
              type="text"
              placeholder="Search orders…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all w-52 shadow-subtle"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 bg-white border border-dove/30 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-all shadow-subtle appearance-none"
          >
            <option value="all">All statuses</option>
            <option value="pending_verification">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
        </div>
      </motion.div>

      {/* Stat tiles */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-6 mb-8"
      >
        {[
          { label: 'Total Orders',  value: total,     icon: Package,     bg: 'bg-fog',          iconColor: 'text-graphite' },
          { label: 'Pending',       value: pending,   icon: Clock,       bg: 'bg-apricot-wash', iconColor: 'text-rust' },
          { label: 'Fulfilled',     value: fulfilled, icon: CheckCircle2, bg: 'bg-sky-wash',     iconColor: 'text-ink' },
        ].map(({ label, value, icon: Icon, bg, iconColor }) => (
          <motion.div
            key={label}
            variants={item}
            className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all flex flex-col justify-between h-28 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between z-10">
              <p className="text-[10px] font-semibold text-graphite uppercase tracking-wider">{label}</p>
              <div className={`p-1.5 ${bg} rounded-lg ${iconColor} border border-dove/5`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[32px] font-serif text-ink tracking-tight font-medium leading-none z-10">{value}</p>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-fog rounded-full opacity-30 group-hover:scale-[1.3] transition-all duration-500" />
          </motion.div>
        ))}
      </motion.div>

      {/* Orders table */}
      <motion.div variants={item} initial="hidden" animate="show" className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-dove/15 flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">All Orders</h2>
          <span className="text-[11px] font-semibold text-graphite">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dove/15 bg-fog/30">
                {['Customer', 'Product', 'Amount', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-fog rounded-full flex items-center justify-center mb-3 text-graphite border border-dove/5">
                        <Package className="w-5 h-5 opacity-40" />
                      </div>
                      <p className="text-sm font-semibold text-ink mb-1">
                        {orders.length === 0 ? 'No orders yet' : 'No results'}
                      </p>
                      <p className="text-xs text-ash max-w-xs leading-relaxed">
                        {orders.length === 0
                          ? 'Orders confirmed via the AI chat pipeline will appear here automatically.'
                          : 'Try adjusting your search or filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-fog/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-ink leading-tight">{o.customerName}</p>
                      <p className="text-xs text-graphite font-mono mt-0.5">{o.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink max-w-[200px] truncate">{o.productName}</td>
                    <td className="px-6 py-4 text-sm text-ink font-semibold">
                      {o.totalAmount != null ? `৳${o.totalAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-ash whitespace-nowrap">{fmt(o.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-graphite font-mono opacity-0 group-hover:opacity-60 transition-opacity">
                        #{o.id.slice(0, 8)}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
