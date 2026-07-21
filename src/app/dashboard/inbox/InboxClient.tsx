'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bot, User, Search, AlertTriangle, ShieldCheck, UserCog, AlertCircle, Phone, Clock, ArrowLeft, MoreVertical, Ban, Tag, ArrowDown, ArrowUp, ShieldAlert, Send, MessageSquareText, Reply, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, Lock, Smartphone, Sparkles, X, RefreshCw, BrainCircuit } from 'lucide-react';
import { getMessages, sendMessage, toggleTakeover, getConversations, resolveFacebookProfile, flagCustomerAsFraud, generateHandoffSummary, markAsRead, updateInternalNotes, updateCustomerTags, updateConversationTags, assignConversation, resolveConversation, getCustomerOrderHistory, getQuickReplies } from './actions';
import MessengerInput from '@/components/dashboard/MessengerInput';
import { parseMessageSegments, extractReplyContext } from '@/lib/message-parser';
import { supabaseBrowser } from '@/lib/supabase-browser';

function formatWaitingTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function formatMessageDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - msgDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function renderOrganizedList(text: string) {
  if (!text) return null;
  const lines = text
    .split(/\n|•/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length <= 1 && !text.includes('•')) {
    return <p className="text-xs text-ink leading-relaxed font-medium">{text}</p>;
  }

  return (
    <ul className="space-y-1.5 mt-1 list-none">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 30) {
          const key = line.substring(0, colonIdx).trim();
          const value = line.substring(colonIdx + 1).trim();
          return (
            <li key={i} className="text-xs text-ink leading-relaxed flex items-start gap-1.5">
              <span className="text-ash font-bold select-none text-[10px]">•</span>
              <div>
                <span className="font-semibold text-graphite">{key}: </span>
                <span className="text-ink font-medium">{value}</span>
              </div>
            </li>
          );
        }
        return (
          <li key={i} className="text-xs text-ink leading-relaxed flex items-start gap-1.5">
            <span className="text-ash font-bold select-none text-[10px]">•</span>
            <span className="text-ink font-medium">{line}</span>
          </li>
        );
      })}
    </ul>
  );
}

function HandoffSummaryCard({
  conversation,
  onSummaryUpdated
}: {
  conversation: any;
  onSummaryUpdated: (summary: any) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const summary = conversation.handoff_summary;

  const handleGenerate = async () => {
    setIsLoading(true);
    const res = await generateHandoffSummary(conversation.id);
    setIsLoading(false);
    if (res && res.success && res.summary) {
      onSummaryUpdated(res.summary);
    }
  };

  useEffect(() => {
    if (!summary && conversation.id) {
      handleGenerate();
    }
  }, [conversation.id]);

  const sentimentConfig: Record<string, { cls: string; label: string }> = {
    frustrated: { cls: 'bg-red-50 text-red-700 border-red-200', label: '😤 Frustrated' },
    neutral:    { cls: 'bg-slate-50 text-slate-600 border-slate-200', label: '😐 Neutral' },
    positive:   { cls: 'bg-green-50 text-green-700 border-green-200', label: '😊 Positive' },
  };

  const sentiment = (summary?.sentiment || 'neutral').toLowerCase();
  const { cls: sentimentCls, label: sentimentLabel } = sentimentConfig[sentiment] || sentimentConfig.neutral;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-amber-100/60 border-b border-amber-200">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">AI Briefing</span>
        </div>
        <div className="flex items-center gap-1.5">
          {summary && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sentimentCls}`}>
              {sentimentLabel}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            title="Regenerate summary"
            className="p-1 rounded hover:bg-amber-200 text-amber-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 space-y-2">
        {isLoading && !summary ? (
          <p className="text-[11px] text-amber-700 italic">Generating briefing...</p>
        ) : summary ? (
          <>
            {/* Intent */}
            <div>
              <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Customer wants</p>
              <p className="text-[11px] text-ink leading-relaxed">
                {summary.wants?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || '—'}
              </p>
            </div>
            {/* Facts */}
            {summary.facts && (
              <div>
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Key facts</p>
                <p className="text-[11px] text-ink leading-relaxed">
                  {summary.facts?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || '—'}
                </p>
              </div>
            )}
            {/* Escalation */}
            {(summary.flagReason || conversation.ticket_reason) && (
              <div>
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Escalation</p>
                <p className="text-[11px] text-rust font-semibold">
                  {summary.flagReason?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || conversation.ticket_reason || 'Manual takeover'}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-[11px] text-amber-700">No briefing yet.</p>
        )}
      </div>
    </div>
  );
}

export default function InboxClient({
  shop: initialShop,
  initialConversations,
  productCount,
  initialPhone
}: {
  shop: any;
  initialConversations: any[];
  productCount: number;
  initialPhone?: string | null;
}) {
  const [shop, setShop] = useState(initialShop);
  const [conversations, setConversations] = useState(initialConversations);
  // If initialPhone is provided (deep-link from Orders), find the matching conversation
  const initialId = initialPhone
    ? (initialConversations.find(c => c.customer_phone === initialPhone)?.id ?? initialConversations[0]?.id ?? null)
    : (initialConversations[0]?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTakeover, setIsTakeover] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { customer_name: string; profile_pic_url?: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filter, setFilter] = useState<'all' | 'tickets' | 'confirmed' | 'test'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; mid?: string } | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [orderHistory, setOrderHistory] = useState<{ orders: any[], totalSpend: number }>({ orders: [], totalSpend: 0 });
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState<'customer' | 'conv' | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user);
    });
  }, []);

  // Hard Requirements Check
  const stepsDone = shop.onboarding_steps_done || [];
  const isClassificationDone = stepsDone.includes('classification');
  const isContextDone = stepsDone.includes('context_form');
  const isMetaDone = shop.meta_page_access_token !== null;
  const hardRequirementsMet = isClassificationDone && isContextDone && isMetaDone;

  // Pagination and Virtualization State
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);


  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop: currentScrollTop, scrollHeight, clientHeight } = container;
    setScrollTop(currentScrollTop);

    const isAtBottom = scrollHeight - currentScrollTop - clientHeight < 50;

    setShowScrollBottom(!isAtBottom);
    setShowScrollTop(!isAtBottom && scrollHeight > clientHeight + 100);

    // Trigger scroll-up pagination if scrolled near top (< 100px)
    if (currentScrollTop < 100 && messages.length >= 30 && hasMoreMessages && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeConv = conversations.find(c => c.id === activeId);

  const isTakeoverRef = useRef(isTakeover);
  const pendingTogglesRef = useRef(new Set<string>());
  useEffect(() => {
    isTakeoverRef.current = isTakeover;
  }, [isTakeover]);

  useEffect(() => {
    if (activeConv) {
      setIsTakeover(activeConv.status === 'human_takeover');
    }
  }, [activeConv]);

  useEffect(() => {
    conversations.forEach(async (conv) => {
      if ((conv.channel === 'messenger' || conv.channel === 'instagram') && /^\d+$/.test(conv.customer_phone) && !profiles[conv.customer_phone]) {
        const profile = await resolveFacebookProfile(conv.customer_phone, shop.id);
        setProfiles(prev => ({
          ...prev,
          [conv.customer_phone]: profile
        }));
      }
    });
  }, [conversations, shop.id]);

  const lastMsgCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const messageCacheRef = useRef<Record<string, { msgs: any[], hasMore: boolean }>>({});

  // 1. Initial Load of Messages on Conversation switch
  useEffect(() => {
    if (!activeId) return;

    // Reset unread locally and in database
    markAsRead(activeId);
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unread_count: 0 } : c));

    const activeConv = conversations.find(c => c.id === activeId);
    if (activeConv) {
      getCustomerOrderHistory(shop.id, activeConv.customer_phone).then(setOrderHistory);
    }
    getQuickReplies(shop.id).then(setQuickReplies);

    const cached = messageCacheRef.current[activeId];
    if (cached) {
      setMessages(cached.msgs);
      setHasMoreMessages(cached.hasMore);
      setIsLoadingMore(false);
      isFirstLoadRef.current = true;
    } else {
      setMessages([]);
      setHasMoreMessages(true);
      setIsLoadingMore(false);
      isFirstLoadRef.current = true;

      const fetchInit = async () => {
        const msgs = await getMessages(activeId, undefined, 40);
        setMessages(msgs || []);
        const hasMore = msgs && msgs.length >= 40;
        setHasMoreMessages(hasMore);
        messageCacheRef.current[activeId] = { msgs: msgs || [], hasMore };

        // Scroll to bottom immediately
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      };
      fetchInit();
    }
  }, [activeId]);

  // 2. Paginated scroll-up load of older messages
  const loadMoreMessages = async () => {
    if (!activeId || isLoadingMore || !hasMoreMessages || messages.length === 0) return;
    setIsLoadingMore(true);

    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    const oldestTimestamp = messages[0].created_at;
    const msgs = await getMessages(activeId, oldestTimestamp, 40);

    const hasMore = msgs && msgs.length >= 40;
    setHasMoreMessages(hasMore);

    if (msgs && msgs.length > 0) {
      setMessages(prev => {
        const merged = [...msgs, ...prev];
        messageCacheRef.current[activeId] = { msgs: merged, hasMore };
        return merged;
      });

      // Maintain scroll position to avoid layout jumps
      if (container) {
        requestAnimationFrame(() => {
          const nextScrollHeight = container.scrollHeight;
          container.scrollTop = prevScrollTop + (nextScrollHeight - prevScrollHeight);
        });
      }
    }
    setIsLoadingMore(false);
  };

  // 3. Realtime message thread subscriber
  useEffect(() => {
    if (!activeId) return;

    const channelName = `messages-thread:${activeId}`;
    const channel = supabaseBrowser
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeId}`
        },
        (payload) => {
          const newMsg = payload.new;

          // Reset unread count locally and in database
          markAsRead(activeId);
          setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unread_count: 0 } : c));

          setMessages(prev => {
            // Check if duplicate
            if (prev.some((m: any) => m.id === newMsg.id)) return prev;

            // Remove corresponding optimistic message if exists
            const filtered = prev.filter(m => {
              if (!m.isOptimistic) return true;
              return m.tempId !== newMsg.temp_id;
            });

            const merged = [...filtered, newMsg];
            // Update cache as well
            const cached = messageCacheRef.current[activeId];
            messageCacheRef.current[activeId] = {
              msgs: merged,
              hasMore: cached ? cached.hasMore : true
            };
            return merged;
          });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [activeId]);

  // 4. Realtime conversation list updating (bumps and additions)
  useEffect(() => {
    const channelName = `conversations-inbox:${shop.id}`;
    const channel = supabaseBrowser
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `shop_id=eq.${shop.id}`
        },
        (payload) => {
          const updatedConv = payload.new as any;
          setConversations(prev => {
            // Keep local unread_count as 0 if this conversation is active
            if (updatedConv.id === activeId) {
              updatedConv.unread_count = 0;
            }
            const exists = prev.some(c => c.id === updatedConv.id);
            let nextList = [];
            if (exists) {
              nextList = prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c);
            } else {
              nextList = [updatedConv, ...prev];
            }
            // Sort by last message time
            return nextList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [shop.id, activeId]);

  // Scroll bottom on new message insertion if user was already at bottom
  useEffect(() => {
    if (messages.length === 0) return;

    if (isFirstLoadRef.current) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      isFirstLoadRef.current = false;
    } else if (messages.length > lastMsgCountRef.current) {
      // Check if user is near bottom
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }

    lastMsgCountRef.current = messages.length;
    setTimeout(handleScroll, 100);
  }, [messages]);

  const handleSend = async (text: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => {
    if (!text.trim() && !mediaUrl) return;
    if (!activeId) return;

    // Create an optimistic message object.
    let displayContent = text;
    if (mediaUrl) {
      displayContent = mediaType === 'image' ? `IMAGE:${mediaUrl}` : `AUDIO:${mediaUrl}`;
    }

    // Prefix with reply text so UI updates optimistically like it will when saved
    if (replyingTo) {
      displayContent = `[Replying to: "${replyingTo.text}"] ${displayContent}`;
    }

    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      tempId,
      sender: 'human_agent',
      content: displayContent,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, newMsg]);
    const replyMid = replyingTo?.mid;
    setReplyingTo(null);

    // Auto-assign to current agent when manually sending in takeover mode
    if (isTakeover && currentUser && activeConv && !activeConv.assigned_to_id) {
      const uid = currentUser.id;
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, assigned_to_id: uid } : c));
      assignConversation(activeId, uid);
    }

    try {
      const result = await sendMessage(activeId, text, replyMid, mediaUrl, mediaType);
      if (!result || result.error) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        alert(`Failed to send message: ${result?.error || 'Unknown error'}`);
      } else {
        // Replace the optimistic message with the real one from DB
        setMessages(prev => {
          const without = prev.filter(m => m.id !== tempId);
          const realMsg = { ...result, isOptimistic: false };
          // Avoid duplicate if polling already picked it up
          if (without.some((m: any) => m.id === realMsg.id)) return without;
          const merged = [...without, realMsg];
          const cached = messageCacheRef.current[activeId];
          if (activeId) {
            messageCacheRef.current[activeId] = {
              msgs: merged,
              hasMore: cached ? cached.hasMore : true
            };
          }
          return merged;
        });
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert(`Network or Server error: ${err.message || 'Please refresh the page and try again.'}`);
    }
  };

  const handleToggle = async () => {
    if (!activeId) return;

    const targetId = activeId;
    const newStatus = !isTakeover;
    setIsTakeover(newStatus);

    pendingTogglesRef.current.add(targetId);

    setConversations(prev => prev.map(c =>
      c.id === targetId ? { ...c, status: newStatus ? 'human_takeover' : 'bot_active' } : c
    ));

    await toggleTakeover(targetId, newStatus);

    setTimeout(() => {
      pendingTogglesRef.current.delete(targetId);
    }, 2000);
  };

  const handleFlagFraud = async () => {
    if (!activeId || !confirm("Are you sure you want to flag this customer as fraud? DullBot will stop responding to them.")) return;
    await flagCustomerAsFraud(activeId, "Flagged from Inbox");
    alert("Customer flagged as fraud.");
    // Force reload to reflect takeover status
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
      {/* Launch Control Panel Banner redirect */}
      {!hardRequirementsMet && !isBannerDismissed && (
        <div className="bg-apricot-wash border border-rust/10 p-4 rounded-cards flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-rust shadow-sm border border-rust/10">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-medium text-ink text-sm">AI Autopilot is disabled</h3>
              <p className="text-xs text-ash">
                Complete your <strong className="text-ink">Business Context</strong> in the sidebar and connect your <strong className="text-ink">Facebook Page</strong> in Settings to activate the AI agent.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="p-1.5 text-rust/70 hover:text-rust hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Inbox Workspace Container */}
      <div className="flex-1 min-h-0 bg-white rounded-cards shadow-subtle border border-dove/20 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-dove/20 flex flex-col bg-fog">
          <div className="p-4 border-b border-dove/10 bg-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-serif text-ink font-medium">Inbox</h2>
              {!hardRequirementsMet && (
                <span className="px-2.5 py-1 bg-apricot-wash text-rust text-[10px] font-bold rounded-full">
                  Setup Mode
                </span>
              )}
            </div>
            <div className="mt-3 relative">
              <Search className="w-4 h-4 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-fog rounded-inputs text-sm text-ink border-transparent focus:border-dove focus:ring-0 transition-colors"
              />
            </div>
            {/* Filter Toggles */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
              {(['all', 'tickets', 'confirmed', 'test'] as const)
                .filter(f => f !== 'test' || process.env.NODE_ENV === 'development')
                .map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      const nextFiltered = conversations.filter(conv => {
                        if (f === 'test') return !!conv.is_test;
                        if (conv.is_test) return false;
                        if (f === 'tickets') {
                          return conv.ticket_reason === 'complaint' || conv.ticket_reason === 'unsure' || conv.status === 'human_takeover';
                        }
                        if (f === 'confirmed') {
                          return conv.orders?.some((o: any) => o.status === 'confirmed') || false;
                        }
                        return true;
                      });
                      if (nextFiltered.length > 0 && !nextFiltered.some(c => c.id === activeId)) {
                        setActiveId(nextFiltered[0].id);
                      } else if (nextFiltered.length === 0) {
                        setActiveId(null);
                      }
                    }}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all whitespace-nowrap ${filter === f
                      ? 'bg-ink text-white border-ink shadow-sm'
                      : 'bg-white text-ash border-dove/20 hover:bg-dove/10 hover:text-ink'
                      }`}
                  >
                    {f === 'all' ? 'All' : f === 'tickets' ? 'Tickets' : f === 'confirmed' ? 'Orders' : 'Test Data'}
                  </button>
                ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const filteredConversations = conversations.filter(conv => {
                // 1. Separate test and real conversations
                if (filter === 'test') {
                  if (!conv.is_test) return false;
                } else {
                  if (conv.is_test) return false;
                }

                // 2. Tab filter
                if (filter === 'tickets') {
                  const isTicket = conv.ticket_reason === 'complaint' || conv.ticket_reason === 'unsure' || conv.status === 'human_takeover';
                  if (!isTicket) return false;
                }
                if (filter === 'confirmed') {
                  const hasConfirmedOrder = conv.orders?.some((o: any) => o.status === 'confirmed');
                  if (!hasConfirmedOrder) return false;
                }

                // 3. Search query (scans name, phone, last message preview, and loaded message contents)
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  const nameMatch = (profiles[conv.customer_phone]?.customer_name || '').toLowerCase().includes(query) ||
                    conv.customer_phone.toLowerCase().includes(query);

                  const snippetMatch = (conv.last_message_content || '').toLowerCase().includes(query);

                  const cachedMsgs = messageCacheRef.current[conv.id]?.msgs || [];
                  const messageMatch = cachedMsgs.some((m: any) => m.content.toLowerCase().includes(query));

                  if (!nameMatch && !snippetMatch && !messageMatch) return false;
                }

                return true;
              });

              if (filteredConversations.length === 0) {
                return <div className="p-8 text-center text-ash text-sm">No conversations found.</div>;
              }

              return filteredConversations.map(conv => {
                const hasUnread = conv.unread_count > 0 && conv.id !== activeId;
                const snippet = conv.last_message_content || '';
                const isAssignedToMe = activeConv?.assigned_to_id === 'me' && conv.id === activeId;

                let previewText = 'No messages';
                if (snippet) {
                  if (snippet.startsWith('IMAGE:')) previewText = '📷 Photo';
                  else if (snippet.startsWith('AUDIO:')) previewText = '🎵 Voice message';
                  else previewText = snippet;
                }

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full text-left p-4 border-b border-dove/5 transition-colors flex items-center gap-3 relative ${activeId === conv.id ? 'bg-white shadow-sm border-l-4 border-l-ink' : 'hover:bg-dove/10 border-l-4 border-l-transparent'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-dove/20 flex flex-shrink-0 items-center justify-center text-ink font-medium overflow-hidden">
                      {conv.channel === 'whatsapp' ? (
                        (profiles[conv.customer_phone]?.customer_name || conv.customer_phone).substring(0, 2)
                      ) : profiles[conv.customer_phone]?.profile_pic_url ? (
                        <img
                          src={profiles[conv.customer_phone].profile_pic_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        (profiles[conv.customer_phone]?.customer_name || conv.customer_phone).substring(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasUnread && <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                          <p className={`text-sm truncate ${hasUnread ? 'text-ink font-bold' : 'text-graphite font-semibold'}`}>
                            {profiles[conv.customer_phone]?.customer_name || conv.customer_phone}
                          </p>
                        </div>
                        <p className="text-[10px] text-ash shrink-0">{formatMessageDate(conv.last_message_at)}</p>
                      </div>

                      {/* Snippet Preview */}
                      <p className={`text-xs truncate mb-2 max-w-[90%] ${hasUnread ? 'text-ink font-semibold' : 'text-ash'}`}>
                        {previewText}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {conv.status === 'human_takeover' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-apricot-wash text-rust border border-rust/10">
                            <UserCog className="w-2.5 h-2.5" /> Human
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-wash text-blue-600 border border-blue-150">
                            <Bot className="w-2.5 h-2.5" /> Bot
                          </span>
                        )}
                        {conv.ticket_reason === 'complaint' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-2.5 h-2.5" /> Complaint
                          </span>
                        )}
                        {conv.ticket_reason === 'unsure' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-750 border border-yellow-250">
                            <ShieldAlert className="w-2.5 h-2.5" /> Unsure
                          </span>
                        )}
                        {conv.orders?.some((o: any) => o.status === 'confirmed') && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-150 text-green-700 border border-green-200">
                            <ShieldCheck className="w-2.5 h-2.5" /> Order
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread Badge indicator */}
                    {hasUnread && (
                      <span className="absolute right-4 bottom-4 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Chat Window */}
        {activeId ? (
          <div className="flex-1 flex flex-col bg-pure-white relative min-h-0">
            {/* Chat Header */}
            <div className="border-b border-dove/20 flex items-center justify-between px-4 py-3 bg-white shrink-0 gap-3 min-w-0">
              {/* Identity Zone */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${showSidebar ? 'bg-dove/10 text-ink' : 'text-ash hover:bg-dove/10'}`}
                  title="Toggle customer panel"
                >
                  <ArrowRight className={`w-4 h-4 transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
                </button>
                <div className="w-8 h-8 rounded-full bg-dove/20 flex items-center justify-center text-ink text-xs font-semibold overflow-hidden shrink-0">
                  {activeConv && activeConv.channel !== 'whatsapp' && profiles[activeConv.customer_phone]?.profile_pic_url ? (
                    <img
                      src={profiles[activeConv.customer_phone].profile_pic_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    (activeConv ? (profiles[activeConv.customer_phone]?.customer_name || activeConv.customer_phone) : '').substring(0, 2)
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-ink truncate max-w-[140px]">
                      {activeConv ? (profiles[activeConv.customer_phone]?.customer_name || activeConv.customer_phone) : ''}
                    </h3>
                    {activeConv && (
                      <span className="text-[9px] font-bold text-ash bg-fog px-1.5 py-0.5 rounded border border-dove/10 flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock className="w-2 h-2" />
                        {formatWaitingTime(activeConv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-ash capitalize leading-none mt-0.5">via {activeConv?.channel}</p>
                </div>
              </div>

              {/* Actions Zone */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Assignment */}
                {activeConv && (
                  activeConv.assigned_to_id ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-fog border border-dove/20 rounded-lg text-[10px] font-semibold text-graphite whitespace-nowrap">
                      <User className="w-3 h-3 shrink-0" />
                      {activeConv.assigned_to_id === currentUser?.id ? 'You' : 'Agent'}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        const uid = currentUser?.id || 'me';
                        setConversations(prev => prev.map(c => c.id === activeId ? { ...c, assigned_to_id: uid } : c));
                        await assignConversation(activeId!, uid);
                      }}
                      className="px-2.5 py-1 bg-ink text-white text-[10px] font-bold rounded-lg hover:bg-black transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      <User className="w-3 h-3" /> Claim
                    </button>
                  )
                )}

                {/* Mark Resolved */}
                {activeConv && (activeConv.status === 'human_takeover' || activeConv.ticket_reason) && (
                  <button
                    onClick={async () => {
                      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status: 'bot_active', ticket_reason: null, assigned_to_id: null } : c));
                      await resolveConversation(activeId!);
                    }}
                    className="px-2.5 py-1 bg-white border border-dove/20 text-graphite hover:text-ink rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Resolve
                  </button>
                )}

                <div className="w-px h-5 bg-dove/20 mx-0.5"></div>

                {/* Autopilot Toggle — compact, no text labels */}
                <button
                  onClick={handleToggle}
                  title={!isTakeover ? 'Autopilot ON — click to pause' : 'Autopilot OFF — click to resume'}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${!isTakeover ? 'bg-green-500' : 'bg-dove'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${!isTakeover ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>

                {/* Overflow Kebab */}
                <div className="relative">
                  <button
                    onClick={() => setShowHeaderMenu(v => !v)}
                    className="p-1.5 rounded-lg hover:bg-dove/10 text-graphite transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showHeaderMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowHeaderMenu(false)} />
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-dove/20 rounded-xl shadow-md py-1.5 z-20">
                        <button
                          onClick={() => { setShowHeaderMenu(false); handleFlagFraud(); }}
                          className="w-full text-left px-3 py-2 text-xs text-rust hover:bg-red-50 flex items-center gap-2 font-medium"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Block Customer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Takeover Warning Banner */}
            {isTakeover && (
              <div className="bg-apricot-wash px-4 py-2 flex items-center gap-2 border-b border-rust/10 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rust" />
                <p className="text-xs font-medium text-rust">
                  DullBot is paused. You are currently chatting as a human agent. Toggle the switch above to re-enable AI.
                </p>
              </div>
            )}


            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 relative"
            >
              {isLoadingMore && (
                <div className="flex justify-center py-2 text-ash text-xs items-center gap-1.5 absolute top-2 left-1/2 -translate-x-1/2 bg-white/80 px-3 py-1 rounded-full shadow-sm border border-dove/20 backdrop-blur-sm z-10">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </div>
              )}
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-ash text-sm">No messages in this conversation.</div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((msg, idx) => {
                    const isCustomer = msg.sender === 'customer';
                    const isHumanAgent = msg.sender === 'human_agent';
                    const isSystem = msg.sender === 'system';
                    const isLastMsg = idx === messages.length - 1;

                    const { quotedText, actualContent } = extractReplyContext(msg.content);
                    const segments = parseMessageSegments(actualContent);

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-fog border border-dove/10 px-4 py-1.5 rounded-full shadow-sm">
                            <p className="text-[10px] font-bold text-ash uppercase tracking-widest flex items-center gap-2">
                              <BrainCircuit className="w-3 h-3" />
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div id={`message-${msg.id}`} key={msg.id} className={`flex group transition-all duration-500 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        {/* Reply Button (Hover) - Right side for customer, left for agent */}
                        {!isCustomer && (
                          <div className="flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-2 pb-5">
                            <button
                              onClick={() => setReplyingTo({ id: msg.id, text: actualContent, mid: msg.fb_message_ids?.[0] })}
                              className="p-1.5 rounded-full hover:bg-black/5 text-ash hover:text-ink transition-colors"
                              title="Reply to this message"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[75%] ${isCustomer ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-1.5 mb-1 mx-1">
                            {!isCustomer && isHumanAgent && <UserCog className="w-3 h-3 text-ash" />}
                            {!isCustomer && !isHumanAgent && <Bot className="w-3 h-3 text-ash" />}
                            <span className="text-[10px] font-medium text-ash uppercase tracking-wider">
                              {isCustomer ? ((activeConv ? (profiles[activeConv.customer_phone]?.customer_name || 'Customer') : 'Customer')) : isHumanAgent ? 'You (Human)' : 'DullBot AI'}
                            </span>
                            <span className="text-[10px] text-ash">
                              {formatMessageDate(msg.created_at)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 w-full mt-1">

                            {quotedText && (() => {
                              const quotedSegments = parseMessageSegments(quotedText);
                              const quotedImageSegment = quotedSegments.find(s => s.type === 'image');
                              const firstTextSegment = quotedSegments.find(s => s.type === 'text');

                              return (
                                <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} mb-1 opacity-70`}>
                                  <div
                                    onClick={() => {
                                      const clean = (s: string) => {
                                        if (!s) return '';
                                        let cleaned = s.replace(/^\[Customer is replying[\s\S]*?\]/i, '')
                                          .replace(/^\[Replying to[\s\S]*?\]/i, '')
                                          .replace(/^IMAGE:/i, '')
                                          .replace(/^AUDIO:/i, '')
                                          .replace(/^\[Product Image\]/i, '')
                                          .replace(/^\[Voice Message\]/i, '');
                                        return cleaned.replace(/\s+/g, '').toLowerCase().trim();
                                      };

                                      const quotedCleaned = clean(quotedText || '');
                                      if (!quotedCleaned) return;

                                      const target = [...messages].reverse().find(m => {
                                        const originalCleaned = clean(m.content);
                                        return originalCleaned.includes(quotedCleaned) || quotedCleaned.includes(originalCleaned);
                                      });

                                      if (target) {
                                        const el = document.getElementById(`message-${target.id}`);
                                        if (el) {
                                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          el.style.transition = 'background-color 0.3s ease';
                                          el.style.backgroundColor = 'rgba(0, 132, 255, 0.15)';
                                          setTimeout(() => {
                                            el.style.backgroundColor = 'transparent';
                                          }, 1200);
                                        }
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-[13px] rounded-xl flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${isCustomer
                                      ? 'bg-[#E4E6EB]/60 text-[#65676B] border-l-2 border-[#BEC3C9]'
                                      : 'bg-[#0084FF]/20 text-[#0084FF] border-r-2 border-[#0084FF]/50'
                                      }`}
                                  >
                                    <Reply className="w-3 h-3 shrink-0" />
                                    {quotedImageSegment && (
                                      <div className="h-6 w-6 rounded bg-black/10 overflow-hidden shrink-0 flex items-center justify-center">
                                        <img src={quotedImageSegment.content} alt="Quoted image" className="h-full w-full object-cover" />
                                      </div>
                                    )}
                                    {firstTextSegment ? (
                                      <span className="truncate max-w-[150px] italic">
                                        {firstTextSegment.content}
                                      </span>
                                    ) : quotedImageSegment ? (
                                      <span className="italic">Photo</span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()}

                            {segments.map((segment, sIdx) => {
                              const isFirst = sIdx === 0 && !quotedText;
                              return (
                                <div key={`${msg.id}-${sIdx}`} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                  {segment.type === 'image' ? (
                                    <a href={segment.content} target="_blank" rel="noopener noreferrer" className="block max-w-xs rounded-2xl overflow-hidden">
                                      <img src={segment.content} alt="Attachment" className="max-h-64 w-auto object-cover hover:opacity-95 transition-opacity duration-200" />
                                    </a>
                                  ) : segment.type === 'video' ? (
                                    <div className="max-w-xs rounded-2xl overflow-hidden bg-black">
                                      <video
                                        src={segment.content}
                                        controls
                                        className="max-h-64 w-full object-contain"
                                        preload="metadata"
                                      />
                                    </div>
                                  ) : segment.type === 'audio' ? (
                                    <div className={`px-4 py-2 rounded-2xl ${isCustomer ? 'bg-[#E4E6EB]' : 'bg-[#0084FF]'}`}>
                                      <audio src={segment.content} controls className="max-w-full" />
                                    </div>
                                  ) : (
                                    <div className={`px-4 py-2 text-[15px] ${isCustomer
                                      ? `bg-[#E4E6EB] text-[#050505] ${isFirst ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                                      : `bg-[#0084FF] text-white ${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                      }`}>
                                      {segment.content}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Sent status check */}
                          {!isCustomer && (
                            <div className="text-[10px] text-ash/80 mt-1 mx-1 select-none font-medium">
                              {msg.isOptimistic ? (
                                <span className="italic text-ash/60">Sending...</span>
                              ) : (
                                isLastMsg && <span>Sent</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reply Button (Hover) - Left side for customer */}
                        {isCustomer && (
                          <div className="flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity pl-2 pb-5">
                            <button
                              onClick={() => setReplyingTo({ id: msg.id, text: actualContent, mid: msg.fb_message_ids?.[0] })}
                              className="p-1.5 rounded-full hover:bg-black/5 text-ash hover:text-ink transition-colors"
                              title="Reply to this message"
                            >
                              <Reply className="w-4 h-4 scale-x-[-1]" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating scroll buttons */}
            <div className="absolute top-20 right-6 flex gap-2 z-10">
              {showScrollTop && (
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="p-2.5 bg-white/40 hover:bg-white/80 text-ink/80 hover:text-ink rounded-full shadow-sm border border-dove/20 backdrop-blur-sm transition-all transform hover:scale-105 flex items-center justify-center"
                  title="Scroll to beginning of conversation"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
              {showScrollBottom && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="p-2.5 bg-white/40 hover:bg-white/80 text-ink/80 hover:text-ink rounded-full shadow-sm border border-dove/20 backdrop-blur-sm transition-all transform hover:scale-105 flex items-center justify-center"
                  title="Scroll to latest messages"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Suggested Reply */}
            {activeConv?.suggested_reply && isTakeover && (
              <div className="mx-6 mb-2 p-3 bg-sky-wash border border-blue-150 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">AI Suggested Reply</span>
                  </div>
                  <button
                    onClick={() => setConversations(prev => prev.map(c => c.id === activeId ? { ...c, suggested_reply: null } : c))}
                    className="text-ash hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-ink mb-3 leading-relaxed">{activeConv.suggested_reply}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleSend(activeConv.suggested_reply!);
                      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, suggested_reply: null } : c));
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" /> Send as-is
                  </button>
                  <button
                    onClick={() => {
                      setInputValue(activeConv.suggested_reply || '');
                      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, suggested_reply: null } : c));
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-[11px] font-bold rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit first
                  </button>
                </div>
              </div>
            )}

            {/* Quick Reply Chips */}
            {isTakeover && quickReplies.length > 0 && (
              <div className="px-6 mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {quickReplies.map((qr: any) => (
                  <button
                    key={qr.id}
                    onClick={() => handleSend(qr.response_text)}
                    className="px-3 py-1.5 bg-white border border-dove/20 text-graphite text-[11px] font-medium rounded-full hover:border-ink hover:text-ink transition-all whitespace-nowrap"
                  >
                    {qr.trigger_pattern}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input */}
            <div className="shrink-0">
              <MessengerInput
                onSend={handleSend}
                isTakeover={isTakeover}
                shopId={shop.id}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                inputValue={inputValue}
                onInputValueChange={setInputValue}
              />
              {!isTakeover && (
                <p className="text-[10px] text-rust mt-1 px-4 pb-2">
                  Note: Sending a message will not automatically pause the bot unless you toggle Human Takeover.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-pure-white text-ash">
            <MessageSquareText className="w-12 h-12 mb-4 text-dove" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}

        {/* Customer Context Sidebar */}
        {activeId && activeConv && showSidebar && (
          <div className="w-72 shrink-0 border-l border-dove/20 bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-xs font-bold text-ink uppercase tracking-widest">Customer Context</h3>

              {/* AI Briefing Card — shown when in takeover or ticket mode */}
              {(isTakeover || activeConv.ticket_reason) && (
                <HandoffSummaryCard
                  conversation={activeConv}
                  onSummaryUpdated={(updatedSummary) => {
                    setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, handoff_summary: updatedSummary } : c));
                  }}
                />
              )}

              {/* Customer Tags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-ash uppercase tracking-wider">Customer Tags</label>
                  <Tag className="w-3 h-3 text-ash" />
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(activeConv.tags || []).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-bold bg-ink text-white"
                    >
                      {tag}
                      <button
                        onClick={async () => {
                          const newTags = (activeConv.tags || []).filter((t: string) => t !== tag);
                          setConversations(prev => prev.map(c => c.id === activeId ? { ...c, tags: newTags } : c));
                          await updateCustomerTags(activeId, newTags);
                        }}
                        className="p-0.5 rounded-full hover:bg-white/20"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setShowTagPicker(showTagPicker === 'customer' ? null : 'customer')}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-dove/40 text-ash hover:border-ink hover:text-ink transition-all"
                    >
                      + Add
                    </button>
                    {showTagPicker === 'customer' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTagPicker(null)} />
                        <div className="absolute left-0 mt-1 w-36 bg-white border border-dove/20 rounded-xl shadow-md py-1.5 z-20">
                          {['VIP', 'Returning', 'Complaint', 'Spam'].filter(t => !(activeConv.tags || []).includes(t)).map(tag => (
                            <button
                              key={tag}
                              onClick={async () => {
                                const newTags = [...(activeConv.tags || []), tag];
                                setConversations(prev => prev.map(c => c.id === activeId ? { ...c, tags: newTags } : c));
                                await updateCustomerTags(activeId, newTags);
                                setShowTagPicker(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-graphite hover:bg-fog font-medium"
                            >
                              {tag}
                            </button>
                          ))}
                          {['VIP', 'Returning', 'Complaint', 'Spam'].every(t => (activeConv.tags || []).includes(t)) && (
                            <p className="px-3 py-2 text-xs text-ash italic">All tags applied</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversation Tags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-ash uppercase tracking-wider">Conversation Tags</label>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(activeConv.conv_tags || []).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700"
                    >
                      {tag}
                      <button
                        onClick={async () => {
                          const newTags = (activeConv.conv_tags || []).filter((t: string) => t !== tag);
                          setConversations(prev => prev.map(c => c.id === activeId ? { ...c, conv_tags: newTags } : c));
                          await updateConversationTags(activeId, newTags);
                        }}
                        className="p-0.5 rounded-full hover:bg-blue-200"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setShowTagPicker(showTagPicker === 'conv' ? null : 'conv')}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-dove/40 text-ash hover:border-blue-400 hover:text-blue-600 transition-all"
                    >
                      + Add
                    </button>
                    {showTagPicker === 'conv' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTagPicker(null)} />
                        <div className="absolute left-0 mt-1 w-44 bg-white border border-dove/20 rounded-xl shadow-md py-1.5 z-20">
                          {['Needs restock info', 'Escalated', 'Pending Payment', 'Order Issue', 'Callback'].filter(t => !(activeConv.conv_tags || []).includes(t)).map(tag => (
                            <button
                              key={tag}
                              onClick={async () => {
                                const newTags = [...(activeConv.conv_tags || []), tag];
                                setConversations(prev => prev.map(c => c.id === activeId ? { ...c, conv_tags: newTags } : c));
                                await updateConversationTags(activeId, newTags);
                                setShowTagPicker(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-graphite hover:bg-fog font-medium"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1.5">Order History</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-fog p-2.5 rounded-lg">
                    <p className="text-[10px] text-ash font-medium mb-0.5">Orders</p>
                    <p className="text-sm font-bold text-ink">{orderHistory.orders.length}</p>
                  </div>
                  <div className="bg-fog p-2.5 rounded-lg">
                    <p className="text-[10px] text-ash font-medium mb-0.5">Total Spend</p>
                    <p className="text-sm font-bold text-ink">৳{orderHistory.totalSpend.toLocaleString()}</p>
                  </div>
                </div>
                {orderHistory.orders.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-fog rounded-lg text-xs">
                    <span className="font-medium text-graphite">#{orderHistory.orders[0].id.substring(0, 8)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      orderHistory.orders[0].status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {orderHistory.orders[0].status}
                    </span>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div>
                <label className="text-[10px] font-bold text-ash uppercase tracking-wider block mb-1.5">Internal Notes</label>
                <textarea
                  className="w-full bg-fog border-0 rounded-xl p-3 text-xs text-ink focus:ring-1 focus:ring-dove/30 min-h-[80px] resize-none"
                  placeholder="Private notes for the team..."
                  value={activeConv.internal_notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, internal_notes: val } : c));
                  }}
                  onBlur={async (e) => {
                    await updateInternalNotes(activeId, e.target.value);
                  }}
                />
                <p className="text-[9px] text-ash mt-1 italic">Never shared with the customer.</p>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 p-3 border-t border-dove/10 bg-white">
              <button
                onClick={async () => {
                  setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status: 'bot_active', ticket_reason: null, assigned_to_id: null } : c));
                  await resolveConversation(activeId);
                }}
                className="w-full py-2 bg-fog hover:bg-dove/20 border border-dove/20 text-graphite hover:text-ink rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Resolved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
