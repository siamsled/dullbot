"use client";

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'system';
  text: string;
  timestamp: string;
  metadata?: {
    cacheHit?: boolean;
    preFilterHit?: boolean;
    geminiCalled?: boolean;
  };
}

export default function SandboxPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'system',
      text: "System initialized. Send a message to simulate a customer query. Try greeting ('hello'), asking for a price/negotiating ('discount?'), or requesting to purchase a Leather Jacket.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+8801712345678');
  const [shopSlug, setShopSlug] = useState('dull-store');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsgText = inputText.trim();
    setInputText('');

    const newCustomerMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'customer',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newCustomerMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/channels/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_slug: shopSlug,
          customer_phone: customerPhone,
          text: userMsgText
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'bot',
          text: data.response || data.message || "...",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metadata: {
            cacheHit: data.cacheHit,
            preFilterHit: data.preFilterHit,
            geminiCalled: data.geminiCalled
          }
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'system',
            text: `Error invoking agent: ${data.error || 'Check server logs.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'system',
          text: "Connection failed. Make sure server is running and GEMINI_API_KEY is configured.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header Config Section */}
      <div className="bg-white p-4 border border-gray-200 rounded-t-lg flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">💬 DullBot Chat Sandbox</h1>
          <p className="text-xs text-gray-500">Test how the deadpan AI replies to customer messages in real-time.</p>
        </div>
        <div className="flex gap-3">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-gray-400">Shop Slug</label>
            <input 
              type="text" 
              value={shopSlug} 
              onChange={e => setShopSlug(e.target.value)} 
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black w-28"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-gray-400">Customer Phone</label>
            <input 
              type="text" 
              value={customerPhone} 
              onChange={e => setCustomerPhone(e.target.value)} 
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black w-36"
            />
          </div>
        </div>
      </div>

      {/* Chat Display Pane */}
      <div className="flex-1 bg-gray-50 border-x border-b border-gray-200 p-6 overflow-y-auto space-y-4 flex flex-col">
        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="mx-auto max-w-lg bg-gray-200/60 border border-gray-300/40 rounded-xl px-4 py-2.5 text-center text-xs text-gray-600 font-sans">
                {msg.text}
              </div>
            );
          }

          const isCustomer = msg.sender === 'customer';
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[70%] ${isCustomer ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <span className="text-[10px] text-gray-400 mb-1 font-mono px-1">
                {isCustomer ? 'Customer' : 'DullBot'} &bull; {msg.timestamp}
              </span>
              <div 
                className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isCustomer 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
              
              {msg.metadata && (
                <div className="mt-1 flex gap-2 flex-wrap">
                  {msg.metadata.preFilterHit && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded-full">
                      Quick Reply Hit
                    </span>
                  )}
                  {msg.metadata.cacheHit && (
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
                      Cache Hit (0 cost)
                    </span>
                  )}
                  {msg.metadata.geminiCalled && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      Gemini API Call
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="self-start flex items-center gap-2 text-xs text-gray-400">
            <span className="animate-pulse">DullBot is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Box */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type message as customer... (e.g. 'Is the leather jacket available?')" 
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !inputText.trim()}
          className="bg-black hover:bg-gray-800 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:bg-gray-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
