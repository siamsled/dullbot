'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Check, ArrowUpRight, MessageSquareText, ShieldAlert,
  Frown, Smile, Inbox, Loader2, Sparkles, User, BadgeAlert
} from 'lucide-react';
import Link from 'next/link';
import { resolveComplaint } from './actions';

interface ComplaintItem {
  id: string;
  customer_phone: string;
  last_message_at: string;
  last_message_content: string | null;
  meta_name: string | null;
  meta_profile_pic: string | null;
  status: string;
  ticket_reason: string | null;
  handoff_summary: any;
}

export default function ComplaintsClient({ initialComplaints, shopId }: { initialComplaints: ComplaintItem[]; shopId: string }) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>(initialComplaints);
  const [activeId, setActiveId] = useState<string | null>(initialComplaints[0]?.id || null);
  const [isPending, startTransition] = useTransition();

  const activeComplaint = complaints.find(c => c.id === activeId);

  const handleResolve = (id: string) => {
    startTransition(async () => {
      const res = await resolveComplaint(id);
      if (res.success) {
        setComplaints(prev => {
          const next = prev.filter(c => c.id !== id);
          if (activeId === id) {
            setActiveId(next[0]?.id || null);
          }
          return next;
        });
      } else {
        alert(res.error || 'Failed to resolve complaint');
      }
    });
  };

  const getSentimentEmoji = (sentiment?: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s.includes('frustrated') || s.includes('negative') || s.includes('angry')) {
      return <Frown className="w-4 h-4 text-rust shrink-0" />;
    }
    return <Smile className="w-4 h-4 text-emerald-600 shrink-0" />;
  };

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5 flex items-center gap-3">
          <BadgeAlert className="w-10 h-10 text-rust shrink-0" />
          Complaints
        </h1>
        <p className="text-ash text-sm">Review escalated conversations, customer complaints, and AI-generated handoff summaries.</p>
      </div>

      {complaints.length === 0 ? (
        <div className="flex-1 bg-white rounded-cards border border-dove/10 p-12 flex flex-col items-center justify-center text-center shadow-subtle min-h-[400px]">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <Smile className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-serif text-ink mb-1">All quiet here</h2>
          <p className="text-ash text-sm max-w-sm">No customer complaints or active escalations. Your customers are happy and handled!</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-[500px]">
          {/* Left panel: List */}
          <div className="lg:col-span-1 bg-white rounded-cards border border-dove/10 shadow-subtle flex flex-col overflow-hidden h-[600px]">
            <div className="px-5 py-4 border-b border-dove/10 bg-fog/20 shrink-0">
              <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">
                Active Tickets ({complaints.length})
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-dove/10">
              {complaints.map(item => {
                const isActive = item.id === activeId;
                const summary = item.handoff_summary;
                const name = item.meta_name || `User ${item.customer_phone.slice(-4)}`;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`w-full text-left p-4 transition-all flex items-start gap-3 relative ${
                      isActive ? 'bg-fog/40' : 'hover:bg-fog/20'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rust" />}
                    
                    {item.meta_profile_pic ? (
                      <img
                        src={item.meta_profile_pic}
                        alt={name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-dove/25"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-fog flex items-center justify-center shrink-0 border border-dove/25">
                        <User className="w-4 h-4 text-graphite" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-semibold text-ink text-sm truncate">{name}</span>
                        <span className="text-[9px] font-bold text-rust bg-apricot-wash px-2 py-0.5 rounded-full uppercase shrink-0 border border-rust/10">
                          {item.ticket_reason || 'Escalation'}
                        </span>
                      </div>
                      <p className="text-xs text-ash truncate mt-1">
                        {item.last_message_content || 'No messages yet'}
                      </p>
                      <span className="text-[10px] text-dove block mt-2">
                        {new Date(item.last_message_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Detail Summary View */}
          <div className="lg:col-span-2 bg-white rounded-cards border border-dove/10 shadow-subtle flex flex-col overflow-hidden h-[600px]">
            {activeComplaint ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Detail Header */}
                <div className="px-6 py-5 border-b border-dove/10 bg-fog/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    {activeComplaint.meta_profile_pic ? (
                      <img
                        src={activeComplaint.meta_profile_pic}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-dove/25"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-fog flex items-center justify-center shrink-0 border border-dove/25">
                        <User className="w-5 h-5 text-graphite" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-serif font-medium text-ink text-base">
                        {activeComplaint.meta_name || 'Facebook Customer'}
                      </h3>
                      <p className="text-[11px] text-ash mt-0.5">PSID: {activeComplaint.customer_phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/inbox"
                      className="px-4 py-2 bg-fog border border-dove/20 text-ink rounded-buttons text-xs font-semibold hover:bg-dove/15 transition-all flex items-center gap-1.5 shadow-subtle"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      Open Inbox
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => handleResolve(activeComplaint.id)}
                      disabled={isPending}
                      className="px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-subtle"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Resolve Complaint
                    </button>
                  </div>
                </div>

                {/* Detail Content */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {/* AI Generated Summary Block */}
                  {activeComplaint.handoff_summary ? (
                    <div className="bg-fog/30 border border-dove/15 rounded-cards p-5 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-dove/10">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-rust shrink-0" />
                          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">AI Handoff Intelligence</h4>
                        </div>
                        {activeComplaint.handoff_summary.sentiment && (
                          <div className="flex items-center gap-1.5 bg-white border border-dove/10 px-2.5 py-1 rounded-full text-xs font-medium">
                            {getSentimentEmoji(activeComplaint.handoff_summary.sentiment)}
                            <span className="text-ink capitalize">{activeComplaint.handoff_summary.sentiment}</span>
                          </div>
                        )}
                      </div>

                      {/* Wants */}
                      {activeComplaint.handoff_summary.wants && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Customer Intent</span>
                          <div className="text-xs text-ink leading-relaxed whitespace-pre-line">
                            {activeComplaint.handoff_summary.wants}
                          </div>
                        </div>
                      )}

                      {/* Facts */}
                      {activeComplaint.handoff_summary.facts && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Gathered Facts</span>
                          <div className="text-xs text-ink leading-relaxed whitespace-pre-line">
                            {activeComplaint.handoff_summary.facts}
                          </div>
                        </div>
                      )}

                      {/* Flag Reason */}
                      {activeComplaint.handoff_summary.flagReason && (
                        <div className="space-y-2 pt-2 border-t border-dove/10">
                          <span className="text-[10px] font-bold text-rust uppercase tracking-wider block">Trigger Context</span>
                          <p className="text-xs text-rust font-medium leading-relaxed">
                            {activeComplaint.handoff_summary.flagReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-dove/20 rounded-cards p-6 text-center text-ash text-xs">
                      No handoff summary available. Chat logs can be reviewed directly in the Live Inbox.
                    </div>
                  )}

                  {/* Last message preview */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Last Message Received</span>
                    <div className="p-4 bg-white border border-dove/15 rounded-inputs text-xs text-ink italic leading-relaxed">
                      "{activeComplaint.last_message_content || 'No messages received'}"
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-ash">
                <Inbox className="w-12 h-12 text-dove mb-2" />
                <p className="text-sm">Select a ticket from the left panel to review complaint details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
