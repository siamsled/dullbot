'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Package, Clock, CheckCircle2, Search, ArrowRight, ShieldAlert,
  AlertTriangle, Filter, ClipboardList, HelpCircle, X, ExternalLink,
  ChevronRight, Calendar, User, Truck, Check, RefreshCw, Download,
  Printer, ChevronDown, Smartphone, ShieldCheck, ShoppingBag, Banknote, Hourglass
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
  dispatched: { label: 'Dispatched', bg: 'bg-sky-wash border-dove/10', text: 'text-ink' },
  in_transit: { label: 'In Transit', bg: 'bg-sky-wash border-dove/10', text: 'text-ink' },
  delivered: { label: 'Delivered', bg: 'bg-green-50 border-green-150', text: 'text-green-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-apricot-wash border-rust/10', text: 'text-rust' },
};

function fmt(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OrdersClient({ shopId, orders: initial }: { shopId: string; orders: Order[] }) {
  const { data: fetchedOrders = initial, isLoading: loadingOrders } = useQuery({
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
  const countConfirmed = orders.filter(o => o.status === 'confirmed' && o.fulfillmentStatus === 'awaiting_dispatch').length;
  const countDispatched = orders.filter(o => o.fulfillmentStatus === 'dispatched' || o.fulfillmentStatus === 'in_transit').length;
  const countDelivered = orders.filter(o => o.fulfillmentStatus === 'delivered').length;
  const countNeedsReview = orders.filter(o => o.needsReview).length;
  const countCancelled = orders.filter(o => o.status === 'cancelled' || o.fulfillmentStatus === 'cancelled').length;

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
    { key: 'pending_payment', label: 'Pending Payment', count: countPending, icon: Clock, desc: 'Needs TrxID check' },
    { key: 'confirmed', label: 'Confirmed', count: countConfirmed, icon: CheckCircle2, desc: 'Ready for dispatch' },
    { key: 'dispatched', label: 'Dispatched', count: countDispatched, icon: Truck, desc: 'In transit' },
    { key: 'delivered', label: 'Delivered', count: countDelivered, icon: Check, desc: 'Receipt verified' },
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
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Orders</h1>
            <p className="text-ash text-sm">Review payments, dispatch couriers, and process in-store POS sales.</p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => handleExportCSV()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-fog border border-dove/20 text-ink font-semibold rounded-buttons hover:bg-dove/15 transition-all text-xs shadow-subtle cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => setPosModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-ink text-white font-semibold rounded-buttons hover:bg-black transition-all text-xs shadow-subtle cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              New POS Order
            </button>
          </div>
        </div>

        {/* POS TILL & AGING ALERT STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cash in Till */}
          <div className="bg-white rounded-cards p-4 border border-dove/10 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">Today's Cash in Till</span>
              <p className="text-2xl font-serif font-medium text-ink leading-none">৳{todayCashInTill.toLocaleString()}</p>
              <span className="text-[10px] text-ash mt-1 block">Physical drawer cash from POS</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-150 shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          {/* Sales Origin Split (POS vs Chat) */}
          <div className="bg-white rounded-cards p-4 border border-dove/10 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">Today's Sales Split</span>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs font-bold text-ink font-mono">৳{todayPosRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-ash block">🛍️ In-Person POS ({todayPosOrders.length})</span>
                </div>
                <div className="w-px h-6 bg-dove/20" />
                <div>
                  <span className="text-xs font-bold text-ink font-mono">৳{todayChatRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-ash block">💬 Chat AI ({todayChatOrders.length})</span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-fog text-ink flex items-center justify-center border border-dove/10 shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Verification Aging */}
          <div className={`rounded-cards p-4 border shadow-subtle flex items-center justify-between transition-colors ${
            agingPendingCount > 0 
              ? 'bg-apricot-wash/50 border-rust/20' 
              : 'bg-white border-dove/10'
          }`}>
            <div>
              <span className="text-[10px] font-bold text-rust uppercase tracking-wider block mb-1">Pending Payment Aging</span>
              <p className="text-2xl font-serif font-medium text-ink leading-none">
                {agingPendingCount} {agingPendingCount === 1 ? 'order' : 'orders'}
              </p>
              <span className="text-[10px] text-ash mt-1 block">
                {agingPendingCount > 0 ? 'Stuck pending > 2 hours' : 'All verifications up to date'}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border ${
              agingPendingCount > 0 ? 'bg-white text-rust border-rust/10' : 'bg-fog text-ash border-dove/10'
            }`}>
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* LIFE-CYCLE FUNNEL STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5">
          {/* Main Funnel Path */}
          <div className="md:col-span-4 bg-white rounded-cards shadow-subtle border border-dove/10 p-2 flex flex-col sm:flex-row gap-1.5 items-stretch">
            {mainFunnel.map((stage) => {
              const isActive = activeStage === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setActiveStage(isActive ? 'all' : stage.key)}
                  className={`flex-1 flex flex-col p-3 rounded-inputs border transition-all text-left group ${isActive
                      ? 'bg-ink border-ink text-white shadow-subtle'
                      : 'bg-white border-transparent hover:bg-fog text-ink'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-pure-white/70' : 'text-graphite group-hover:text-ink'}`}>{stage.label}</span>
                    <stage.icon className={`w-3.5 h-3.5 ${isActive ? 'text-pure-white' : 'text-graphite'}`} />
                  </div>
                  <span className="text-2xl font-serif font-medium leading-none mb-1">{stage.count}</span>
                  <span className={`text-[9px] ${isActive ? 'text-pure-white/60' : 'text-ash'}`}>{stage.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Off-Funnel Review & Cancelled Category */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            {/* Needs Review */}
            <button
              onClick={() => setActiveStage(activeStage === 'needs_review' ? 'all' : 'needs_review')}
              className={`p-3 flex flex-col justify-between rounded-cards border text-left transition-all ${activeStage === 'needs_review'
                  ? 'bg-ink border-ink text-white'
                  : 'bg-white border-dove/10 hover:border-rust/20 text-ink shadow-subtle'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStage === 'needs_review' ? 'text-pure-white/70' : 'text-rust'}`}>Needs Review</span>
                <AlertTriangle className={`w-3.5 h-3.5 ${activeStage === 'needs_review' ? 'text-pure-white' : 'text-rust'}`} />
              </div>
              <div>
                <span className="text-2xl font-serif font-medium leading-none">{countNeedsReview}</span>
                <p className="text-[9px] text-ash mt-1">Payment discrepancies</p>
              </div>
            </button>

            {/* Cancelled */}
            <button
              onClick={() => setActiveStage(activeStage === 'cancelled' ? 'all' : 'cancelled')}
              className={`p-3 flex flex-col justify-between rounded-cards border text-left transition-all ${activeStage === 'cancelled'
                  ? 'bg-ink border-ink text-white'
                  : 'bg-white border-dove/10 hover:border-dove/20 text-ink shadow-subtle'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStage === 'cancelled' ? 'text-pure-white/70' : 'text-graphite'}`}>Cancelled</span>
                <X className={`w-3.5 h-3.5 ${activeStage === 'cancelled' ? 'text-pure-white' : 'text-graphite'}`} />
              </div>
              <div>
                <span className="text-2xl font-serif font-medium leading-none">{countCancelled}</span>
                <p className="text-[9px] text-ash mt-1">Refused or aborted</p>
              </div>
            </button>
          </div>
        </div>

        {/* FILTER & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite" />
            <input
              type="text"
              placeholder="Search customer, phone, tracking ref, or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all shadow-subtle"
            />
          </div>
          {activeStage !== 'all' && (
            <button
              onClick={() => setActiveStage('all')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rust hover:bg-apricot-wash rounded-buttons transition-colors self-start border border-dashed border-rust/10"
            >
              Clear Filter: {activeStage.replace('_', ' ')} <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* BATCH ACTION FLOATING CARD */}
        <AnimatePresence>
          {selectedIds.size >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-white px-5 py-3.5 rounded-cards shadow-subtle flex items-center gap-6 border border-pure-white/10"
            >
              <span className="text-xs font-semibold text-pure-white/80">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-pure-white/20" />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkVerify}
                  className="px-3.5 py-1.5 bg-white text-ink font-semibold rounded-buttons text-xs hover:bg-pure-white/95 transition-colors shadow-sm"
                >
                  Confirm Payments
                </button>
                <button
                  onClick={handleBulkDispatch}
                  className="px-3.5 py-1.5 bg-pure-white/10 text-white font-semibold rounded-buttons text-xs hover:bg-pure-white/15 transition-colors"
                >
                  Dispatch Courier
                </button>
                <button
                  onClick={() => {
                    const targetList = orders.filter(o => selectedIds.has(o.id));
                    handlePrintReceipts(targetList);
                  }}
                  className="px-3.5 py-1.5 bg-pure-white/10 text-white font-semibold rounded-buttons text-xs hover:bg-pure-white/15 transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipts
                </button>
                <button
                  onClick={() => {
                    const targetList = orders.filter(o => selectedIds.has(o.id));
                    handleExportCSV(targetList);
                  }}
                  className="px-3.5 py-1.5 bg-pure-white/10 text-white font-semibold rounded-buttons text-xs hover:bg-pure-white/15 transition-colors"
                >
                  Export CSV
                </button>
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-pure-white/60 hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABLE */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-dove/15 flex items-center justify-between">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">All Orders</h2>
            <span className="text-[11px] font-semibold text-graphite">{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dove/15 bg-fog/30">
                  <th className="px-6 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-dove/30 focus:ring-ink"
                    />
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Product(s)</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Fulfillment</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Courier</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-graphite uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dove/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-fog rounded-full flex items-center justify-center mb-3 text-graphite border border-dove/5">
                          <Package className="w-5 h-5 opacity-40" />
                        </div>
                        <p className="text-sm font-semibold text-ink mb-1">No orders found</p>
                        <p className="text-xs text-ash max-w-xs leading-relaxed">
                          Try adjusting your search query or selecting a different funnel stage.
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
                    const fConfig = FULFILLMENT_COLORS[o.fulfillmentStatus] ?? { label: o.fulfillmentStatus, bg: 'bg-fog', text: 'text-ink' };

                    // Find repeat customer: has prior orders in database
                    const isRepeatCustomer = orders.filter(item => item.customerPhone === o.customerPhone).length > 1;

                    return (
                      <motion.tr
                        key={o.id}
                        variants={itemVariants}
                        onClick={() => setActiveOrderId(o.id)}
                        className={`hover:bg-fog/30 transition-all cursor-pointer ${isChecked ? 'bg-fog/40' : ''
                          }`}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(o.id)}
                            className="rounded border-dove/30 focus:ring-ink"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-ink leading-tight">{o.customerName}</p>
                            {isRepeatCustomer && (
                              <span className="w-3.5 h-3.5 bg-sky-wash text-ink rounded-full flex items-center justify-center text-[8px] font-bold" title="Repeat Customer">🔄</span>
                            )}
                          </div>
                          <p className="text-xs text-graphite font-mono mt-0.5">{o.customerPhone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-graphite max-w-[180px] line-clamp-2" title={o.customerAddress}>
                            {o.customerAddress}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink max-w-[200px]">
                          <div className="flex items-center gap-2">
                            {o.lineItems[0]?.imageUrl ? (
                              <img
                                src={o.lineItems[0].imageUrl}
                                alt=""
                                className="w-8 h-8 rounded object-cover border border-dove/10"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-fog flex items-center justify-center border border-dove/10">
                                <Package className="w-4 h-4 text-ash" />
                              </div>
                            )}
                            <span className="truncate">{titleString}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink font-semibold">
                          {o.totalAmount != null ? `৳${o.totalAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${o.status === 'confirmed' ? 'bg-green-50 border-green-150 text-green-800' : 'bg-apricot-wash border-rust/10 text-rust'
                            }`}>
                            {o.status === 'confirmed' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${fConfig.bg} ${fConfig.text}`}>
                            {fConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {o.courierTrackingId ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-ink uppercase tracking-wider">{o.courierProvider}</span>
                              <span className="text-[10px] font-mono text-graphite mt-0.5">{o.courierTrackingId}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-graphite">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-ash whitespace-nowrap">{fmt(o.createdAt)}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {o.needsReview && (
                              <span className="text-rust animate-pulse" title={o.reviewReason || 'Review requested'}>🚩</span>
                            )}
                            <Link
                              href={`/dashboard/inbox?phone=${o.customerPhone}`}
                              className="p-1 text-graphite hover:text-ink rounded hover:bg-fog transition-colors"
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
        </motion.div>

        {/* DETAIL SLIDE-OVER PANEL */}
        <AnimatePresence>
          {activeOrderId && activeOrder && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveOrderId(null)}
                className="fixed inset-0 z-50 bg-black"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="fixed top-0 right-0 z-50 h-full w-full max-w-[540px] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-dove/20"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-dove/15 flex items-center justify-between bg-fog/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-serif font-medium text-ink">Order Details</h2>
                      {activeOrder.needsReview && (
                        <span className="px-2.5 py-0.5 bg-apricot-wash border border-rust/10 text-rust rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-graphite font-mono mt-0.5">#{activeOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setActiveOrderId(null)}
                    className="p-1.5 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 space-y-8">
                  {/* 1. Line Items Section */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-ink" /> Line Items
                    </h3>
                    <div className="bg-fog rounded-inputs p-4 border border-dove/10 space-y-3">
                      {activeOrder.lineItems.map((li) => (
                        <div key={li.id} className="flex items-center gap-3 text-xs">
                          {li.imageUrl ? (
                            <img
                              src={li.imageUrl}
                              alt={li.product_name}
                              className="w-10 h-10 object-cover rounded-images border border-dove/10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-white border border-dove/10 rounded-images flex items-center justify-center text-graphite">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 pr-4">
                            <p className="font-semibold text-ink leading-tight">{li.product_name}</p>
                            <p className="text-[10px] text-graphite font-mono mt-0.5">Qty {li.quantity} &times; ৳{li.unit_price.toLocaleString()}</p>
                          </div>
                          <span className="font-semibold text-ink">৳{(li.quantity * li.unit_price).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="h-px bg-dove/15 my-2" />
                      <div className="flex justify-between text-xs text-ash">
                        <span>Delivery Charge</span>
                        <span>৳100</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-ink">
                        <span>Total Amount</span>
                        <span>৳{activeOrder.totalAmount?.toLocaleString() ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Customer Contact Block */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-ink" /> Customer Contact
                    </h3>
                    <div className="bg-white border border-dove/15 rounded-cards p-4 flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{activeOrder.customerName}</p>
                        <p className="text-xs text-graphite font-mono">{activeOrder.customerPhone}</p>
                        <p className="text-xs text-ash leading-relaxed mt-1.5 bg-fog p-2.5 rounded-inputs border border-dove/5">{activeOrder.customerAddress}</p>
                      </div>
                      <Link
                        href={`/dashboard/inbox?phone=${activeOrder.customerPhone}`}
                        className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-rust hover:underline uppercase tracking-wider bg-apricot-wash px-3 py-1.5 rounded-buttons"
                      >
                        Inbox <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* 3. Payment Verification Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-ink" /> Payment Verification
                    </h3>
                    <div className="bg-white border border-dove/15 rounded-cards p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-graphite uppercase tracking-wider">Method</span>
                          <p className="font-semibold text-ink mt-0.5">{activeOrder.paymentMethod ? activeOrder.paymentMethod.replace('_', ' ') : '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-graphite uppercase tracking-wider">Trx ID / Ref</span>
                          <p className="font-mono font-semibold text-ink mt-0.5">{activeOrder.paymentTransactionRef || '—'}</p>
                        </div>
                      </div>

                      {/* SMS-captured bKash TrxIDs from Android Companion */}
                      {activeOrder.paymentVerifications && activeOrder.paymentVerifications.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-graphite" />
                            <span className="text-[10px] font-semibold text-graphite uppercase tracking-wider">Captured via Android Companion</span>
                          </div>
                          {activeOrder.paymentVerifications.map((pv: any) => (
                            <div key={pv.id} className={`flex items-center justify-between p-2.5 rounded-inputs text-xs border ${pv.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                                pv.status === 'mismatch' ? 'bg-apricot-wash border-rust/20' :
                                  'bg-sky-wash/40 border-dove/20'
                              }`}>
                              <div className="space-y-0.5">
                                <p className="font-mono font-semibold text-ink">{pv.matched_reference || pv.customer_provided_ref || '(no ref)'}</p>
                                <p className="text-[10px] text-graphite">৳{pv.expected_amount?.toLocaleString()} · {pv.status}</p>
                              </div>
                              {pv.status === 'pending' && activeOrder.status !== 'confirmed' && (
                                <button
                                  onClick={() => {
                                    setManualTrxRef(pv.matched_reference || pv.customer_provided_ref || '');
                                  }}
                                  className="px-2.5 py-1 bg-ink text-white rounded-buttons text-[10px] font-semibold hover:bg-black transition-colors flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Use this
                                </button>
                              )}
                              {pv.status === 'confirmed' && (
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeOrder.status !== 'confirmed' ? (
                        <div className="pt-2 space-y-2">
                          <span className="text-[10px] font-semibold text-rust uppercase tracking-wider block">Verify Payment Manually</span>
                          <p className="text-[10px] text-graphite leading-relaxed">
                            Enter the bKash/Nagad TrxID the customer sent, or click &#8220;Use this&#8221; above if the Android companion already captured it.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter Transaction ID (e.g. 9H7A2K1L9S)..."
                              value={manualTrxRef}
                              onChange={e => setManualTrxRef(e.target.value)}
                              className="flex-1 px-3 py-2 bg-fog border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-ink transition-all"
                            />
                            <button
                              onClick={handleVerifyPayment}
                              disabled={isVerifying || !manualTrxRef.trim()}
                              className="px-4 py-2 bg-ink text-white font-semibold rounded-buttons text-xs hover:bg-black disabled:opacity-40 transition-colors shadow-subtle shrink-0"
                            >
                              {isVerifying ? 'Confirming...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-green-50 text-green-800 rounded-inputs text-xs border border-green-150">
                          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                          <span>Payment verified successfully on {activeOrder.paymentVerifiedAt ? fmt(activeOrder.paymentVerifiedAt) : '—'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Courier Dispatch Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-ink" /> Courier Fulfillment
                    </h3>
                    <div className="bg-white border border-dove/15 rounded-cards p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-graphite uppercase tracking-wider">Courier Provider</span>
                          <p className="font-semibold text-ink mt-0.5 uppercase">{activeOrder.courierProvider || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-graphite uppercase tracking-wider">Tracking Number</span>
                          <p className="font-mono font-semibold text-ink mt-0.5">{activeOrder.courierTrackingId || '—'}</p>
                        </div>
                      </div>

                      {activeOrder.status === 'confirmed' && !activeOrder.courierTrackingId && (
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <span className="text-[10px] font-semibold text-graphite uppercase tracking-wider block mb-1.5">Select Courier</span>
                            <div className="relative">
                              <select
                                value={selectedCourier}
                                onChange={e => setSelectedCourier(e.target.value)}
                                className="w-full appearance-none px-3 py-2 pr-8 bg-fog border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-ink transition-all font-semibold text-ink uppercase cursor-pointer"
                              >
                                <option value="pathao">Pathao (~1.8d avg delivery)</option>
                                <option value="steadfast">Steadfast (~2.1d avg delivery)</option>
                                <option value="redx">RedX (~2.5d avg delivery)</option>
                                <option value="paperfly">Paperfly (~3.0d avg delivery)</option>
                                <option value="ecourier">eCourier (~2.2d avg delivery)</option>
                                <option value="manual">Manual (no API)</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-graphite pointer-events-none" />
                            </div>
                          </div>
                          <button
                            onClick={handleDispatch}
                            disabled={isDispatching}
                            className="w-full py-2.5 bg-ink text-white font-semibold rounded-buttons text-xs hover:bg-black disabled:opacity-40 transition-colors shadow-subtle flex items-center justify-center gap-1.5"
                          >
                            {isDispatching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Dispatch via {selectedCourier.charAt(0).toUpperCase() + selectedCourier.slice(1)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. vertical Timeline audit trail */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-ink" /> Order Timeline & Logs
                    </h3>
                    <div className="relative pl-4 border-l-2 border-dove/15 space-y-6">
                      {activeOrder.statusHistory.map((log) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-white border-2 border-ink rounded-full" />
                          <div className="text-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-semibold text-ink uppercase tracking-wider text-[9px]">{log.status.replace('_', ' ')}</span>
                              <span className="text-[9px] text-graphite font-mono">{fmt(log.created_at)}</span>
                            </div>
                            <p className="text-ash leading-relaxed">{log.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Administrative Manual Actions */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-graphite uppercase tracking-wider">Control Panel Actions</h3>
                    <div className="bg-fog/50 border border-dove/15 rounded-cards p-4 space-y-4">
                      {/* Note editor */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-graphite uppercase tracking-wider block font-semibold">Internal Note</span>
                        <textarea
                          rows={2}
                          value={internalNoteInput}
                          onChange={e => setInternalNoteInput(e.target.value)}
                          placeholder="Save details only visible to store owners..."
                          className="w-full p-2.5 bg-white border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-ink transition-all resize-none"
                        />
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote || internalNoteInput.trim() === activeOrder.internalNote}
                          className="px-3.5 py-1.5 bg-ink text-white font-semibold rounded-buttons text-[10px] hover:bg-black disabled:opacity-40 transition-colors shadow-sm self-end"
                        >
                          {isSavingNote ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>

                      <div className="h-px bg-dove/15" />

                      <div className="flex gap-2 justify-between">
                        {/* Flag review */}
                        <button
                          onClick={handleToggleReview}
                          className={`px-4 py-2 border rounded-buttons text-xs font-semibold transition-all ${activeOrder.needsReview
                              ? 'bg-apricot-wash text-rust border-rust/20 hover:bg-white'
                              : 'bg-white text-ink border-dove/30 hover:bg-fog'
                            }`}
                        >
                          {activeOrder.needsReview ? 'Clear Review Flag' : 'Flag for Review'}
                        </button>
                        {/* Print Receipt */}
                        <button
                          onClick={() => handlePrintReceipts([activeOrder])}
                          className="px-4 py-2 border border-dove/30 bg-white text-ink rounded-buttons text-xs font-semibold hover:bg-fog transition-all flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Receipt
                        </button>
                      </div>

                      {activeOrder.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-dove/15 space-y-2">
                          <span className="text-[10px] text-rust font-semibold uppercase tracking-wider block">Cancel Order</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Reason for cancelling order (required)..."
                              value={cancellationReason}
                              onChange={e => setCancellationReason(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-dove/30 rounded-inputs text-xs focus:outline-none focus:border-rust transition-all"
                            />
                            <button
                              onClick={handleCancel}
                              disabled={isCancelling || !cancellationReason.trim()}
                              className="px-4 py-2 bg-rust text-white font-semibold rounded-buttons text-xs hover:bg-red-800 disabled:opacity-40 transition-colors shadow-sm shrink-0"
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

        {/* ── PRINT MANAGER MODAL ───────────────────────────────────────── */}
        <AnimatePresence>
          {printModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setPrintModalOpen(false)}
                className="fixed inset-0 z-50 bg-black"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="fixed inset-x-4 top-12 bottom-12 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[820px] z-50 bg-white rounded-cards shadow-2xl flex flex-col overflow-hidden border border-dove/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dove/15 bg-fog/30 shrink-0">
                  <div>
                    <h2 className="text-base font-serif font-medium text-ink">Print Manager</h2>
                    <p className="text-[11px] text-ash mt-0.5">
                      {printModalOrders.length} order{printModalOrders.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <button
                    onClick={() => setPrintModalOpen(false)}
                    className="p-1.5 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors"
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
                      <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Document Type</label>
                      {(['receipt', 'packing_slip', 'label'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setPrintDocType(type)}
                          className={`w-full text-left px-3 py-2 rounded-inputs text-xs font-medium border transition-all ${printDocType === type ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-dove/20 hover:bg-fog'
                            }`}
                        >
                          {type === 'receipt' ? '🧾 Receipt' : type === 'packing_slip' ? '📦 Packing Slip' : '🏷 Shipping Label'}
                        </button>
                      ))}
                    </div>

                    {/* Page Size */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Page Size</label>
                      {(['thermal_80mm', 'a4'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setPrintPageSize(size)}
                          className={`w-full text-left px-3 py-2 rounded-inputs text-xs font-medium border transition-all ${printPageSize === size ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-dove/20 hover:bg-fog'
                            }`}
                        >
                          {size === 'thermal_80mm' ? '🖨 Thermal (80mm)' : '📄 A4 Paper'}
                        </button>
                      ))}
                    </div>

                    {/* Copies */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Copies per Order</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrintCopies(c => Math.max(1, c - 1))}
                          className="w-8 h-8 flex items-center justify-center bg-fog border border-dove/20 rounded-inputs text-ink hover:bg-dove/20 transition-colors text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold text-ink w-6 text-center">{printCopies}</span>
                        <button
                          onClick={() => setPrintCopies(c => Math.min(10, c + 1))}
                          className="w-8 h-8 flex items-center justify-center bg-fog border border-dove/20 rounded-inputs text-ink hover:bg-dove/20 transition-colors text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Print CTA */}
                    <button
                      onClick={() => {
                        const html = buildPrintDocument(printModalOrders, printDocType, printCopies, printPageSize);
                        const win = window.open('', '_blank');
                        if (!win) return;
                        win.document.write(html);
                        win.document.close();
                        win.focus();
                        setTimeout(() => { win.print(); }, 400);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-graphite transition-colors shadow-subtle cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Now
                    </button>
                  </div>

                  {/* Right: Preview iframe */}
                  <div className="flex-1 bg-dove/5 overflow-hidden relative">
                    <div className="absolute top-2 left-3 text-[10px] text-ash font-medium uppercase tracking-wider">Live Preview</div>
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

        {/* POS CHECKOUT MODAL */}
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
