'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User, Search, Send, AlertTriangle, ShieldCheck, UserCog, MessageSquareText, ArrowDown, ArrowUp, ShieldAlert } from 'lucide-react';
import { getMessages, sendMessage, toggleTakeover, getConversations, resolveFacebookProfile, flagCustomerAsFraud } from './actions';
import { parseMessageSegments } from '@/lib/message-parser';

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

export default function InboxClient({ shop, initialConversations }: { shop: any, initialConversations: any[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTakeover, setIsTakeover] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { customer_name: string; profile_pic_url?: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filter, setFilter] = useState<'all' | 'tickets' | 'confirmed'>('all');

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setShowScrollBottom(!isAtBottom);
    setShowScrollTop(!isAtBottom && scrollHeight > clientHeight + 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeConv = conversations.find(c => c.id === activeId);

  const isTakeoverRef = useRef(isTakeover);
  useEffect(() => {
    isTakeoverRef.current = isTakeover;
  }, [isTakeover]);

  useEffect(() => {
    if (activeConv) {
      setIsTakeover(activeConv.status === 'human_takeover');
    }
  }, [activeConv]);

  // Asynchronously resolve Facebook names/pics in the background on the client
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

  const loadData = async () => {
    if (activeId) {
      const msgs = await getMessages(activeId);
      setMessages(prev => {
        // Keep any optimistic messages that aren't yet saved in the DB
        const optimisticMsgs = prev.filter(m => m.isOptimistic);
        const unsavedOptimistic = optimisticMsgs.filter(opt => 
          !msgs.some(dbMsg => dbMsg.content === opt.content && dbMsg.sender === opt.sender)
        );

        const merged = [...msgs, ...unsavedOptimistic];

        const isIdentical = prev.length === merged.length && 
          prev.every((m, i) => m.id === merged[i].id && m.content === merged[i].content && m.sender === merged[i].sender);
        return isIdentical ? prev : merged;
      });
    }
    const convs = await getConversations(shop.id);
    setConversations(prev => {
      const isIdentical = prev.length === convs.length && 
        prev.every((c, i) => 
          c.id === convs[i].id && 
          c.last_message_at === convs[i].last_message_at && 
          c.status === convs[i].status &&
          c.ticket_reason === convs[i].ticket_reason
        );
      return isIdentical ? prev : convs;
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000); // 1s polling for live inbox feel!
    return () => clearInterval(interval);
  }, [activeId]);

  const lastMsgCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    isFirstLoadRef.current = true;
    setMessages([]); // Clear old messages immediately on switch to prevent flicker
  }, [activeId]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (isFirstLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstLoadRef.current = false;
    } else if (messages.length > lastMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    lastMsgCountRef.current = messages.length;
    setTimeout(handleScroll, 100);
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    
    const text = input;
    setInput('');
    
    // Optimistic UI update
    const newMsg = { 
      id: `temp-${Date.now()}`, 
      sender: 'human_agent', 
      content: text, 
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, newMsg]);

    await sendMessage(activeId, text);
    // Reload to get real ID
    loadData();
  };

  const handleToggle = async () => {
    if (!activeId) return;
    const newStatus = !isTakeover;
    setIsTakeover(newStatus);
    
    setConversations(prev => prev.map(c => 
      c.id === activeId ? { ...c, status: newStatus ? 'human_takeover' : 'bot_active' } : c
    ));
    
    await toggleTakeover(activeId, newStatus);
  };

  const handleFlagFraud = async () => {
    if (!activeId || !confirm("Are you sure you want to flag this customer as fraud? DullBot will stop responding to them.")) return;
    await flagCustomerAsFraud(activeId, "Flagged from Inbox");
    alert("Customer flagged as fraud.");
    // Force reload to reflect takeover status
    window.location.reload();
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] bg-white rounded-cards shadow-subtle border border-dove/20 flex overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-dove/20 flex flex-col bg-fog">
        <div className="p-4 border-b border-dove/10 bg-white">
          <h2 className="text-lg font-serif text-ink font-medium">Inbox</h2>
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
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-ash text-sm">No messages in this conversation.</div>
            ) : (
              messages.map((msg, idx) => {
                const isCustomer = msg.sender === 'customer';
                const isHumanAgent = msg.sender === 'human_agent';
                const isLastMsg = idx === messages.length - 1;
                
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
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
                        {parseMessageSegments(msg.content).map((segment, sIdx) => {
                          const isFirst = sIdx === 0;
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
                  </div>
                );
              })
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
          <div className="p-4 bg-white border-t border-dove/20 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isTakeover ? "Type a reply as human..." : "Take over to reply..."}
                className="w-full bg-[#F0F2F5] rounded-full pl-4 pr-12 py-2.5 text-[15px] text-[#050505] placeholder:text-[#65676B] border-none focus:outline-none focus:ring-0"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 p-1.5 text-[#0084FF] hover:bg-black/5 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            {!isTakeover && input.trim() && (
              <p className="text-[10px] text-rust mt-2 px-2">
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
  );
}
