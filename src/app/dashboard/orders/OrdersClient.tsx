'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Package, Clock, CheckCircle2, Search, ArrowRight, ShieldAlert,
  AlertTriangle, Filter, ClipboardList, HelpCircle, X, ExternalLink,
  ChevronRight, Calendar, User, Truck, Check, RefreshCw, Download,
  Printer, ChevronDown, Smartphone, ShieldCheck, ShoppingBag, Banknote, Hourglass,
  Sparkles, Phone, MapPin, Receipt, ArrowUpRight, Repeat
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { OrdersListSkeleton } from '@/components/ui/SkeletonLoaders';
import PosModal from './PosModal';
import { generatePrintHTML, ReceiptCustomConfig } from '@/lib/receipt-generator';
import {
  verifyPaymentManually, dispatchToCourier, dispatchToCourierWithProvider, cancelOrder,
  updateInternalNote, toggleNeedsReview, bulkConfirmPayment,
  bulkDispatchToCourier
} from './actions';
import { CourierLogo } from '@/components/ui/CourierLogos';

type LineItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  imageUrl: string | null;
};

type StatusHistory = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

type Order = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  totalAmount: number | null;
  paymentMethod: string | null;
  paymentVerifiedAt: string | null;
  paymentTransactionRef: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  courierProvider: string | null;
  courierTrackingId: string | null;
  fulfillmentStatus: string;
  internalNote: string;
  lineItems: LineItem[];
  statusHistory: StatusHistory[];
  paymentVerifications: any[];
};

const FULFILLMENT_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  awaiting_dispatch: { label: 'Awaiting Dispatch', bg: 'bg-fog border-dove/20', text: 'text-ink' },
  dispatched: { label: 'Dispatched', bg: 'bg-sky-wash border-blue-200', text: 'text-blue-700' },
  in_transit: { label: 'In Transit', bg: 'bg-sky-wash border-blue-200', text: 'text-blue-700' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
};

function fmt(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OrdersClient({ shopId, orders: initial }: { shopId: string; orders: Order[] }) {
  const { data: fetchedOrders = initial, isLoading: loadingOrders, isFetching } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => initial,
    initialData: initial,
    staleTime: 1000 * 60 * 5,
  });

  const [orders, setOrders] = useState<Order[]>(fetchedOrders);

  useEffect(() => {
    setOrders(fetchedOrders);
  }, [fetchedOrders]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Funnel filtering state
  const [activeStage, setActiveStage] = useState<string>('all');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Slide-over interactive forms state
  const [manualTrxRef, setManualTrxRef] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>('pathao');

  // Print Manager state
  const [printModalOrders, setPrintModalOrders] = useState<Order[]>([]);
  const [printDocType, setPrintDocType] = useState<'receipt' | 'packing_slip' | 'label'>('receipt');
  const [printCopies, setPrintCopies] = useState(1);
  const [printPageSize, setPrintPageSize] = useState<'thermal_80mm' | 'a4'>('thermal_80mm');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // POS State
  const [posModalOpen, setPosModalOpen] = useState(false);

  const activeOrder = orders.find(o => o.id === activeOrderId);

  useEffect(() => {
    if (activeOrder) {
      setInternalNoteInput(activeOrder.internalNote);
    }
  }, [activeOrderId]);

  // Realtime Supabase Sync
  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`orders-lifecycle:${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` },
        async (payload) => {
          const raw = payload.new as any;
          if (payload.eventType === 'INSERT') {
            const { data: lineItems } = await supabaseBrowser
              .from('order_line_items')
              .select('*')
              .eq('order_id', raw.id);

            const { data: statusHistory } = await supabaseBrowser
              .from('order_status_history')
              .select('*')
              .eq('order_id', raw.id)
              .order('created_at', { ascending: true });

            setOrders(prev => [{
              id: raw.id,
              createdAt: raw.created_at,
              customerName: raw.customer_name ?? '—',
              customerPhone: raw.customer_phone ?? '—',
              customerAddress: raw.customer_address ?? '—',
              status: raw.status ?? 'pending_verification',
              totalAmount: raw.total_amount ?? null,
              paymentMethod: raw.payment_method ?? null,
              paymentVerifiedAt: raw.payment_verified_at ?? null,
              paymentTransactionRef: raw.payment_transaction_ref ?? null,
              needsReview: raw.needs_review ?? false,
              reviewReason: raw.review_reason ?? null,
              courierProvider: raw.courier_provider ?? null,
              courierTrackingId: raw.courier_tracking_id ?? null,
              fulfillmentStatus: raw.fulfillment_status ?? 'awaiting_dispatch',
              internalNote: raw.internal_note ?? '',
              lineItems: lineItems ?? [],
              statusHistory: statusHistory ?? [],
              paymentVerifications: []
            }, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const { data: lineItems } = await supabaseBrowser
              .from('order_line_items')
              .select('*')
              .eq('order_id', raw.id);

            const { data: statusHistory } = await supabaseBrowser
              .from('order_status_history')
              .select('*')
              .eq('order_id', raw.id)
              .order('created_at', { ascending: true });

            setOrders(prev => prev.map((o: Order) =>
              o.id === raw.id ? {
                ...o,
                status: raw.status,
                totalAmount: raw.total_amount ?? o.totalAmount,
                paymentMethod: raw.payment_method ?? o.paymentMethod,
                paymentVerifiedAt: raw.payment_verified_at ?? o.paymentVerifiedAt,
                paymentTransactionRef: raw.payment_transaction_ref ?? o.paymentTransactionRef,
                needsReview: raw.needs_review ?? false,
                reviewReason: raw.review_reason ?? null,
                courierProvider: raw.courier_provider ?? o.courierProvider,
                courierTrackingId: raw.courier_tracking_id ?? o.courierTrackingId,
                fulfillmentStatus: raw.fulfillment_status ?? o.fulfillmentStatus,
                internalNote: raw.internal_note ?? '',
                lineItems: lineItems ?? o.lineItems,
                statusHistory: statusHistory ?? o.statusHistory,
                paymentVerifications: o.paymentVerifications ?? []
              } : o
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [shopId]);

  // Stage filters matching main stages and off-funnel categories
  const filterByStage = (order: Order) => {
    if (activeStage === 'all') return true;
    if (activeStage === 'pending_payment') return order.status === 'pending_verification';
    if (activeStage === 'confirmed') return order.status === 'confirmed' && order.fulfillmentStatus === 'awaiting_dispatch';
    if (activeStage === 'dispatched') return order.fulfillmentStatus === 'dispatched' || order.fulfillmentStatus === 'in_transit';
    if (activeStage === 'delivered') return order.fulfillmentStatus === 'delivered';
    if (activeStage === 'needs_review') return order.needsReview;
    if (activeStage === 'cancelled') return order.status === 'cancelled' || order.fulfillmentStatus === 'cancelled';
    return true;
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      (o.courierTrackingId && o.courierTrackingId.toLowerCase().includes(search.toLowerCase())) ||
      (o.paymentTransactionRef && o.paymentTransactionRef.toLowerCase().includes(search.toLowerCase())) ||
      o.lineItems.some(li => li.product_name.toLowerCase().includes(search.toLowerCase()));

    return matchSearch && filterByStage(o);
  });

  // Calculate funnel numbers dynamically
  const countPending = orders.filter(o => o.status === 'pending_verification').length;
  const countConfirmed = orders.filter(o => o.status === 'confirmed' && orderIsAwaitingDispatch(o)).length;
  const countDispatched = orders.filter(o => o.fulfillmentStatus === 'dispatched' || o.fulfillmentStatus === 'in_transit').length;
  const countDelivered = orders.filter(o => o.fulfillmentStatus === 'delivered').length;
  const countNeedsReview = orders.filter(o => o.needsReview).length;
  const countCancelled = orders.filter(o => o.status === 'cancelled' || o.fulfillmentStatus === 'cancelled').length;

  function orderIsAwaitingDispatch(o: Order) {
    return o.fulfillmentStatus === 'awaiting_dispatch' || !o.fulfillmentStatus;
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Funnel elements list
  const mainFunnel = [
    { key: 'all', label: 'All Orders', count: orders.length, icon: Package, desc: 'Full order history' },
    { key: 'pending_payment', label: 'Pending Payment', count: countPending, icon: Clock, desc: 'Needs TrxID check' },
    { key: 'confirmed', label: 'Ready to Dispatch', count: countConfirmed, icon: CheckCircle2, desc: 'Payment confirmed' },
    { key: 'dispatched', label: 'In Transit', count: countDispatched, icon: Truck, desc: 'Courier dispatched' },
    { key: 'delivered', label: 'Delivered', count: countDelivered, icon: Check, desc: 'Completed orders' },
  ];

  // Actions overrides
  const handleVerifyPayment = async () => {
    if (!activeOrderId || !manualTrxRef.trim()) return;
    setIsVerifying(true);
    const res = await verifyPaymentManually(activeOrderId, manualTrxRef.trim());
    setIsVerifying(false);
    if (res.success) {
      setManualTrxRef('');
    } else {
      alert(`Manual verification failed: ${res.error}`);
    }
  };

  const handleDispatch = async () => {
    if (!activeOrderId) return;
    setIsDispatching(true);
    const res = await dispatchToCourierWithProvider(activeOrderId, selectedCourier);
    setIsDispatching(false);
    if (!res.success) {
      alert(`Shipment booking failed: ${res.error}`);
    }
  };

  // ── Print Manager ──────────────────────────────────────────────────────────
  const openPrintManager = (targets: Order[]) => {
    if (targets.length === 0) return;
    setPrintModalOrders(targets);
    setPrintModalOpen(true);
  };

  const getReceiptConfig = (): ReceiptCustomConfig | undefined => {
    try {
      const saved = localStorage.getItem('dullbot_receipt_custom_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return undefined;
  };

  const buildPrintDocument = (targets: Order[], docType: typeof printDocType, copies: number, pageSize: typeof printPageSize) => {
    const config = getReceiptConfig();
    return generatePrintHTML(targets as any, docType, copies, pageSize, config);
  };

  const handlePrintReceipts = (targets: Order[]) => openPrintManager(targets);

  const handleCancel = async () => {
    if (!activeOrderId || !cancellationReason.trim()) return;
    setIsCancelling(true);
    const res = await cancelOrder(activeOrderId, cancellationReason.trim());
    setIsCancelling(false);
    if (res.success) {
      setCancellationReason('');
    } else {
      alert(`Cancellation failed: ${res.error}`);
    }
  };

  const handleSaveNote = async () => {
    if (!activeOrderId) return;
    setIsSavingNote(true);
    const res = await updateInternalNote(activeOrderId, internalNoteInput.trim());
    setIsSavingNote(false);
    if (!res.success) {
      alert(`Failed to save note: ${res.error}`);
    }
  };

  const handleToggleReview = async () => {
    if (!activeOrderId || !activeOrder) return;
    const nextState = !activeOrder.needsReview;
    const res = await toggleNeedsReview(activeOrderId, nextState, nextState ? 'Manual merchant flag' : undefined);
    if (!res.success) {
      alert(`Failed to update review state: ${res.error}`);
    }
  };

  // Bulk Actions Handlers
  const handleBulkVerify = async () => {
    const list = Array.from(selectedIds);
    if (confirm(`Confirm payment verification for ${list.length} orders?`)) {
      const res = await bulkConfirmPayment(list);
      if (res.success) {
        setSelectedIds(new Set());
      } else {
        alert(res.error);
      }
    }
  };

  const handleBulkDispatch = async () => {
    const list = Array.from(selectedIds);
    if (confirm(`Dispatch ${list.length} orders to courier in batch?`)) {
      const res = await bulkDispatchToCourier(list);
      if (res.success) {
        setSelectedIds(new Set());
        alert(`Successfully dispatched ${res.successCount} orders. Failed: ${res.failCount}.`);
      } else {
        alert(res.error);
      }
    }
  };

  // CSV Export Utility
  const handleExportCSV = (targets?: Order[]) => {
    const rows = targets || filtered;
    if (rows.length === 0) return alert('No orders to export.');

    const headers = ['Order ID', 'Customer Name', 'Customer Phone', 'Total Amount', 'Status', 'Fulfillment', 'Courier Provider', 'Tracking ID', 'Transaction Ref', 'Date'];
    const csvContent = [
      headers.join(','),
      ...rows.map(o => [
        o.id,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.customerPhone,
        o.totalAmount || 0,
        o.status,
        o.fulfillmentStatus,
        o.courierProvider || '',
        o.courierTrackingId || '',
        o.paymentTransactionRef || '',
        o.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dullbot_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } }
  };

  // POS & Till Calculations
  const todayTimestamp = Date.now() - 24 * 60 * 60 * 1000;
  const todayOrders = orders.filter(o => new Date(o.createdAt).getTime() >= todayTimestamp);
  const todayCashInTill = todayOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const todayPosOrders = todayOrders.filter(o => (o.internalNote && o.internalNote.includes('[POS SALE]')) || o.paymentMethod === 'cash');
  const todayChatOrders = todayOrders.filter(o => !((o.internalNote && o.internalNote.includes('[POS SALE]')) || o.paymentMethod === 'cash'));
  const todayPosRevenue = todayPosOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const todayChatRevenue = todayChatOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Aging Pending Verification (> 2 hours old)
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const agingPendingCount = orders.filter(o => o.status === 'pending_verification' && new Date(o.createdAt).getTime() < twoHoursAgo).length;

  return (
    <div className="flex-1 w-full bg-pure-white dark:bg-[#09090b]">
      <div className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 relative">

        {/* ── 1. HEADER & MAIN ACTIONS ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dove/15 dark:border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-serif text-ink dark:text-zinc-100 tracking-tight font-bold">Orders</h1>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-wash text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-sky-800 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" /> Live Sync…
                </span>
              )}
            </div>
            <p className="text-ash dark:text-zinc-400 text-xs sm:text-sm mt-1">
              Review payments, dispatch couriers, and process in-person retail POS checkout sales.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleExportCSV()}
              className="flex items-center gap-1.5 px-4 py-2 bg-fog dark:bg-zinc-900 border border-dove/20 dark:border-zinc-800 text-ink dark:text-zinc-200 font-bold rounded-full hover:bg-dove/15 dark:hover:bg-zinc-800 transition-all text-xs shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setPosModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-ink dark:bg-white text-white dark:text-black font-bold rounded-full hover:bg-black dark:hover:bg-zinc-200 transition-all text-xs shadow-xs cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              New POS Order
            </button>
          </div>
        </div>

        {/* ── 2. OPERATIONAL KPI STRIP ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cash in Till */}
          <div className="bg-white dark:bg-zinc-950/80 rounded-3xl p-5 border border-dove/20 dark:border-zinc-800/80 shadow-xs hover:border-dove/40 dark:hover:border-zinc-700 transition-all flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-ash dark:text-zinc-400 uppercase tracking-wider block mb-1">Today's Cash in Till</span>
              <p className="text-2xl font-serif font-bold text-ink dark:text-zinc-100 leading-none font-mono">৳{todayCashInTill.toLocaleString()}</p>
              <span className="text-[10px] text-ash dark:text-zinc-400 mt-1 block">Physical register drawer cash</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
              <Banknote className="w-6 h-6" />
            </div>
          </div>

          {/* Sales Origin Split (POS vs Chat) */}
          <div className="bg-white dark:bg-zinc-950/80 rounded-3xl p-5 border border-dove/20 dark:border-zinc-800/80 shadow-xs hover:border-dove/40 dark:hover:border-zinc-700 transition-all flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-ash dark:text-zinc-400 uppercase tracking-wider block mb-1">Today's Sales Channel Split</span>
              <div className="flex items-center gap-3 mt-1">
                <div>
                  <span className="text-sm font-bold text-ink dark:text-zinc-100 font-mono">৳{todayPosRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-ash dark:text-zinc-400 block font-medium">🛍️ POS ({todayPosOrders.length})</span>
                </div>
                <div className="w-px h-6 bg-dove/20 dark:bg-zinc-800" />
                <div>
                  <span className="text-sm font-bold text-ink dark:text-zinc-100 font-mono">৳{todayChatRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-ash dark:text-zinc-400 block font-medium">💬 Chat AI ({todayChatOrders.length})</span>
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sky-wash text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200/50 dark:border-sky-800/50 shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Verification Aging */}
          <div className={`rounded-3xl p-5 border shadow-xs flex items-center justify-between transition-all ${
            agingPendingCount > 0 
              ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/25 dark:border-rose-800/50' 
              : 'bg-white dark:bg-zinc-950/80 border border-dove/20 dark:border-zinc-800/80'
          }`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${agingPendingCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-ash dark:text-zinc-400'}`}>
                Payment Verification Aging
              </span>
              <p className="text-2xl font-serif font-bold text-ink dark:text-zinc-100 leading-none font-mono">
                {agingPendingCount} {agingPendingCount === 1 ? 'order' : 'orders'}
              </p>
              <span className={`text-[10px] mt-1 block ${agingPendingCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ash dark:text-zinc-400'}`}>
                {agingPendingCount > 0 ? '⚠️ Awaiting check > 2 hours' : 'All verifications up to date'}
              </span>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs border ${
              agingPendingCount > 0 ? 'bg-white dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60' : 'bg-fog text-ash border-dove/10 dark:bg-zinc-900 dark:border-zinc-800'
            }`}>
              <Hourglass className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ── 3. LIFECYCLE FUNNEL PILLS ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Main Funnel Stages */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-950/80 rounded-3xl shadow-xs border border-dove/20 dark:border-zinc-800/80 p-2 flex flex-wrap sm:flex-nowrap gap-1.5 items-stretch">
            {mainFunnel.map((stage) => {
              const isActive = activeStage === stage.key;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setActiveStage(stage.key)}
                  className={`flex-1 min-w-[120px] flex flex-col p-3 rounded-2xl border transition-all text-left group active:scale-[0.98] ${
                    isActive
                      ? 'bg-ink border-ink text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-950/40 border-transparent hover:bg-fog dark:hover:bg-zinc-900 text-ink dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/90' : 'text-ash group-hover:text-ink dark:text-zinc-400 dark:group-hover:text-zinc-200'}`}>
                      {stage.label}
                    </span>
                    <stage.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-ash dark:text-zinc-500'}`} />
                  </div>
                  <span className="text-xl font-serif font-bold leading-none mb-0.5 font-mono">{stage.count}</span>
                  <span className={`text-[9px] ${isActive ? 'text-white/70' : 'text-ash dark:text-zinc-400'}`}>{stage.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Off-Funnel: Needs Review & Cancelled */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            {/* Needs Review */}
            <button
              type="button"
              onClick={() => setActiveStage(activeStage === 'needs_review' ? 'all' : 'needs_review')}
              className={`p-3.5 flex flex-col justify-between rounded-3xl border text-left transition-all active:scale-[0.98] ${
                activeStage === 'needs_review'
                  ? 'bg-ink border-ink text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white'
                  : 'bg-white dark:bg-zinc-950/80 border-dove/20 dark:border-zinc-800/80 hover:border-amber-300 dark:hover:border-amber-500/40 text-ink dark:text-zinc-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStage === 'needs_review' ? 'text-white/90' : 'text-amber-700 dark:text-amber-400'}`}>
                  Needs Review
                </span>
                <AlertTriangle className={`w-3.5 h-3.5 ${activeStage === 'needs_review' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <div className="mt-2">
                <span className="text-xl font-serif font-bold leading-none font-mono">{countNeedsReview}</span>
                <p className="text-[9px] text-ash dark:text-zinc-400 mt-0.5">Discrepancy flags</p>
              </div>
            </button>

            {/* Cancelled */}
            <button
              type="button"
              onClick={() => setActiveStage(activeStage === 'cancelled' ? 'all' : 'cancelled')}
              className={`p-3.5 flex flex-col justify-between rounded-3xl border text-left transition-all active:scale-[0.98] ${
                activeStage === 'cancelled'
                  ? 'bg-ink border-ink text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white'
                  : 'bg-white dark:bg-zinc-950/80 border-dove/20 dark:border-zinc-800/80 hover:border-rose-300 dark:hover:border-rose-500/40 text-ink dark:text-zinc-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStage === 'cancelled' ? 'text-white/90' : 'text-ash dark:text-zinc-400'}`}>
                  Cancelled
                </span>
                <X className={`w-3.5 h-3.5 ${activeStage === 'cancelled' ? 'text-white' : 'text-ash dark:text-zinc-500'}`} />
              </div>
              <div className="mt-2">
                <span className="text-xl font-serif font-bold leading-none font-mono">{countCancelled}</span>
                <p className="text-[9px] text-ash dark:text-zinc-400 mt-0.5">Aborted orders</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── 4. FILTER & SEARCH BAR ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ash dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search customer, phone, tracking ID, or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900/90 border border-dove/20 dark:border-zinc-800 rounded-full text-xs focus:outline-none focus:border-ink dark:focus:border-zinc-500 focus:ring-1 focus:ring-ink dark:focus:ring-zinc-500 transition-all shadow-xs text-ink dark:text-zinc-100 placeholder:text-ash dark:placeholder:text-zinc-500"
            />
          </div>
          {activeStage !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveStage('all')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rust dark:text-orange-400 hover:bg-apricot-wash dark:hover:bg-orange-950/30 rounded-full transition-colors self-start border border-dashed border-rust/30 dark:border-orange-500/30"
            >
              Filter Active: {activeStage.replace('_', ' ')} <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── 5. BATCH ACTION FLOATING TOOLBAR ────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink dark:bg-zinc-900 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-5 border border-white/10 dark:border-zinc-700 backdrop-blur-md"
            >
              <span className="text-xs font-bold text-white/90 font-mono">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-white/20 dark:bg-zinc-700" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkVerify}
                  className="px-3.5 py-1.5 bg-white text-ink dark:bg-white dark:text-black font-bold rounded-full text-xs hover:bg-white/90 transition-colors shadow-xs"
                >
                  Confirm Payments
                </button>
                <button
                  type="button"
                  onClick={handleBulkDispatch}
                  className="px-3.5 py-1.5 bg-white/10 text-white font-bold rounded-full text-xs hover:bg-white/20 transition-colors"
                >
                  Dispatch Courier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetList = orders.filter(o => selectedIds.has(o.id));
                    handlePrintReceipts(targetList);
                  }}
                  className="px-3.5 py-1.5 bg-white/10 text-white font-bold rounded-full text-xs hover:bg-white/20 transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetList = orders.filter(o => selectedIds.has(o.id));
                    handleExportCSV(targetList);
                  }}
                  className="px-3.5 py-1.5 bg-white/10 text-white font-bold rounded-full text-xs hover:bg-white/20 transition-colors"
                >
                  Export CSV
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-white/60 hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 6. ORDERS TABLE ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-950/80 rounded-3xl shadow-xs border border-dove/20 dark:border-zinc-800/80">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-30 shadow-xs">
              <tr className="border-b border-dove/15 dark:border-zinc-800/80">
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-5 py-4 w-12 border-b border-dove/15 dark:border-zinc-800/80 first:rounded-tl-3xl shadow-xs">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-zinc-500 cursor-pointer accent-zinc-900 dark:accent-white"
                  />
                </th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Customer</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Delivery Address</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Product(s)</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Amount</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Payment</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Fulfillment</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Courier</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap shadow-xs">Date</th>
                <th className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-5 py-4 text-[11px] font-bold text-zinc-400 dark:text-zinc-400 font-mono border-b border-dove/15 dark:border-zinc-800/80 whitespace-nowrap text-right last:rounded-tr-3xl shadow-xs">
                  {filtered.length} row{filtered.length !== 1 ? 's' : ''}
                </th>
              </tr>
            </thead>
              <tbody className="divide-y divide-dove/10 dark:divide-zinc-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-fog dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-ash dark:text-zinc-500 border border-dove/10 dark:border-zinc-800">
                          <Package className="w-6 h-6 opacity-40" />
                        </div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">No orders found</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                          Try adjusting your search query or selecting a different funnel stage filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => {
                    const itemsCount = o.lineItems.reduce((acc, li) => acc + li.quantity, 0);
                    const firstItemName = o.lineItems[0]?.product_name ?? 'Catalog Product';
                    const titleString = itemsCount > 1 ? `${firstItemName} +${itemsCount - 1}` : firstItemName;
                    const isChecked = selectedIds.has(o.id);
                    const fConfig = FULFILLMENT_COLORS[o.fulfillmentStatus] ?? { label: o.fulfillmentStatus, bg: 'bg-fog dark:bg-zinc-900 border-dove/20 dark:border-zinc-800', text: 'text-zinc-700 dark:text-zinc-300' };

                    // Find repeat customer: has prior orders in database
                    const priorOrdersCount = orders.filter(item => item.customerPhone && item.customerPhone !== 'Walk-in' && item.customerPhone === o.customerPhone).length;
                    const isRepeatCustomer = priorOrdersCount > 1;

                    return (
                      <motion.tr
                        key={o.id}
                        variants={itemVariants}
                        onClick={() => setActiveOrderId(o.id)}
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer ${
                          isChecked ? 'bg-zinc-100/80 dark:bg-zinc-800/60' : ''
                        }`}
                      >
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(o.id)}
                            className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-zinc-500 cursor-pointer accent-zinc-900 dark:accent-white"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{o.customerName}</p>
                            {isRepeatCustomer && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-400/15 dark:via-indigo-400/15 dark:to-purple-400/15 text-sky-700 dark:text-sky-300 border border-sky-500/25 dark:border-sky-400/30 shadow-[0_1px_3px_rgba(56,189,248,0.12)] shrink-0 transition-all hover:scale-105"
                                title={`${priorOrdersCount} orders placed by this customer`}
                              >
                                <Repeat className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <span>Repeat</span>
                                {priorOrdersCount >= 2 && (
                                  <span className="font-mono text-[9px] font-bold text-sky-800 dark:text-sky-200 opacity-80">
                                    {priorOrdersCount}x
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{o.customerPhone}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-[200px] line-clamp-2" title={o.customerAddress}>
                            {o.customerAddress}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs max-w-[220px]">
                          <div className="flex items-center gap-2.5">
                            {o.lineItems[0]?.imageUrl ? (
                              <img
                                src={o.lineItems[0].imageUrl}
                                alt=""
                                className="w-8 h-8 rounded-xl object-cover border border-dove/20 dark:border-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-fog dark:bg-zinc-900 flex items-center justify-center border border-dove/20 dark:border-zinc-800 shrink-0">
                                <Package className="w-4 h-4 text-zinc-400" />
                              </div>
                            )}
                            <span className="truncate font-bold text-zinc-900 dark:text-zinc-100">{titleString}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                          {o.totalAmount != null ? `৳${o.totalAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const isCancelled = o.status === 'cancelled' || o.fulfillmentStatus === 'cancelled';
                            const isPaid = o.status === 'confirmed';
                            const isRefunded = o.status === 'refunded';

                            if (isRefunded) {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400">
                                  Refunded
                                </span>
                              );
                            }

                            if (isCancelled) {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                                  Cancelled
                                </span>
                              );
                            }

                            if (isPaid) {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                                  Paid
                                </span>
                              );
                            }

                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                                Pending
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${fConfig.bg} ${fConfig.text}`}>
                            {fConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {o.courierTrackingId ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-900 p-1 shadow-xs border border-dove/20 dark:border-zinc-800 flex items-center justify-center shrink-0">
                                <CourierLogo provider={o.courierProvider || ''} className="w-full h-full object-contain" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{o.courierProvider}</span>
                                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">{o.courierTrackingId}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{fmt(o.createdAt)}</td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {o.needsReview && (
                              <span className="text-rust dark:text-orange-400 animate-pulse" title={o.reviewReason || 'Review requested'}>🚩</span>
                            )}
                            <Link
                              href={`/dashboard/inbox?phone=${o.customerPhone}`}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Open in Live Inbox"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        {/* ── 7. SLIDE-OVER DETAILS DRAWER ────────────────────────────────── */}
        <AnimatePresence>
          {activeOrderId && activeOrder && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveOrderId(null)}
                className="fixed inset-0 z-50 bg-black backdrop-blur-xs"
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="fixed top-0 right-0 z-50 h-full w-full max-w-[560px] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-dove/20"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-dove/15 flex items-center justify-between bg-fog/30 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-serif font-bold text-ink">Order #{activeOrder.id.slice(0, 8)}</h2>
                      {activeOrder.needsReview && (
                        <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ash font-mono mt-0.5">{fmt(activeOrder.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveOrderId(null)}
                    className="p-2 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 space-y-6">
                  {/* 1. Line Items Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-ink" /> Purchased Items
                    </h3>
                    <div className="bg-fog rounded-2xl p-4 border border-dove/15 space-y-3">
                      {activeOrder.lineItems.map((li) => (
                        <div key={li.id} className="flex items-center gap-3 text-xs">
                          {li.imageUrl ? (
                            <img
                              src={li.imageUrl}
                              alt={li.product_name}
                              className="w-10 h-10 object-cover rounded-xl border border-dove/10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-white border border-dove/10 rounded-xl flex items-center justify-center text-ash">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-ink leading-tight">{li.product_name}</p>
                            <p className="text-[10px] text-ash font-mono mt-0.5">Qty {li.quantity} &times; ৳{li.unit_price.toLocaleString()}</p>
                          </div>
                          <span className="font-bold text-ink font-mono">৳{(li.quantity * li.unit_price).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="h-px bg-dove/15 my-2" />
                      <div className="flex justify-between text-xs text-ash">
                        <span>Delivery Fee</span>
                        <span className="font-mono">৳100</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-ink pt-1">
                        <span>Grand Total</span>
                        <span className="font-mono text-base">৳{activeOrder.totalAmount?.toLocaleString() ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Customer Contact Block */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-ink" /> Customer Information
                    </h3>
                    <div className="bg-white border border-dove/20 rounded-2xl p-4 flex justify-between items-start shadow-xs">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-ink">{activeOrder.customerName}</p>
                        <p className="text-xs text-ash font-mono">{activeOrder.customerPhone}</p>
                        <p className="text-xs text-ash leading-relaxed mt-1.5 bg-fog p-2.5 rounded-xl border border-dove/10 font-medium">
                          {activeOrder.customerAddress}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/inbox?phone=${activeOrder.customerPhone}`}
                        className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline uppercase tracking-wider bg-sky-wash px-3 py-1.5 rounded-full border border-blue-200"
                      >
                        Live Chat <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* 3. Payment Verification Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-ink" /> Payment Status & Verification
                    </h3>
                    <div className="bg-white border border-dove/20 rounded-2xl p-4 space-y-4 shadow-xs">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-ash uppercase tracking-wider font-bold">Method</span>
                          <p className="font-bold text-ink mt-0.5">{activeOrder.paymentMethod ? activeOrder.paymentMethod.replace('_', ' ') : '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-ash uppercase tracking-wider font-bold">Trx ID / Ref</span>
                          <p className="font-mono font-bold text-ink mt-0.5">{activeOrder.paymentTransactionRef || '—'}</p>
                        </div>
                      </div>

                      {/* SMS-captured bKash TrxIDs */}
                      {activeOrder.paymentVerifications && activeOrder.paymentVerifications.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-ash" />
                            <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Captured via Android Companion</span>
                          </div>
                          {activeOrder.paymentVerifications.map((pv: any) => (
                            <div key={pv.id} className={`flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                              pv.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200' :
                              pv.status === 'mismatch' ? 'bg-rose-50 border-rose-200' :
                              'bg-sky-wash border-blue-200'
                            }`}>
                              <div className="space-y-0.5">
                                <p className="font-mono font-bold text-ink">{pv.matched_reference || pv.customer_provided_ref || '(no ref)'}</p>
                                <p className="text-[10px] text-ash">৳{pv.expected_amount?.toLocaleString()} · {pv.status}</p>
                              </div>
                              {pv.status === 'pending' && activeOrder.status !== 'confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualTrxRef(pv.matched_reference || pv.customer_provided_ref || '');
                                  }}
                                  className="px-2.5 py-1 bg-ink text-white rounded-full text-[10px] font-bold hover:bg-black transition-colors flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Use this
                                </button>
                              )}
                              {pv.status === 'confirmed' && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeOrder.status === 'cancelled' || activeOrder.fulfillmentStatus === 'cancelled' ? (
                        <div className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs border border-slate-200 font-medium">
                          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>This order was cancelled. Payment verification is locked.</span>
                        </div>
                      ) : activeOrder.status !== 'confirmed' ? (
                        <div className="pt-2 space-y-2">
                          <span className="text-[10px] font-bold text-rust uppercase tracking-wider block">Verify Payment Manually</span>
                          <p className="text-[10px] text-ash leading-relaxed">
                            Enter the bKash/Nagad TrxID received from customer, or choose an SMS match above.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter Transaction ID (e.g. 9H7A2K1L)..."
                              value={manualTrxRef}
                              onChange={e => setManualTrxRef(e.target.value)}
                              className="flex-1 px-3.5 py-2 bg-fog border border-dove/20 rounded-xl text-xs focus:outline-none focus:border-ink transition-all font-mono text-ink"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyPayment}
                              disabled={isVerifying || !manualTrxRef.trim()}
                              className="px-4 py-2 bg-ink text-white font-bold rounded-xl text-xs hover:bg-black disabled:opacity-40 transition-colors shadow-xs shrink-0"
                            >
                              {isVerifying ? 'Confirming...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Payment verified on {activeOrder.paymentVerifiedAt ? fmt(activeOrder.paymentVerifiedAt) : '—'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Courier Dispatch Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-ink" /> Courier Fulfillment
                    </h3>
                    <div className="bg-white border border-dove/20 rounded-2xl p-4 space-y-4 shadow-xs">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-ash uppercase tracking-wider font-bold">Courier Provider</span>
                          <p className="font-bold text-ink mt-0.5 uppercase">{activeOrder.courierProvider || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-ash uppercase tracking-wider font-bold">Tracking Number</span>
                          <p className="font-mono font-bold text-ink mt-0.5">{activeOrder.courierTrackingId || '—'}</p>
                        </div>
                      </div>

                      {activeOrder.status === 'confirmed' && !activeOrder.courierTrackingId && (
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <span className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1.5">Select Courier Provider</span>
                            <div className="relative">
                              <select
                                value={selectedCourier}
                                onChange={e => setSelectedCourier(e.target.value)}
                                className="w-full appearance-none px-3.5 py-2.5 pr-8 bg-fog border border-dove/20 rounded-xl text-xs focus:outline-none focus:border-ink transition-all font-bold text-ink uppercase cursor-pointer"
                              >
                                <option value="pathao">Pathao (~1.8d avg fulfillment)</option>
                                <option value="steadfast">Steadfast (~2.1d avg fulfillment)</option>
                                <option value="redx">RedX (~2.5d avg fulfillment)</option>
                                <option value="paperfly">Paperfly (~3.0d avg fulfillment)</option>
                                <option value="ecourier">eCourier (~2.2d avg fulfillment)</option>
                                <option value="manual">Manual (Self delivery)</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash pointer-events-none" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDispatch}
                            disabled={isDispatching}
                            className="w-full py-2.5 bg-ink text-white font-bold rounded-xl text-xs hover:bg-black disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                          >
                            {isDispatching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Dispatch via {selectedCourier.charAt(0).toUpperCase() + selectedCourier.slice(1)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Timeline Audit Trail */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-ink" /> Lifecycle Timeline
                    </h3>
                    <div className="relative pl-4 border-l-2 border-dove/20 space-y-4">
                      {activeOrder.statusHistory.map((log) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-white border-2 border-ink rounded-full" />
                          <div className="text-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-bold text-ink uppercase tracking-wider text-[9px]">{log.status.replace('_', ' ')}</span>
                              <span className="text-[9px] text-ash font-mono">{fmt(log.created_at)}</span>
                            </div>
                            <p className="text-ash leading-relaxed font-medium">{log.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Administrative Actions */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ash uppercase tracking-wider">Control Panel Actions</h3>
                    <div className="bg-fog rounded-2xl p-4 border border-dove/15 space-y-4">
                      {/* Note editor */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-ash uppercase tracking-wider block font-bold">Internal Note</span>
                        <textarea
                          rows={2}
                          value={internalNoteInput}
                          onChange={e => setInternalNoteInput(e.target.value)}
                          placeholder="Save details only visible to store owners..."
                          className="w-full p-2.5 bg-white border border-dove/20 rounded-xl text-xs focus:outline-none focus:border-ink transition-all resize-none text-ink"
                        />
                        <button
                          type="button"
                          onClick={handleSaveNote}
                          disabled={isSavingNote || internalNoteInput.trim() === activeOrder.internalNote}
                          className="px-3.5 py-1.5 bg-ink text-white font-bold rounded-full text-[10px] hover:bg-black disabled:opacity-40 transition-colors shadow-xs self-end"
                        >
                          {isSavingNote ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>

                      <div className="h-px bg-dove/15" />

                      <div className="flex gap-2 justify-between">
                        {/* Flag review */}
                        <button
                          type="button"
                          onClick={handleToggleReview}
                          className={`px-4 py-2 border rounded-full text-xs font-bold transition-all ${
                            activeOrder.needsReview
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-white'
                              : 'bg-white text-ink border-dove/20 hover:bg-fog'
                          }`}
                        >
                          {activeOrder.needsReview ? 'Clear Review Flag' : 'Flag for Review'}
                        </button>
                        {/* Print Receipt */}
                        <button
                          type="button"
                          onClick={() => handlePrintReceipts([activeOrder])}
                          className="px-4 py-2 border border-dove/20 bg-white text-ink rounded-full text-xs font-bold hover:bg-fog transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Receipt
                        </button>
                      </div>

                      {activeOrder.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-dove/15 space-y-2">
                          <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">Cancel Order</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Reason for cancellation..."
                              value={cancellationReason}
                              onChange={e => setCancellationReason(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-dove/20 rounded-xl text-xs focus:outline-none focus:border-rose-400 transition-all text-ink"
                            />
                            <button
                              type="button"
                              onClick={handleCancel}
                              disabled={isCancelling || !cancellationReason.trim()}
                              className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 disabled:opacity-40 transition-colors shadow-xs shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── 8. PRINT MANAGER MODAL ─────────────────────────────────────── */}
        <AnimatePresence>
          {printModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setPrintModalOpen(false)}
                className="fixed inset-0 z-50 bg-black backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="fixed inset-x-4 top-12 bottom-12 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[840px] z-50 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-dove/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dove/15 bg-fog/30 shrink-0">
                  <div>
                    <h2 className="text-base font-serif font-bold text-ink">Print Manager</h2>
                    <p className="text-[11px] text-ash mt-0.5">
                      {printModalOrders.length} order{printModalOrders.length !== 1 ? 's' : ''} queued for printing
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(false)}
                    className="p-2 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Controls + Preview */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Left: Controls */}
                  <div className="w-56 shrink-0 border-r border-dove/15 p-5 space-y-6 overflow-y-auto">
                    {/* Document Type */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block">Document Type</label>
                      {(['receipt', 'packing_slip', 'label'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPrintDocType(type)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            printDocType === type ? 'bg-ink text-white border-ink shadow-xs' : 'bg-white text-ink border-dove/20 hover:bg-fog'
                          }`}
                        >
                          {type === 'receipt' ? '🧾 Thermal Receipt' : type === 'packing_slip' ? '📦 Packing Slip' : '🏷 Shipping Label'}
                        </button>
                      ))}
                    </div>

                    {/* Page Size */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block">Paper Size</label>
                      {(['thermal_80mm', 'a4'] as const).map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setPrintPageSize(size)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            printPageSize === size ? 'bg-ink text-white border-ink shadow-xs' : 'bg-white text-ink border-dove/20 hover:bg-fog'
                          }`}
                        >
                          {size === 'thermal_80mm' ? '🖨 Thermal (80mm)' : '📄 Standard A4'}
                        </button>
                      ))}
                    </div>

                    {/* Copies */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-ash uppercase tracking-wider block">Copies per Order</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrintCopies(c => Math.max(1, c - 1))}
                          className="w-8 h-8 flex items-center justify-center bg-fog border border-dove/20 rounded-xl text-ink hover:bg-dove/20 transition-colors text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-ink w-6 text-center font-mono">{printCopies}</span>
                        <button
                          type="button"
                          onClick={() => setPrintCopies(c => Math.min(10, c + 1))}
                          className="w-8 h-8 flex items-center justify-center bg-fog border border-dove/20 rounded-xl text-ink hover:bg-dove/20 transition-colors text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Print CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        const html = buildPrintDocument(printModalOrders, printDocType, printCopies, printPageSize);
                        const win = window.open('', '_blank');
                        if (!win) return;
                        win.document.write(html);
                        win.document.close();
                        win.focus();
                        setTimeout(() => { win.print(); }, 400);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-white rounded-full text-xs font-bold hover:bg-black transition-colors shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Now
                    </button>
                  </div>

                  {/* Right: Preview iframe */}
                  <div className="flex-1 bg-fog overflow-hidden relative">
                    <div className="absolute top-2 left-3 text-[10px] text-ash font-bold uppercase tracking-wider">Live Preview</div>
                    <iframe
                      key={`${printDocType}-${printCopies}-${printPageSize}`}
                      srcDoc={buildPrintDocument(printModalOrders.slice(0, 1), printDocType, 1, printPageSize)}
                      title="Print Preview"
                      className="w-full h-full border-none mt-6"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── 9. POS CHECKOUT MODAL ───────────────────────────────────────── */}
        <PosModal
          isOpen={posModalOpen}
          onClose={() => setPosModalOpen(false)}
          onOrderCreated={(newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
          }}
          onPrintReceipt={(newOrder) => {
            openPrintManager([newOrder]);
          }}
        />

      </div>
    </div>
  );
}
