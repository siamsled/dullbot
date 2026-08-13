'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Bot, User, Search, AlertTriangle, ShieldCheck, UserCog, AlertCircle, Phone, Clock, ArrowLeft, MoreVertical, Ban, Tag, ArrowDown, ArrowUp, ShieldAlert, Send, MessageSquareText, Reply, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, Lock, Smartphone, Sparkles, X, RefreshCw, BrainCircuit, Package, ExternalLink, Maximize2 } from 'lucide-react';
import { getMessages, sendMessage, toggleTakeover, getConversations, resolveFacebookProfile, flagCustomerAsFraud, generateHandoffSummary, markAsRead, updateInternalNotes, updateCustomerTags, updateConversationTags, assignConversation, resolveConversation, getCustomerOrderHistory, getQuickReplies } from './actions';
import MessengerInput from '@/components/dashboard/MessengerInput';
import { parseMessageSegments, extractReplyContext } from '@/lib/message-parser';
import { supabaseBrowser } from '@/lib/supabase-browser';
import UiverseTabs from '@/components/ui/UiverseTabs';
import { ConversationListSkeleton, MessageThreadSkeleton } from '@/components/ui/SkeletonLoaders';

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

function getDisplayName(conv: any, profile?: any): string {
  if (!conv) return 'Customer';

  if (profile?.customer_name && profile.customer_name !== 'Facebook User') {
    return profile.customer_name;
  }
  if (conv.meta_name && conv.meta_name !== 'Facebook User') {
    return conv.meta_name;
  }
  if (conv.customer_name && conv.customer_name !== 'Facebook User') {
    return conv.customer_name;
  }

  // Check linked orders for customer name
  if (conv.orders && Array.isArray(conv.orders) && conv.orders.length > 0) {
    const orderWithName = conv.orders.find((o: any) => o.customer_name && o.customer_name !== 'Facebook User');
    if (orderWithName?.customer_name) return orderWithName.customer_name;
  }

  // Check AI Handoff summary for key facts name
  if (conv.handoff_summary?.key_facts || conv.handoff_summary?.facts) {
    const factsText = conv.handoff_summary.key_facts || conv.handoff_summary.facts || '';
    const match = factsText.match(/Name:\s*([^\n,]+)/i);
    if (match && match[1]?.trim() && match[1].trim() !== 'Facebook User') {
      return match[1].trim();
    }
  }

  const phone = conv.customer_phone || '';

  if (/^\d{14,}$/.test(phone)) {
    return 'Facebook Customer';
  }

  if (/^\+?\d{8,13}$/.test(phone)) {
    return phone;
  }

  return profile?.customer_name || conv.meta_name || conv.customer_name || phone || 'Customer';
}

function getAvatarInitials(name: string): string {
  if (!name || name === 'Facebook User' || name === 'Facebook Customer') return 'FB';
  if (name === 'Customer') return 'CU';
  if (name.startsWith('+') || /^\d+$/.test(name)) return 'PH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getProfilePicUrl(conv: any, profile?: any): string | null {
  if (profile?.profile_pic_url) return profile.profile_pic_url;
  if (conv?.meta_profile_pic) return conv.meta_profile_pic;
  return null;
}

function formatSnippetPreview(snippet: string): string {
  if (!snippet) return 'No messages';
  if (snippet.startsWith('IMAGE:')) return '📷 Photo';
  if (snippet.startsWith('AUDIO:')) return '🎵 Voice message';

  let cleaned = snippet.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt) => {
    return alt && alt.toLowerCase() !== 'image' ? `📷 ${alt}` : '📷 Photo';
  });

  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  if (cleaned.startsWith('[SYSTEM ERROR]')) {
    cleaned = cleaned.replace('[SYSTEM ERROR]', '⚠️ Error:');
  }

  return cleaned.trim() || '📷 Photo';
}

function getConvChannel(conv: any): 'messenger' | 'instagram' | 'whatsapp' | 'web' {
  if (!conv) return 'messenger';
  if (conv.channel === 'whatsapp' || conv.whatsapp_session_expires_at) return 'whatsapp';
  if (conv.channel === 'instagram') return 'instagram';
  if (conv.is_test) return 'web';
  return 'messenger';
}

function ChannelIcon({ channel, className = "w-3.5 h-3.5" }: { channel?: string; className?: string }) {
  if (channel === 'whatsapp') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
  }
  if (channel === 'instagram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.082.3 2.23.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.26 5.888-3.26-6.559 6.963z"/>
    </svg>
  );
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

function SmartVideoPlayer({ src, onOpenFullscreen }: { src: string; onOpenFullscreen?: (src: string) => void }) {
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  if (isAudioOnly) {
    return (
      <div className="px-3 py-2 bg-[#E4E6EB] rounded-2xl max-w-xs">
        <audio src={src} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-xs rounded-2xl overflow-hidden bg-black relative group">
      <video
        src={src}
        controls
        preload="metadata"
        className="max-h-64 w-full object-contain"
        onLoadedMetadata={(e) => {
          const v = e.target as HTMLVideoElement;
          if (v.videoHeight === 0) setIsAudioOnly(true);
        }}
        onError={() => setIsAudioOnly(true)}
      />
      {onOpenFullscreen && (
        <button
          type="button"
          onClick={() => onOpenFullscreen(src)}
          title="Fullscreen overlay"
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 z-10"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function HandoffSummaryCard({
  conversation,
  orderHistory,
  onSummaryUpdated
}: {
  conversation: any;
  orderHistory: { orders: any[]; totalSpend: number };
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

  // Extract customer details from most recent order or conversation
  const latestOrder = orderHistory.orders[0];
  const rawPhone = latestOrder?.customer_phone || conversation.customer_phone || null;
  // Filter out 15+ digit raw Meta PSID strings so they aren't displayed as phone numbers
  const phone = (rawPhone && !/^\d{14,}$/.test(rawPhone)) ? rawPhone : null;
  const address = latestOrder?.customer_address || null;

  // Collect all unique product thumbnails across line items
  const productItems: { name: string; imageUrl: string | null }[] = [];
  for (const order of orderHistory.orders) {
    for (const item of (order.order_items || [])) {
      const imageUrl = item.products?.image_url || null;
      if (!productItems.find(p => p.name === item.product_name)) {
        productItems.push({ name: item.product_name, imageUrl });
      }
    }
  }

  return (
    <div className="rounded-2xl border border-dove/15 bg-white shadow-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-fog/80 border-b border-dove/10">
        <div className="flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold text-graphite uppercase tracking-wider">AI Briefing</span>
        </div>
        <div className="flex items-center gap-1.5">
          {summary && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${sentimentCls}`}>
              {sentimentLabel}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            title="Regenerate briefing"
            className="p-1 rounded-lg hover:bg-dove/20 text-ash hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-3">
        {/* Customer contact row */}
        {(phone || address) && (
          <div className="bg-fog/50 rounded-xl px-3 py-2 space-y-1.5 border border-dove/10">
            {phone && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-ash uppercase tracking-wider w-12 shrink-0">Phone</span>
                <span className="text-xs text-ink font-mono font-medium">{phone}</span>
              </div>
            )}
            {address && (
              <div className="flex items-start gap-2">
                <span className="text-[9px] font-bold text-ash uppercase tracking-wider w-12 shrink-0 mt-0.5">Address</span>
                <span className="text-xs text-ink leading-relaxed font-medium">{address}</span>
              </div>
            )}
          </div>
        )}

        {/* Product thumbnails */}
        {productItems.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-ash uppercase tracking-wider mb-1.5">Products ordered</p>
            <div className="flex flex-col gap-1.5">
              {productItems.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-fog/50 rounded-xl p-2 border border-dove/10">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded-lg shrink-0 border border-dove/10" />
                  ) : (
                    <div className="w-8 h-8 bg-dove/20 rounded-lg shrink-0 flex items-center justify-center">
                      <Package className="w-4 h-4 text-ash" />
                    </div>
                  )}
                  <span className="text-xs text-ink font-medium leading-tight line-clamp-2">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary sections */}
        {isLoading && !summary ? (
          <p className="text-xs text-ash italic">Generating briefing...</p>
        ) : summary ? (
          <>
            {summary.wants && (
              <div>
                <p className="text-[9px] font-bold text-ash uppercase tracking-wider mb-1">Customer wants</p>
                <p className="text-xs text-ink leading-relaxed font-medium bg-fog/30 p-2 rounded-xl border border-dove/10">
                  {summary.wants?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || '—'}
                </p>
              </div>
            )}
            {summary.facts && (
              <div>
                <p className="text-[9px] font-bold text-ash uppercase tracking-wider mb-1">Key facts</p>
                <p className="text-xs text-ink leading-relaxed font-medium bg-fog/30 p-2 rounded-xl border border-dove/10">
                  {summary.facts?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || '—'}
                </p>
              </div>
            )}
            {(summary.flagReason || conversation.ticket_reason) && (
              <div>
                <p className="text-[9px] font-bold text-rust dark:text-amber-300 uppercase tracking-wider mb-1">Escalation reason</p>
                <div className="bg-red-50/80 dark:bg-amber-950/40 rounded-xl p-2.5 border border-red-200/80 dark:border-amber-500/30">
                  <p className="text-xs text-rust dark:text-amber-200 font-semibold leading-relaxed">
                    {summary.flagReason?.replace(/^[•\s\-\*]+/gm, '').split('\n').filter(Boolean)[0] || conversation.ticket_reason || 'Manual takeover required'}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-ash">No briefing available.</p>
        )}
      </div>
    </div>
  );
}

export default function InboxClient({
  shop: initialShop,
  initialConversations,
  initialMessages = [],
  productCount,
  initialPhone
}: {
  shop: any;
  initialConversations: any[];
  initialMessages?: any[];
  productCount: number;
  initialPhone?: string | null;
}) {
  const queryClient = useQueryClient();
  const [shop, setShop] = useState(initialShop);

  const { data: fetchedConversations = initialConversations } = useQuery({
    queryKey: ['conversations', shop.id],
    queryFn: () => getConversations(shop.id),
    initialData: initialConversations,
    staleTime: 1000 * 60 * 5,
  });

  const [conversations, setConversations] = useState<any[]>(fetchedConversations || []);

  useEffect(() => {
    if (fetchedConversations) {
      setConversations(fetchedConversations);
    }
  }, [fetchedConversations]);

  // If initialPhone is provided (deep-link from Orders), find the matching conversation
  const initialId = initialPhone
    ? (conversations.find(c => c.customer_phone === initialPhone)?.id ?? conversations[0]?.id ?? null)
    : (conversations[0]?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(initialId);

  const { data: fetchedMessages = [], isFetching: loadingMessages } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => getMessages(activeId!, undefined, 30),
    initialData: activeId === initialId ? initialMessages : undefined,
    enabled: !!activeId,
    staleTime: 1000 * 60 * 5,
  });

  const [messages, setMessages] = useState<any[]>(fetchedMessages || []);

  useEffect(() => {
    setMessages([]);
  }, [activeId]);

  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      setMessages(fetchedMessages);
    } else if (!loadingMessages && fetchedMessages.length === 0) {
      setMessages([]);
    }
  }, [fetchedMessages, loadingMessages]);

  const [isTakeover, setIsTakeover] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { customer_name: string; profile_pic_url?: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewMedia(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filter, setFilter] = useState<'all' | 'tickets' | 'confirmed' | 'test'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'messenger' | 'instagram' | 'whatsapp'>('all');
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
    const doScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 50);
    setTimeout(doScroll, 150);
    setTimeout(doScroll, 350);
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
    isFirstLoadRef.current = true;
  }, [activeId]);

  useEffect(() => {
    conversations.forEach(async (conv) => {
      const ch = getConvChannel(conv);
      const isMeta = ch === 'messenger' || ch === 'instagram';
      const needsProfile = isMeta && (!conv.meta_profile_pic || !conv.meta_name || conv.meta_name === 'Facebook User');

      if (needsProfile && conv.customer_phone && !profiles[conv.customer_phone]) {
        const profile = await resolveFacebookProfile(conv.customer_phone, shop.id);
        if (profile) {
          setProfiles(prev => ({
            ...prev,
            [conv.customer_phone]: profile
          }));
        }
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
        scrollToBottom();
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

          scrollToBottom();
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
          <div className="p-3.5 border-b border-dove/10 bg-white space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-fog rounded-xl text-xs text-ink border border-dove/10 focus:border-dove focus:bg-white focus:ring-0 transition-all placeholder:text-ash/70"
              />
            </div>

            {/* Channel Filters */}
            <div className="flex items-center gap-1 p-1 bg-fog rounded-xl border border-dove/10">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'all' ? 'bg-white text-ink shadow-xs border border-dove/10' : 'text-ash hover:text-ink'
                }`}
              >
                All ({conversations.filter(c => !c.is_test).length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('messenger')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'messenger' ? 'bg-[#0084FF] text-white shadow-xs' : 'text-ash hover:text-[#0084FF]'
                }`}
              >
                <ChannelIcon channel="messenger" className="w-3 h-3 shrink-0" />
                FB ({conversations.filter(c => !c.is_test && getConvChannel(c) === 'messenger').length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('instagram')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xs' : 'text-ash hover:text-pink-600'
                }`}
              >
                <ChannelIcon channel="instagram" className="w-3 h-3 shrink-0" />
                IG ({conversations.filter(c => !c.is_test && getConvChannel(c) === 'instagram').length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('whatsapp')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'whatsapp' ? 'bg-[#25D366] text-white shadow-xs' : 'text-ash hover:text-[#25D366]'
                }`}
              >
                <ChannelIcon channel="whatsapp" className="w-3 h-3 shrink-0" />
                WA ({conversations.filter(c => !c.is_test && getConvChannel(c) === 'whatsapp').length})
              </button>
            </div>

            {/* Category / Status Filters */}
            <div className="flex items-center gap-1 p-1 bg-fog rounded-xl border border-dove/10">
              {[
                { id: 'all', label: 'All Status' },
                { id: 'tickets', label: 'Tickets' },
                { id: 'confirmed', label: 'Orders' },
                ...(process.env.NODE_ENV === 'development' ? [{ id: 'test', label: 'Test' }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilter(tab.id as any);
                    const nextFiltered = conversations.filter(conv => {
                      if (tab.id === 'test') return !!conv.is_test;
                      if (conv.is_test) return false;
                      if (tab.id === 'tickets') {
                        return conv.ticket_reason === 'complaint' || conv.ticket_reason === 'unsure' || conv.status === 'human_takeover';
                      }
                      if (tab.id === 'confirmed') {
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
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center ${
                    filter === tab.id ? 'bg-white text-ink shadow-xs border border-dove/10' : 'text-ash hover:text-ink'
                  }`}
                >
                  {tab.label}
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

                // 2. Channel Filter
                if (channelFilter !== 'all') {
                  const ch = getConvChannel(conv);
                  if (ch !== channelFilter) return false;
                }

                // 3. Tab filter
                if (filter === 'tickets') {
                  const isTicket = conv.ticket_reason === 'complaint' || conv.ticket_reason === 'unsure' || conv.status === 'human_takeover';
                  if (!isTicket) return false;
                }
                if (filter === 'confirmed') {
                  const hasConfirmedOrder = conv.orders?.some((o: any) => o.status === 'confirmed');
                  if (!hasConfirmedOrder) return false;
                }

                // 4. Search query
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  const displayName = getDisplayName(conv, profiles[conv.customer_phone]);
                  const nameMatch = displayName.toLowerCase().includes(query) || (conv.customer_phone || '').toLowerCase().includes(query);
                  const previewText = formatSnippetPreview(conv.last_message_content || '');
                  const snippetMatch = previewText.toLowerCase().includes(query);

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
                const chType = getConvChannel(conv);
                const displayName = getDisplayName(conv, profiles[conv.customer_phone]);
                const avatarInitials = getAvatarInitials(displayName);
                const previewText = formatSnippetPreview(conv.last_message_content || '');

                const profilePicUrl = getProfilePicUrl(conv, profiles[conv.customer_phone]);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full text-left p-4 border-b border-dove/5 transition-colors flex items-center gap-3 relative ${activeId === conv.id ? 'bg-white shadow-sm border-l-4 border-l-ink' : 'hover:bg-dove/10 border-l-4 border-l-transparent'
                      }`}
                  >
                    {/* Avatar with Channel Overlay Badge */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-dove/20 flex items-center justify-center text-ink font-medium overflow-hidden">
                        {chType === 'whatsapp' || !profilePicUrl ? (
                          avatarInitials
                        ) : (
                          <img
                            src={profilePicUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] shadow-xs border border-white ${
                        chType === 'whatsapp' ? 'bg-[#25D366]' : chType === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-[#0084FF]'
                      }`}>
                        <ChannelIcon channel={chType} className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasUnread && <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                          <p className={`text-sm truncate ${hasUnread ? 'text-ink font-bold' : 'text-graphite font-semibold'}`}>
                            {displayName}
                          </p>
                        </div>
                        <p className="text-[10px] text-ash shrink-0">{formatMessageDate(conv.last_message_at)}</p>
                      </div>

                      {/* Snippet Preview */}
                      <p className={`text-xs truncate mb-2 max-w-[90%] ${hasUnread ? 'text-ink font-semibold' : 'text-ash'}`}>
                        {previewText}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Distinct Channel Pill */}
                        {chType === 'whatsapp' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
                            <ChannelIcon channel="whatsapp" className="w-2.5 h-2.5" /> WhatsApp
                          </span>
                        )}
                        {chType === 'instagram' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                            <ChannelIcon channel="instagram" className="w-2.5 h-2.5" /> Instagram
                          </span>
                        )}
                        {chType === 'messenger' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0084FF]/10 text-[#0084FF] border border-[#0084FF]/20">
                            <ChannelIcon channel="messenger" className="w-2.5 h-2.5" /> Messenger
                          </span>
                        )}

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
                {(() => {
                  const activeDisplayName = activeConv ? getDisplayName(activeConv, profiles[activeConv.customer_phone]) : '';
                  const activeInitials = getAvatarInitials(activeDisplayName);
                  const activeProfilePicUrl = activeConv ? getProfilePicUrl(activeConv, profiles[activeConv.customer_phone]) : null;

                  return (
                    <>
                      <div className="w-8 h-8 rounded-full bg-dove/20 flex items-center justify-center text-ink text-xs font-semibold overflow-hidden shrink-0">
                        {activeConv && activeConv.channel !== 'whatsapp' && activeProfilePicUrl ? (
                          <img
                            src={activeProfilePicUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          activeInitials
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-ink truncate max-w-[140px]">
                            {activeDisplayName}
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
                    </>
                  );
                })()}
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
              <div className="bg-apricot-wash dark:bg-amber-950/40 px-4 py-2 flex items-center gap-2 border-b border-rust/10 dark:border-amber-500/30 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rust dark:text-amber-300" />
                <p className="text-xs font-medium text-rust dark:text-amber-200">
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
              {loadingMessages && messages.length === 0 ? (
                <MessageThreadSkeleton />
              ) : messages.length === 0 ? (
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

                    const activeDisplayName = activeConv ? getDisplayName(activeConv, profiles[activeConv.customer_phone]) : 'Customer';

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
                              {isCustomer ? activeDisplayName : isHumanAgent ? 'You (Human)' : 'DullBot AI'}
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
                                    <button
                                      type="button"
                                      onClick={() => setPreviewMedia({ url: segment.content, type: 'image' })}
                                      className="block max-w-xs rounded-2xl overflow-hidden text-left focus:outline-none group relative cursor-pointer"
                                    >
                                      <img
                                        src={segment.content}
                                        alt="Attachment"
                                        className="max-h-64 w-auto object-cover group-hover:scale-[1.02] transition-transform duration-200"
                                        onLoad={scrollToBottom}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                      </div>
                                    </button>
                                  ) : segment.type === 'video' ? (
                                    <SmartVideoPlayer src={segment.content} onOpenFullscreen={(url) => setPreviewMedia({ url, type: 'video' })} />
                                  ) : segment.type === 'audio' ? (
                                    <div className={`px-4 py-2 rounded-2xl ${isCustomer ? 'bg-[#E4E6EB] dark:bg-[#21262d]' : 'bg-[#0084FF]'}`}>
                                      <audio src={segment.content} controls className="max-w-full" />
                                    </div>
                                  ) : (
                                    <div className={`px-4 py-2 text-[15px] ${isCustomer
                                      ? `bg-[#E4E6EB] dark:bg-[#21262d] text-[#050505] dark:text-[#f0f6fc] border border-transparent dark:border-white/10 ${isFirst ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
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
                  orderHistory={orderHistory}
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

      {/* Fullscreen Blurred Media Lightbox Overlay */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <a
                href={previewMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                title="Open original link"
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all border border-white/20 shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setPreviewMedia(null)}
                title="Close (Esc)"
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all border border-white/20 shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewMedia.type === 'image' ? (
              <img
                src={previewMedia.url}
                alt="Enlarged Preview"
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
