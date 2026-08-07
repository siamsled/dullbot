'use client';

import { useState, useTransition, useEffect } from 'react';
import { 
  Shield, Search, TrendingUp, Users, DollarSign, Database, Plus, Loader2, 
  Settings, AlertCircle, MessageCircle, X, ShieldAlert, CheckCircle, RefreshCw, ChevronRight, User
} from 'lucide-react';
import { 
  addCreditsAdmin, 
  getShopDetails, 
  manuallyResolvePayment, 
  getConversationMessagesAdmin, 
  sendInterventionReply 
} from './actions';

type ShopStats = {
  id: string;
  name: string;
  slug: string;
  credit_balance: number;
  agent_enabled: boolean;
  total_spent: number;
  total_cost: number;
  isQuiet: boolean;
  created_at: string;
};

interface Props {
  shops: ShopStats[];
  platformMetrics: {
    totalShops: number;
    totalCreditsInCirculation: number;
    totalCreditsSpentAllTime: number;
    totalRawCostUsd: number;
    systemErrorsCount: number;
  };
  escalations: any[];
  auditLogs: any[];
  incompleteOnboardings: {
    id: string;
    name: string;
    slug: string;
    business_type: string | null;
    onboarding_step: string | null;
    onboarding_step_updated_at: string | null;
    created_at: string;
  }[];
}

export default function AdminClient({ shops, platformMetrics, escalations: initialEscalations, auditLogs: initialAuditLogs, incompleteOnboardings }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [grantShopId, setGrantShopId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(1000);

  // Shop details support modal state
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Remote intervention workspace state
  const [activeIntervention, setActiveIntervention] = useState<{ pvId: string; orderId: string; convId: string; shopId: string } | null>(null);
  const [interventionMessages, setInterventionMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGrant = async () => {
    if (!grantShopId || grantAmount <= 0) return;
    startTransition(async () => {
      await addCreditsAdmin(grantShopId, grantAmount);
      setGrantShopId(null);
      setGrantAmount(1000);
    });
  };

  // Load shop config details
  const handleViewShopDetails = async (shopId: string) => {
    setSelectedShopId(shopId);
    setIsLoadingDetails(true);
    setShopDetails(null);
    try {
      const res = await getShopDetails(shopId);
      if (res.success) {
        setShopDetails(res.details);
      } else {
        alert(`Error loading details: ${res.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Load compliance remote messages
  const handleOpenIntervention = async (pvId: string, orderId: string, convId: string, shopId: string) => {
    setActiveIntervention({ pvId, orderId, convId, shopId });
    setIsLoadingMessages(true);
    setInterventionMessages([]);
    try {
      const res = await getConversationMessagesAdmin(convId, shopId);
      if (res.success && res.messages) {
        setInterventionMessages(res.messages);
      } else {
        alert(`Error fetching logs: ${res.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Send intervention message
  const handleSendInterventionMessage = async () => {
    if (!activeIntervention || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      const res = await sendInterventionReply(activeIntervention.convId, activeIntervention.shopId, replyText);
      if (res.success) {
        // Refresh local messages
        const res2 = await getConversationMessagesAdmin(activeIntervention.convId, activeIntervention.shopId);
        if (res2.success && res2.messages) {
          setInterventionMessages(res2.messages);
        }
        setReplyText('');
      } else {
        alert(`Failed to send message: ${res.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Resolve payment
  const handleResolvePayment = async (status: 'confirmed' | 'failed') => {
    if (!activeIntervention) return;
    if (!confirm(`Are you sure you want to manually set this payment verification as ${status}?`)) return;
    setIsLoadingMessages(true);
    try {
      const res = await manuallyResolvePayment(
        activeIntervention.pvId,
        activeIntervention.orderId,
        activeIntervention.shopId,
        status
      );
      if (res.success) {
        alert(`Successfully override resolved payment as ${status}`);
        setActiveIntervention(null);
        window.location.reload(); // refresh page data
      } else {
        alert(`Override failed: ${res.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  return (
    <div className="min-h-screen bg-fog pb-12 font-sans">
      {/* Top Navbar */}
      <div className="bg-white border-b border-dove/20 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-subtle">
        <div className="flex items-center">
          <Shield className="w-5 h-5 text-rust mr-3" />
          <span className="text-xl font-serif font-medium text-ink tracking-tight">DullBot Control Center</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium border border-red-200">
            Super-Admin Mode
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Business Health & Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ash uppercase tracking-wider">Active Tenants</span>
              <div className="p-2 bg-sky-wash rounded-lg text-blue-600"><Users className="w-4.5 h-4.5" /></div>
            </div>
            <div>
              <p className="text-3xl font-serif text-ink">{platformMetrics.totalShops}</p>
              <p className="text-[10px] text-ash mt-1">Total workspace tenants</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ash uppercase tracking-wider">Calculated MRR</span>
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp className="w-4.5 h-4.5" /></div>
            </div>
            <div>
              <p className="text-3xl font-serif text-ink">BDT {(platformMetrics.totalShops * 2500).toLocaleString()}</p>
              <p className="text-[10px] text-ash mt-1">Based on BDT 2500 per page tier</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ash uppercase tracking-wider">Burned Credits</span>
              <div className="p-2 bg-apricot-wash rounded-lg text-rust"><Database className="w-4.5 h-4.5" /></div>
            </div>
            <div>
              <p className="text-3xl font-serif text-ink">{platformMetrics.totalCreditsSpentAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-ash mt-1">Platform credits consumed</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ash uppercase tracking-wider">Net Gemini Margin</span>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><DollarSign className="w-4.5 h-4.5" /></div>
            </div>
            <div>
              <p className="text-3xl font-serif text-ink">
                BDT {(platformMetrics.totalCreditsSpentAllTime - (platformMetrics.totalRawCostUsd * 120)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-ash mt-1">Credits Revenue - Gemini Cost (USD to BDT)</p>
            </div>
          </div>
        </div>

        {/* Platform Alerts & Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rust animate-pulse" />
              Platform Diagnostics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs">
                <div>
                  <p className="text-sm font-medium text-ink">System Errors Registered</p>
                  <p className="text-xs text-ash">Webhook failures or Gemini server abort logs</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${platformMetrics.systemErrorsCount > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {platformMetrics.systemErrorsCount} Errors
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs">
                <div>
                  <p className="text-sm font-medium text-ink">Inactive Churn Risks</p>
                  <p className="text-xs text-ash">Shops with zero message activity in 5 days</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${shops.filter(s => s.isQuiet).length > 0 ? 'bg-apricot-wash text-rust' : 'bg-green-50 text-green-700'}`}>
                  {shops.filter(s => s.isQuiet).length} Shops
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-cards shadow-subtle border border-dove/10">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              Compliance Access logs
            </h3>
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {initialAuditLogs.map(log => (
                <div key={log.id} className="text-xs flex justify-between p-2 hover:bg-fog rounded">
                  <div>
                    <span className="font-semibold text-ink capitalize">{log.action.replace(/_/g, ' ')}</span>
                    <p className="text-[10px] text-ash mt-0.5">Shop ID: {log.target_shop_id}</p>
                  </div>
                  <span className="text-[10px] text-ash">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {initialAuditLogs.length === 0 && (
                <p className="text-xs text-ash text-center py-8">No supervisor logs saved.</p>
              )}
            </div>
          </div>
        </div>

        {/* Escalation Queue & Remote Chat Intervention */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <div className="p-5 border-b border-dove/10 bg-white">
            <h3 className="text-md font-medium text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rust animate-pulse" />
              Escalation Queue (Platform-Side Lanes)
            </h3>
            <p className="text-xs text-ash mt-1">Pending payment mismatches or verification failures needing remote takeover intervention.</p>
          </div>
          <div className="divide-y divide-dove/10">
            {initialEscalations.map(esc => (
              <div key={esc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-fog/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm">Order #{esc.order_id.slice(0, 8)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${esc.status === 'mismatch' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {esc.status}
                    </span>
                  </div>
                  <p className="text-xs text-ash mt-1">Customer: {esc.orders.customer_name} ({esc.orders.customer_phone})</p>
                  <p className="text-xs text-ash">Expected: BDT {esc.expected_amount} | Product: {esc.orders.products?.name || 'Item'}</p>
                  <p className="text-xs text-rust font-mono mt-1">Claimed TrxID/Ref: {esc.customer_provided_ref || 'None'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenIntervention(esc.id, esc.order_id, esc.orders.conversation_id, esc.orders.shop_id)}
                    className="px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Intervene Chat
                  </button>
                </div>
              </div>
            ))}
            {initialEscalations.length === 0 && (
              <div className="p-8 text-center text-ash text-sm">Escalation queue is clean. No active payment conflicts.</div>
            )}
          </div>
        </div>

        {/* Workspaces Table */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <div className="p-5 border-b border-dove/10 flex items-center justify-between gap-4 bg-white">
            <h2 className="text-lg font-medium text-ink shrink-0">Tenants Directory</h2>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search shops by name or slug..."
                className="w-full pl-9 pr-4 py-2 bg-fog border border-transparent rounded-inputs text-sm focus:border-ink/20 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-fog text-xs text-ash uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Workspace</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                  <th className="px-6 py-3 font-medium text-right">Total Spent</th>
                  <th className="px-6 py-3 font-medium text-right">AI Cost</th>
                  <th className="px-6 py-3 font-medium">Autopilot</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dove/10">
                {filteredShops.map(shop => (
                  <tr key={shop.id} className="hover:bg-fog/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink flex items-center gap-1.5">
                        {shop.name}
                        {shop.isQuiet && (
                          <span className="text-[9px] bg-apricot-wash text-rust px-1.5 py-0.5 rounded font-semibold animate-pulse">
                            INACTIVE
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ash font-mono">{shop.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${shop.credit_balance <= 100 ? 'text-rust font-semibold' : 'text-ink'}`}>
                        BDT {shop.credit_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-graphite font-mono">
                      BDT {shop.total_spent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-purple-600 font-mono">
                      ${(shop.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${shop.agent_enabled ? 'bg-green-50 text-green-700' : 'bg-fog text-graphite'}`}>
                        {shop.agent_enabled ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Enabled</>
                        ) : (
                          <><span className="w-1.5 h-1.5 rounded-full bg-ash" /> Paused</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleViewShopDetails(shop.id)}
                          className="p-1 text-ash hover:text-ink transition-colors"
                          title="Support View Configuration"
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        {grantShopId === shop.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={grantAmount}
                              onChange={e => setGrantAmount(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-white border border-dove/30 rounded text-xs focus:outline-none"
                            />
                            <button onClick={handleGrant} disabled={isPending} className="px-3 py-1 bg-ink text-white rounded text-xs font-medium hover:bg-black disabled:opacity-50">
                              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                            </button>
                            <button onClick={() => setGrantShopId(null)} className="px-3 py-1 bg-fog text-graphite rounded text-xs hover:bg-dove/20">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setGrantShopId(shop.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink hover:bg-fog inline-flex items-center gap-1 text-xs font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> BDT
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Onboarding Funnel Panel ── */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-dove/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Onboarding Funnel</h2>
            <p className="text-xs text-ash mt-0.5">Shops that started but haven&apos;t completed setup — sorted by longest stuck first</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${incompleteOnboardings.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {incompleteOnboardings.length} stuck
          </span>
        </div>
        {incompleteOnboardings.length === 0 ? (
          <div className="py-12 text-center text-ash text-sm">
            All shops have completed onboarding 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dove/10 bg-fog/40">
                  <th className="text-left py-3 px-6 font-semibold text-ash uppercase tracking-wider">Shop</th>
                  <th className="text-left py-3 px-4 font-semibold text-ash uppercase tracking-wider">Current Step</th>
                  <th className="text-left py-3 px-4 font-semibold text-ash uppercase tracking-wider">Time on Step</th>
                  <th className="text-left py-3 px-4 font-semibold text-ash uppercase tracking-wider">Business Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-ash uppercase tracking-wider">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {incompleteOnboardings.map((shop) => {
                  const updatedAt = shop.onboarding_step_updated_at ? new Date(shop.onboarding_step_updated_at) : new Date(shop.created_at);
                  const msSinceUpdate = Date.now() - updatedAt.getTime();
                  const hoursOnStep = msSinceUpdate / (1000 * 60 * 60);

                  const timeLabel = hoursOnStep < 1
                    ? `${Math.round(hoursOnStep * 60)}m`
                    : hoursOnStep < 24
                    ? `${Math.round(hoursOnStep)}h`
                    : `${Math.round(hoursOnStep / 24)}d`;

                  const timeColor = hoursOnStep < 1 ? 'text-green-700 bg-green-50 border-green-200' : hoursOnStep < 24 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 'text-red-700 bg-red-50 border-red-200';

                  const stepLabel: Record<string, string> = {
                    business_type: '1 · Business Type',
                    channels: '2 · Channels',
                    context: '3 · Context',
                    payments: '4 · Payments',
                    delivery: '5 · Delivery',
                    demo: '6 · Preview',
                  };

                  const typeColors: Record<string, string> = {
                    retail: 'bg-amber-50 text-amber-700',
                    restaurant: 'bg-orange-50 text-orange-700',
                    service: 'bg-blue-50 text-blue-700',
                  };

                  return (
                    <tr key={shop.id} className="border-b border-dove/10 hover:bg-fog/30 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-ink">{shop.name || '(unnamed)'}</div>
                        <div className="text-ash text-[11px]">{shop.slug}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-ink">
                          {stepLabel[shop.onboarding_step || ''] || shop.onboarding_step || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${timeColor}`}>
                          {timeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {shop.business_type ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeColors[shop.business_type] || 'bg-fog text-ash'}`}>
                            {shop.business_type}
                          </span>
                        ) : (
                          <span className="text-ash">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-ash">
                        {new Date(shop.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Support config view Modal */}
      {selectedShopId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-cards shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto border border-dove/10">
            <div className="p-6 border-b border-dove/10 flex items-center justify-between">
              <h3 className="text-lg font-medium text-ink">Support Overview Setup</h3>
              <button onClick={() => setSelectedShopId(null)} className="text-ash hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ash" /></div>
              ) : shopDetails ? (
                <div className="space-y-4">
                  <div className="p-4 bg-fog rounded-inputs">
                    <p className="text-xs text-ash uppercase font-semibold">Tenant Info</p>
                    <p className="text-sm font-semibold text-ink mt-1">{shopDetails.name} ({shopDetails.slug})</p>
                  </div>
                  <div className="p-4 bg-fog rounded-inputs">
                    <p className="text-xs text-ash uppercase font-semibold">Facebook Connection</p>
                    <p className="text-sm font-semibold text-ink mt-1">{shopDetails.meta_page_name}</p>
                  </div>
                  <div className="p-4 bg-fog rounded-inputs">
                    <p className="text-xs text-ash uppercase font-semibold">Payment Verification Method</p>
                    <p className="text-sm font-semibold text-ink mt-1 capitalize">{shopDetails.payment_method.replace(/_/g, ' ')}</p>
                    <div className="text-xs text-ash mt-2 space-y-1">
                      <p>bKash Merchant API: {shopDetails.bkashStatus}</p>
                      <p>Nagad Merchant API: {shopDetails.nagadStatus}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-fog rounded-inputs">
                    <p className="text-xs text-ash uppercase font-semibold">Courier Provider</p>
                    <p className="text-sm font-semibold text-ink mt-1 capitalize">{shopDetails.courier_provider}</p>
                    <p className="text-xs text-ash mt-1">Credentials: {shopDetails.courierStatus}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ash">Could not load details.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remote Intervention Workspace Panel (Drawer) */}
      {activeIntervention && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl relative border-l border-dove/10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-dove/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-ink flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 text-rust" />
                  Supervisor Console
                </h3>
                <p className="text-xs text-ash mt-0.5">Direct chat intervention & override panel</p>
              </div>
              <button onClick={() => setActiveIntervention(null)} className="text-ash hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Override */}
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-red-800 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" />
                Manual Payment Override Action
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleResolvePayment('confirmed')}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm Payment
                </button>
                <button 
                  onClick={() => handleResolvePayment('failed')}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 flex items-center gap-1 shadow-sm"
                >
                  <X className="w-3.5 h-3.5" /> Reject Payment
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-fog/20">
              {isLoadingMessages ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-ash" /></div>
              ) : (
                <>
                  {interventionMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.sender === 'bot' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-subtle ${
                        msg.sender === 'bot' 
                          ? 'bg-ink text-white rounded-tr-none' 
                          : 'bg-white text-ink border border-dove/20 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-ash mt-1 px-1">
                        {msg.sender === 'bot' ? 'Bot' : 'Customer'} • {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {interventionMessages.length === 0 && (
                    <p className="text-sm text-ash text-center py-12">No messages loaded.</p>
                  )}
                </>
              )}
            </div>

            {/* Response Input */}
            <div className="p-4 border-t border-dove/10 bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Send a manual supervisor response to customer..."
                  className="flex-1 bg-fog border border-transparent rounded-inputs px-4 py-3 text-sm focus:border-ink/20 focus:outline-none transition-colors"
                />
                <button 
                  onClick={handleSendInterventionMessage}
                  disabled={isSendingReply || !replyText.trim()}
                  className="px-6 bg-ink text-white rounded-buttons text-sm font-semibold hover:bg-black disabled:opacity-50 flex items-center justify-center"
                >
                  {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
