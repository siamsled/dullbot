'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Send, ArrowLeft, Rocket, User } from 'lucide-react';
import { generateLiveDemo, completeOnboarding } from '../../dashboard/actions';
import { useRouter } from 'next/navigation';

interface Props { shop: any; onBack: () => void; }

export default function StepDemo({ shop, onBack }: Props) {
  const router = useRouter();
  const [demoState, setDemoState] = useState<'loading' | 'ready' | 'skipped'>('loading');
  const [chatMessages, setChatMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const businessType = (shop.business_type || 'retail') as 'retail' | 'restaurant' | 'service';
    generateLiveDemo(shop.id, businessType)
      .then(({ demoReply: reply, sampleQuestion: question }) => {
        if (reply) { setChatMessages([{ from: 'user', text: question }, { from: 'bot', text: reply }]); setDemoState('ready'); }
        else { setDemoState('skipped'); }
      })
      .catch(() => setDemoState('skipped'));
  }, [shop.id, shop.business_type]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { from: 'user', text: userMsg }]);
    setTimeout(() => { setChatMessages((prev) => [...prev, { from: 'bot', text: `In your live shop, DullBot will reply using your full product catalog and settings. This is just a preview sandbox.` }]); }, 800);
  };

  const handleDeploy = async () => {
    setCompleting(true);
    try { await completeOnboarding(shop.id); } catch (e) { /* no-op */ }
    setShowDeployModal(true);
    setTimeout(() => { router.push('/dashboard?unlocked=1'); }, 2500);
  };

  const channels = [shop.meta_page_access_token && 'Messenger', shop.instagram_business_id && 'Instagram', shop.whatsapp_phone_number_id && 'WhatsApp'].filter(Boolean).join(' · ') || 'None connected yet';

  return (
    <motion.div key="step-demo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">Say hello to your new teammate.</h1>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">Here&apos;s a live preview. Send a message to see how your AI assistant responds.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-blue-600" /></div>
              <div><p className="text-sm font-bold text-slate-900 leading-none">Meet your assistant</p><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live sandbox</span></div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-400 text-xs">Trained on</span><span className="font-semibold text-slate-700 text-xs text-right max-w-[60%] truncate">{shop.name || 'Your Shop'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 text-xs">Persona</span><span className="font-semibold text-slate-700 text-xs capitalize">{shop.tone_template || 'warm'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 text-xs">Channels</span><span className="font-semibold text-slate-700 text-xs text-right max-w-[60%]">{channels}</span></div>
            </div>
          </div>
          {/* Right: chat mockup */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden" style={{ minHeight: '200px' }}>
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Sparkles className="w-2.5 h-2.5 text-white" /></div>
              <span className="text-xs font-semibold text-slate-700 truncate">DullBot — {shop.name || 'Your Shop'}</span>
            </div>
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {demoState === 'loading' && <div className="flex items-center justify-center h-full py-4"><div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Generating preview…</span></div></div>}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.from === 'bot' && <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-1.5 mt-1 shrink-0"><Sparkles className="w-2.5 h-2.5 text-blue-500" /></div>}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${msg.from === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'}`}>{msg.text}</div>
                  {msg.from === 'user' && <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center ml-1.5 mt-1 shrink-0"><User className="w-2.5 h-2.5 text-slate-500" /></div>}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 p-2 flex gap-2">
              <input ref={inputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={chatMessages.length > 0 ? 'Type another…' : 'Send to test'} disabled={demoState === 'loading'} className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-400" />
              <button onClick={handleSend} disabled={!chatInput.trim() || demoState === 'loading'} className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"><Send className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleDeploy} disabled={completing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4" /> Deploy Assistant</>}
        </button>
      </div>

      {/* Deploy success modal */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-8 text-center">
              <div className="relative w-16 h-16 mx-auto mb-5"><div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-50" /><div className="relative w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center"><Rocket className="w-8 h-8 text-white" /></div></div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Your assistant is live.</h2>
              <p className="text-sm text-slate-500"><strong>{shop.name || 'Your shop'}</strong> is now replying to customers 24/7.</p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> Taking you to your dashboard…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
