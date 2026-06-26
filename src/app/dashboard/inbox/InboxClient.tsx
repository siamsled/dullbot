'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User, Search, Send, AlertTriangle, ShieldCheck, UserCog, MessageSquareText } from 'lucide-react';
import { getMessages, sendMessage, toggleTakeover } from './actions';

export default function InboxClient({ shop, initialConversations }: { shop: any, initialConversations: any[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTakeover, setIsTakeover] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeId);

  useEffect(() => {
    if (activeConv) {
      setIsTakeover(activeConv.status === 'human_takeover');
    }
  }, [activeConv]);

  const loadMessages = async () => {
    if (!activeId) return;
    const msgs = await getMessages(activeId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Simple polling for MVP
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    
    const text = input;
    setInput('');
    
    // Optimistic UI update
    const newMsg = { id: Date.now(), sender: 'human_agent', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, newMsg]);

    await sendMessage(activeId, text);
    // Reload to get real ID
    loadMessages();
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
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-ash text-sm">No conversations yet.</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full text-left p-4 border-b border-dove/5 transition-colors flex items-center gap-3 ${
                  activeId === conv.id ? 'bg-white shadow-sm border-l-4 border-l-ink' : 'hover:bg-dove/10 border-l-4 border-l-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-dove/20 flex flex-shrink-0 items-center justify-center text-ink font-medium">
                  {conv.customer_phone.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium text-ink truncate">{conv.customer_phone}</p>
                    <p className="text-xs text-ash">{new Date(conv.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {conv.status === 'human_takeover' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-apricot-wash text-rust">
                        <UserCog className="w-3 h-3" /> Human
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-wash text-blue-600">
                        <Bot className="w-3 h-3" /> Bot
                      </span>
                    )}
                    <p className="text-xs text-ash truncate">Active on {conv.channel}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      {activeId ? (
        <div className="flex-1 flex flex-col bg-pure-white">
          {/* Chat Header */}
          <div className="h-16 border-b border-dove/20 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dove/20 flex items-center justify-center text-ink font-medium">
                {activeConv?.customer_phone.substring(0, 2)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink">{activeConv?.customer_phone}</h3>
                <p className="text-xs text-ash capitalize">via {activeConv?.channel}</p>
              </div>
            </div>
            
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-ash text-sm">No messages in this conversation.</div>
            ) : (
              messages.map(msg => {
                const isCustomer = msg.sender === 'customer';
                const isHumanAgent = msg.sender === 'human_agent';
                
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex flex-col max-w-[75%] ${isCustomer ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-1.5 mb-1 mx-1">
                        {!isCustomer && isHumanAgent && <UserCog className="w-3 h-3 text-ash" />}
                        {!isCustomer && !isHumanAgent && <Bot className="w-3 h-3 text-ash" />}
                        <span className="text-[10px] font-medium text-ash uppercase tracking-wider">
                          {isCustomer ? 'Customer' : isHumanAgent ? 'You (Human)' : 'DullBot AI'}
                        </span>
                        <span className="text-[10px] text-ash">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isCustomer 
                          ? 'bg-fog text-ink rounded-tl-sm border border-dove/20' 
                          : isHumanAgent
                            ? 'bg-ink text-white rounded-tr-sm shadow-subtle'
                            : 'bg-white text-ink border border-dove/20 rounded-tr-sm shadow-subtle'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-dove/20 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isTakeover ? "Type a reply as human..." : "Take over to reply..."}
                className="w-full bg-fog rounded-full pl-5 pr-12 py-3 text-sm text-ink border border-transparent focus:border-dove/30 focus:bg-white focus:ring-0 transition-all placeholder:text-ash"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 p-2 bg-ink text-white rounded-full hover:bg-black disabled:opacity-50 disabled:hover:bg-ink transition-colors"
              >
                <Send className="w-4 h-4" />
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
