'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bot, User, Search, AlertTriangle, ShieldCheck, UserCog, AlertCircle, Phone, Clock, ArrowLeft, MoreVertical, Ban, Tag, ArrowDown, ArrowUp, ShieldAlert, Send, MessageSquareText, Reply, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, Lock, Smartphone, Sparkles } from 'lucide-react';
import { getMessages, sendMessage, toggleTakeover, getConversations, resolveFacebookProfile, flagCustomerAsFraud } from './actions';
import MessengerInput from '@/components/dashboard/MessengerInput';
import { parseMessageSegments, extractReplyContext } from '@/lib/message-parser';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { saveBusinessType, saveOnboardingProfileAndTone, completeOnboarding } from '../actions';

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

export default function InboxClient({ 
  shop: initialShop, 
  initialConversations,
  productCount
}: { 
  shop: any; 
  initialConversations: any[];
  productCount: number;
}) {
  const [shop, setShop] = useState(initialShop);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTakeover, setIsTakeover] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { customer_name: string; profile_pic_url?: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filter, setFilter] = useState<'all' | 'tickets' | 'confirmed'>('all');
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; mid?: string } | null>(null);

  // Pagination and Virtualization State
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  // Launch Control Checklist Widget States
  const [showLaunchControl, setShowLaunchControl] = useState(!shop.onboarding_complete);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [shopName, setShopName] = useState(shop.name || '');
  const [aiInstructions, setAiInstructions] = useState(shop.ai_instructions || '');
  const [toneTemplate, setToneTemplate] = useState<'casual' | 'formal' | 'technical' | 'wholesale'>('casual');
  const [isSavingTone, setIsSavingTone] = useState(false);
  const [bkashNumber, setBkashNumber] = useState(shop.bkash_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'none' | 'notification_app' | 'merchant_api'>(shop.payment_verification_method || 'none');
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

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
      if (conv.channel === 'messenger' && /^\d+$/.test(conv.customer_phone) && !profiles[conv.customer_phone]) {
        const profile = await resolveFacebookProfile(conv.customer_phone, shop.id);
        setProfiles(prev => ({
          ...prev,
          [conv.customer_phone]: profile
        }));
      }
    });
  }, [conversations]);

  const lastMsgCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const messageCacheRef = useRef<Record<string, { msgs: any[], hasMore: boolean }>>({});

  // 1. Initial Load of Messages on Conversation switch
  useEffect(() => {
    if (!activeId) return;

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
  }, [shop.id]);

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

  // Virtualization constants (estimated average heights)
  const containerHeight = 600;
  const estimatedHeight = 85;
  const visibleCount = Math.ceil(containerHeight / estimatedHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedHeight) - 8);
  const endIndex = Math.min(messages.length, startIndex + visibleCount + 16);

  const paddingTop = startIndex * estimatedHeight;
  const paddingBottom = Math.max(0, (messages.length - endIndex) * estimatedHeight);

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

  // Setup verification constants
  const stepsDone = shop.onboarding_steps_done || [];
  const isCatalogDone = productCount > 0;
  const isMetaDone = shop.meta_page_access_token !== null;
  const isProfileToneDone = stepsDone.includes('profile_tone');
  const isPaymentsDone = shop.bkash_number !== null && shop.payment_verification_method !== 'none';
  const isCourierDone = shop.courier_provider !== null;

  const checklistItems = [
    { id: 1, name: 'Business Classification', isDone: true, type: 'classification' },
    { id: 2, name: 'Catalog Setup (Add at least 1 product)', isDone: isCatalogDone, type: 'catalog', link: '/dashboard/inventory', desc: 'Add product models, variants, and base stock so DullBot can lookup inventory and suggest products in chat.' },
    { id: 3, name: 'Connect Facebook Page', isDone: isMetaDone, type: 'meta', link: '/dashboard/settings', desc: 'Hook up page access token so DullBot can receive messages and reply to customer inquiries.' },
    { id: 4, name: 'Brand Profile & Tone', isDone: isProfileToneDone, type: 'profile_tone', desc: 'Set up your business name, context instructions, and select a predefined Bangla agent persona matching your brand tone.' },
    { id: 5, name: 'Payments & Android Companion app', isDone: isPaymentsDone, type: 'payments', desc: 'Enter your bKash/Nagad numbers, choose verification mode, and download the notification app to auto-verify payments.' },
    { id: 6, name: 'Courier Integration', isDone: isCourierDone, type: 'courier', link: '/dashboard/settings', desc: 'Link Steadfast, Pathao, or other courier systems for automated shipment creation on payment verification.' },
  ];

  const completedStepsCount = checklistItems.filter(item => item.isDone).length;
  const progressPercent = Math.round((completedStepsCount / checklistItems.length) * 100);
  const isChecklistComplete = completedStepsCount === checklistItems.length;

  const handleSaveTone = async () => {
    setIsSavingTone(true);
    const res = await saveOnboardingProfileAndTone(shop.id, {
      name: shopName,
      aiInstructions: aiInstructions,
      toneTemplate: toneTemplate
    });
    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        name: shopName,
        ai_instructions: aiInstructions,
        onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'profile_tone']
      }));
      setActiveStep(null);
    } else {
      alert(res.error);
    }
    setIsSavingTone(false);
  };

  const handleSavePayments = async () => {
    setIsSavingPayments(true);
    const { saveSettings } = await import('../settings/actions');
    const res = await saveSettings(shop.id, {
      confirmationTier: 'light',
      bkashNumber: bkashNumber,
      agentEnabled: shop.agent_enabled,
      paymentVerificationMethod: paymentMethod,
      bkashConfig: {},
      nagadConfig: {},
      courierProvider: shop.courier_provider || '',
      courierConfig: {}
    });

    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        bkash_number: bkashNumber,
        payment_verification_method: paymentMethod,
        onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'payments']
      }));
      setActiveStep(null);
    } else {
      alert(res.error);
    }
    setIsSavingPayments(false);
  };

  const handleGoLive = async () => {
    setIsLaunching(true);
    const res = await completeOnboarding(shop.id);
    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        onboarding_complete: true,
        agent_enabled: true
      }));
      setShowLaunchControl(false);
    } else {
      alert(res.error);
    }
    setIsLaunching(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] gap-4">
      {/* Launch Control Panel */}
      {showLaunchControl && !shop.onboarding_complete && (
        <div className="bg-fog border border-dove/25 rounded-cards shadow-subtle p-6 relative shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-apricot-wash text-rust mb-1.5">
                <Sparkles className="w-3 h-3 animate-pulse" /> Launch Control
              </span>
              <h2 className="text-lg font-serif text-ink tracking-tight font-medium">Autopilot Ignition Checklist</h2>
              <p className="text-xs text-ash">Complete these steps to unlock AI Autopilot and metrics.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-semibold text-ash uppercase tracking-wider">Ignition Progress</span>
                <p className="text-lg font-serif text-ink font-semibold">{progressPercent}%</p>
              </div>
              <div className="w-24 bg-white h-2 rounded-full overflow-hidden border border-dove/10">
                <div 
                  className="bg-rust h-full transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <button 
                onClick={() => setShowLaunchControl(false)} 
                className="text-xs text-ash hover:text-ink font-medium px-2 py-1 rounded hover:bg-black/5"
              >
                Hide
              </button>
            </div>
          </div>

          {/* Interactive Steps Horizontal Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklistItems.map((item, idx) => {
              const isExpanded = activeStep === item.id;
              const hasForm = item.id === 4 || item.id === 5;
              const isSpotlight = completedStepsCount === idx;

              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-xl border p-3.5 transition-all duration-300 ${
                    item.isDone 
                      ? 'border-green-200 bg-green-50/20' 
                      : isSpotlight 
                        ? 'border-rust ring-1 ring-rust/35 shadow-sm' 
                        : 'border-dove/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      {item.isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${isSpotlight ? 'text-rust' : 'text-dove'}`} />
                      )}
                      <div>
                        <h3 className={`text-xs font-semibold ${item.isDone ? 'text-ink line-through opacity-70' : 'text-ink'}`}>
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-ash mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {!item.isDone && (
                      <div className="shrink-0">
                        {hasForm ? (
                          <button 
                            onClick={() => setActiveStep(isExpanded ? null : item.id)}
                            className="p-1 rounded hover:bg-fog text-ash"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : item.link ? (
                          <Link href={item.link} className="p-1 text-rust hover:text-ink hover:bg-apricot-wash rounded block">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Expanded Step Form: Brand Profile & Tone */}
                  {isExpanded && item.id === 4 && (
                    <div className="mt-3 pt-3 border-t border-dove/10 flex flex-col gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-ink uppercase tracking-wider mb-1">Business Name</label>
                        <input 
                          type="text" 
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full text-xs border border-dove/25 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-ink font-medium"
                          placeholder="e.g. Dull Store"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-semibold text-ink uppercase tracking-wider mb-1">Tone Template</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'casual', label: 'Casual', desc: 'Bangla bhai style' },
                            { id: 'formal', label: 'Formal', desc: 'Traditional Rumi Apa' },
                            { id: 'technical', label: 'Technical', desc: 'Imran explainer' },
                            { id: 'wholesale', label: 'Wholesale', desc: 'Uncle direct negotiation' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setToneTemplate(t.id as any)}
                              className={`p-2 rounded-md border text-left flex flex-col justify-between h-14 transition-all ${
                                toneTemplate === t.id 
                                  ? 'border-rust bg-apricot-wash/30' 
                                  : 'border-dove/20 hover:border-ink'
                              }`}
                            >
                              <span className="text-[10px] font-semibold text-ink leading-none">{t.label}</span>
                              <span className="text-[8px] text-ash truncate leading-none mt-1">{t.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-semibold text-ink uppercase tracking-wider mb-1">AI instructions</label>
                        <textarea 
                          rows={3}
                          value={aiInstructions}
                          onChange={(e) => setAiInstructions(e.target.value)}
                          className="w-full text-xs border border-dove/25 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-ink"
                          placeholder="Add instructions..."
                        />
                      </div>

                      <button
                        onClick={handleSaveTone}
                        disabled={isSavingTone}
                        className="w-full py-1.5 bg-ink text-pure-white text-[10px] font-medium rounded-md hover:bg-black flex items-center justify-center gap-1"
                      >
                        {isSavingTone && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Brand Settings
                      </button>
                    </div>
                  )}

                  {/* Expanded Step Form: Payments & Android */}
                  {isExpanded && item.id === 5 && (
                    <div className="mt-3 pt-3 border-t border-dove/10 flex flex-col gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-ink uppercase tracking-wider mb-1">bKash Personal Number</label>
                        <input 
                          type="text" 
                          value={bkashNumber}
                          onChange={(e) => setBkashNumber(e.target.value)}
                          className="w-full text-xs border border-dove/25 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-ink font-medium"
                          placeholder="e.g. 01712345678"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-semibold text-ink uppercase tracking-wider mb-1">Verification Mode</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'notification_app', label: 'Android Sync App', desc: 'Sync SMS cash-in' },
                            { id: 'none', label: 'Manual Approval', desc: 'Confirm bank manually' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id as any)}
                              className={`p-2 rounded-md border text-left flex flex-col justify-between h-14 transition-all ${
                                paymentMethod === m.id 
                                  ? 'border-rust bg-apricot-wash/30' 
                                  : 'border-dove/20 hover:border-ink'
                              }`}
                            >
                              <span className="text-[10px] font-semibold text-ink leading-none">{m.label}</span>
                              <span className="text-[8px] text-ash truncate leading-none mt-1">{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {paymentMethod === 'notification_app' && (
                        <div className="p-3 bg-fog rounded-lg border border-dove/10 flex flex-col items-center gap-2">
                          <div className="text-center">
                            <p className="text-[10px] font-semibold text-ink flex items-center gap-1 justify-center">
                              <Smartphone className="w-3.5 h-3.5 text-rust" /> Android Companion App
                            </p>
                            <p className="text-[8px] text-ash mt-0.5">Scan to download APK on your phone.</p>
                          </div>
                          
                          <svg className="w-16 h-16 border border-dove/25 p-1 rounded bg-white shadow-sm" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" />
                            <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" />
                            <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" />
                            <rect x="45" y="5" width="10" height="10" />
                            <rect x="55" y="15" width="5" height="10" />
                            <rect x="45" y="30" width="15" height="5" />
                            <rect x="5" y="45" width="10" height="10" />
                            <rect x="20" y="55" width="15" height="5" />
                            <rect x="40" y="45" width="20" height="20" />
                            <rect x="65" y="45" width="10" height="10" />
                            <rect x="80" y="55" width="15" height="5" />
                            <rect x="45" y="75" width="10" height="15" />
                            <rect x="65" y="75" width="20" height="10" />
                            <rect x="65" y="90" width="30" height="5" />
                          </svg>

                          <a 
                            href="/android-companion-app.apk" 
                            download 
                            className="text-[9px] text-rust hover:text-ink font-semibold underline"
                          >
                            Download APK directly
                          </a>
                        </div>
                      )}

                      <button
                        onClick={handleSavePayments}
                        disabled={isSavingPayments}
                        className="w-full py-1.5 bg-ink text-pure-white text-[10px] font-medium rounded-md hover:bg-black flex items-center justify-center gap-1"
                      >
                        {isSavingPayments && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Payments
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Go Live ignition button */}
          <div className="mt-4 pt-3 border-t border-dove/15 flex justify-end">
            <button
              onClick={handleGoLive}
              disabled={!isChecklistComplete || isLaunching}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isChecklistComplete 
                  ? 'bg-ink text-pure-white hover:bg-black shadow-sm hover:scale-[1.01]' 
                  : 'bg-fog text-dove border border-dove/10 cursor-not-allowed'
              }`}
            >
              {isLaunching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!isChecklistComplete && <Lock className="w-3.5 h-3.5" />}
              Ignition: Go Live & Activate Autopilot
            </button>
          </div>
        </div>
      )}

      {/* Main Inbox Workspace Container */}
      <div className="flex-1 min-h-0 bg-white rounded-cards shadow-subtle border border-dove/20 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-dove/20 flex flex-col bg-fog">
          <div className="p-4 border-b border-dove/10 bg-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-serif text-ink font-medium">Inbox</h2>
              {!shop.onboarding_complete && !showLaunchControl && (
                <button 
                  onClick={() => setShowLaunchControl(true)} 
                  className="px-2.5 py-1 bg-apricot-wash text-rust text-[10px] font-bold rounded-full flex items-center gap-1 hover:scale-105 transition-transform shrink-0"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" /> Launch Control ({progressPercent}%)
                </button>
              )}
            </div>
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-9 pr-4 py-2 bg-fog rounded-inputs text-sm text-ink border-transparent focus:border-dove focus:ring-0 transition-colors"
            />
          </div>
          {/* Filter Toggles */}
          <div className="flex gap-1.5 mt-3">
            {(['all', 'tickets', 'confirmed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                  filter === f
                    ? 'bg-ink text-white border-ink shadow-sm'
                    : 'bg-white text-ash border-dove/20 hover:bg-dove/10 hover:text-ink'
                }`}
              >
                {f === 'all' ? 'All' : f === 'tickets' ? 'Tickets' : 'Orders'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const filteredConversations = conversations.filter(conv => {
              if (filter === 'tickets') {
                return conv.ticket_reason === 'complaint' || conv.ticket_reason === 'unsure';
              }
              if (filter === 'confirmed') {
                return conv.orders?.some((o: any) => o.status === 'confirmed');
              }
              return true;
            });

            if (filteredConversations.length === 0) {
              return <div className="p-8 text-center text-ash text-sm">No conversations found.</div>;
            }

            return filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full text-left p-4 border-b border-dove/5 transition-colors flex items-center gap-3 ${
                  activeId === conv.id ? 'bg-white shadow-sm border-l-4 border-l-ink' : 'hover:bg-dove/10 border-l-4 border-l-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-dove/20 flex flex-shrink-0 items-center justify-center text-ink font-medium overflow-hidden">
                  {profiles[conv.customer_phone]?.profile_pic_url ? (
                    <img src={profiles[conv.customer_phone].profile_pic_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profiles[conv.customer_phone]?.customer_name || conv.customer_phone).substring(0, 2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium text-ink truncate">{profiles[conv.customer_phone]?.customer_name || conv.customer_phone}</p>
                    <p className="text-xs text-ash">{formatMessageDate(conv.last_message_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {conv.status === 'human_takeover' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-apricot-wash text-rust">
                        <UserCog className="w-3 h-3" /> Human
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-wash text-blue-600">
                        <Bot className="w-3 h-3" /> Bot
                      </span>
                    )}
                    {conv.ticket_reason === 'complaint' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-2.5 h-2.5" /> Complaint
                      </span>
                    )}
                    {conv.ticket_reason === 'unsure' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                        <ShieldAlert className="w-2.5 h-2.5" /> Unsure
                      </span>
                    )}
                    {conv.orders?.some((o: any) => o.status === 'confirmed') && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                        <ShieldCheck className="w-2.5 h-2.5" /> Order
                      </span>
                    )}
                    <p className="text-xs text-ash truncate">Active on {conv.channel}</p>
                  </div>
                </div>
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Chat Window */}
      {activeId ? (
        <div className="flex-1 flex flex-col bg-pure-white relative min-h-0">
          {/* Chat Header */}
          <div className="h-16 border-b border-dove/20 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dove/20 flex items-center justify-center text-ink font-medium overflow-hidden">
                {activeConv && profiles[activeConv.customer_phone]?.profile_pic_url ? (
                  <img src={profiles[activeConv.customer_phone].profile_pic_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (activeConv ? (profiles[activeConv.customer_phone]?.customer_name || activeConv.customer_phone) : '').substring(0, 2)
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink">
                  {activeConv ? (profiles[activeConv.customer_phone]?.customer_name || activeConv.customer_phone) : ''}
                </h3>
                <p className="text-xs text-ash capitalize">via {activeConv?.channel}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleFlagFraud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-apricot-wash text-rust hover:bg-rust hover:text-white transition-colors text-xs font-medium"
                title="Flag as Fraud (Blocks AI replies)"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Block
              </button>
              <div className="w-px h-6 bg-dove/20"></div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-ash mr-2">DullBot Status:</span>
                <button 
                  onClick={handleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${!isTakeover ? 'bg-green-500' : 'bg-dove'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isTakeover ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium ${!isTakeover ? 'text-green-600' : 'text-ash'}`}>
                  {!isTakeover ? 'Active' : 'Paused'}
                </span>
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
              <div style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.slice(startIndex, endIndex).map((msg, sliceIdx) => {
                  const idx = startIndex + sliceIdx;
                  const isCustomer = msg.sender === 'customer';
                  const isHumanAgent = msg.sender === 'human_agent';
                  const isLastMsg = idx === messages.length - 1;
                  
                  const { quotedText, actualContent } = extractReplyContext(msg.content);
                  const segments = parseMessageSegments(actualContent);
                  
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
                                    // Find the original message this is replying to
                                    const target = [...messages].reverse().find(m => extractReplyContext(m.content).actualContent === quotedText);
                                    if (target) {
                                      const el = document.getElementById(`message-${target.id}`);
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.style.backgroundColor = 'rgba(0, 132, 255, 0.15)';
                                        setTimeout(() => {
                                          el.style.backgroundColor = 'transparent';
                                        }, 1000);
                                      }
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-[13px] rounded-xl flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${
                                    isCustomer 
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
                                <div className={`px-4 py-2 text-[15px] ${
                                  isCustomer 
                                    ? `bg-[#E4E6EB] text-[#050505] ${isFirst ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                                    : `bg-[#0084FF] text-white ${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                }`}>
                                  {segment.type === 'image' ? (
                                    <a href={segment.content} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-lg overflow-hidden border border-dove/10">
                                      <img src={segment.content} alt="Attachment" className="max-h-60 w-auto object-contain hover:scale-105 transition-transform duration-200" />
                                    </a>
                                  ) : segment.type === 'audio' ? (
                                    <div className="py-1">
                                      <audio src={segment.content} controls className="max-w-full" />
                                    </div>
                                  ) : (
                                    segment.content
                                  )}
                                </div>
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

          {/* Message Input */}
          <div className="shrink-0">
            <MessengerInput 
              onSend={handleSend}
              isTakeover={isTakeover}
              shopId={shop.id}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
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
    </div>
  </div>
);
}
