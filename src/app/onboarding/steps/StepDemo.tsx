'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Send, ArrowLeft, Rocket, User, Check } from 'lucide-react';
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Say hello to your new teammate.</h1>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">Here&apos;s a live preview. Send a message to see how your AI assistant responds.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: summary */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <div><p className="text-sm font-bold text-white leading-none">Meet your assistant</p><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full mt-0.5 border border-emerald-500/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live sandbox</span></div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-white/40 text-xs">Trained on</span><span className="font-semibold text-white/90 text-xs text-right max-w-[60%] truncate">{shop.name || 'Your Shop'}</span></div>
              <div className="flex justify-between"><span className="text-white/40 text-xs">Persona</span><span className="font-semibold text-white/90 text-xs capitalize">{shop.tone_template || 'warm'}</span></div>
              <div className="flex justify-between"><span className="text-white/40 text-xs">Channels</span><span className="font-semibold text-white/90 text-xs text-right max-w-[60%]">{channels}</span></div>
            </div>
          </div>
          {/* Right: chat mockup */}
          <div className="bg-white/5 rounded-xl border border-white/15 flex flex-col overflow-hidden" style={{ minHeight: '200px' }}>
            <div className="bg-white/10 border-b border-white/10 px-3 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Sparkles className="w-2.5 h-2.5 text-white" /></div>
              <span className="text-xs font-semibold text-white truncate">DullBot — {shop.name || 'Your Shop'}</span>
            </div>
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {demoState === 'loading' && <div className="flex items-center justify-center h-full py-4"><div className="flex items-center gap-2 text-white/40"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Generating preview…</span></div></div>}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.from === 'bot' && <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center mr-1.5 mt-1 shrink-0"><Sparkles className="w-2.5 h-2.5 text-white" /></div>}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${msg.from === 'user' ? 'bg-white text-black rounded-br-sm' : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/10'}`}>{msg.text}</div>
                  {msg.from === 'user' && <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center ml-1.5 mt-1 shrink-0"><User className="w-2.5 h-2.5 text-white" /></div>}
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-2 flex gap-2">
              <input ref={inputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={chatMessages.length > 0 ? 'Type another…' : 'Send to test'} disabled={demoState === 'loading'} className="flex-1 text-xs bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/40 placeholder:text-white/30" />
              <button onClick={handleSend} disabled={!chatInput.trim() || demoState === 'loading'} className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-30"><Send className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleDeploy} disabled={completing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm text-black bg-white hover:bg-white/90 transition-all disabled:opacity-40">
          {completing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <><Rocket className="w-4 h-4" /> Deploy Assistant</>}
        </button>
      </div>

      {/* Deploy success modal */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[rgba(10,12,20,0.92)] border border-white/20 rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center"><Check className="w-8 h-8" /></div>
              <div><h2 className="text-xl font-bold text-white mb-1">Your AI is live!</h2><p className="text-xs text-white/60">DullBot is now watching your channels and ready to respond.</p></div>
              <button onClick={() => window.location.href = '/dashboard'} className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors mt-2">Go to Dashboard →</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
