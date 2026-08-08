'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Truck, Check, Package } from 'lucide-react';
import { saveCourierChoice } from '../../dashboard/actions';

function SteadfastLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 68L48 16H84L58 68H22Z" fill="#00B074" />
      <path d="M48 44L72 16H84L60 44H48Z" fill="#34D399" />
      <path d="M12 84L36 36H56L32 84H12Z" fill="#059669" />
    </svg>
  );
}

function PathaoLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 54C15 32 30 14 54 14C74 14 88 28 88 46C88 62 76 74 60 74H42L26 90V74H23C18 74 15 68 15 54Z" fill="#E2133A" />
      <path d="M52 28C40 28 30 36 30 48C30 58 38 64 52 64C64 64 72 58 72 48C72 38 64 28 52 28Z" fill="#FFFFFF" />
      <path d="M52 38C46 38 42 42 42 48C42 54 46 56 52 56C58 56 62 54 62 48C62 42 58 38 52 38Z" fill="#E2133A" />
    </svg>
  );
}

function RedXLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 16H52C68 16 78 24 78 40C78 52 70 60 58 62L82 88H58L36 62H28V88H12V16ZM28 46H50C56 46 60 43 60 40C60 37 56 32 50 32H28V46Z" fill="#E50914" />
      <path d="M68 16L88 36L80 44L60 24L68 16Z" fill="#FF4D4D" />
    </svg>
  );
}

function ECourierLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" fill="#00ACC1" />
      <path d="M58 68H40V60H58V68ZM68 52H36V44C36 35 43 28 52 28C61 28 68 35 68 44V52ZM44 44H60C60 39.5 56.4 36 52 36C47.6 36 44 39.5 44 44Z" fill="#FFFFFF" />
      <path d="M72 26L86 12M82 36H94" stroke="#00E5FF" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function PaperflyLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 48L88 12L52 88L40 56L10 48Z" fill="#FF6D00" />
      <path d="M40 56L88 12L52 88L40 56Z" fill="#FFA000" />
      <path d="M40 56V80L52 68" fill="#D84315" />
    </svg>
  );
}

function ManualLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

const COURIERS = [
  { id: 'steadfast', name: 'Steadfast Courier', desc: 'Nationwide · fast', icon: SteadfastLogo, fields: ['api_key', 'secret_key'], fieldLabels: { api_key: 'API Key', secret_key: 'Secret Key' } },
  { id: 'pathao', name: 'Pathao Courier', desc: 'Dhaka + major cities', icon: PathaoLogo, fields: ['client_id', 'client_secret', 'username', 'password'], fieldLabels: { client_id: 'Client ID', client_secret: 'Client Secret', username: 'Username', password: 'Password' } },
  { id: 'redx', name: 'RedX', desc: 'Nationwide', icon: RedXLogo, fields: ['api_key'], fieldLabels: { api_key: 'API Key' } },
  { id: 'ecourier', name: 'eCourier', desc: 'Reliable inter-city', icon: ECourierLogo, fields: ['api_key', 'api_secret', 'username', 'password'], fieldLabels: { api_key: 'API Key', api_secret: 'API Secret', username: 'Username', password: 'Password' } },
  { id: 'paperfly', name: 'Paperfly', desc: '500+ locations', icon: PaperflyLogo, fields: ['store_id', 'api_key'], fieldLabels: { store_id: 'Store ID', api_key: 'API Key' } },
];

interface Props { shop: any; onNext: () => void; onBack: () => void; }

export default function StepDelivery({ shop, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string>(shop.courier_provider || '');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hasSelection, setHasSelection] = useState(!!shop.courier_provider);

  const selectedCourier = COURIERS.find((c) => c.id === selected);

  const selectCourier = (id: string) => { setSelected(id); setCredentials({}); setHasSelection(true); };
  const selectManual = () => { setSelected('manual'); setCredentials({}); setHasSelection(true); };

  const handleContinue = async () => {
    if (!hasSelection) return;
    setLoading(true);
    try {
      const res = await saveCourierChoice(shop.id, selected || 'manual', Object.keys(credentials).length > 0 ? credentials : undefined);
      if (res.success) onNext(); else alert(res.error || 'Failed to save');
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await saveCourierChoice(shop.id, 'manual');
    } catch (e) {
      /* ignore */
    }
    setLoading(false);
    onNext();
  };

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-200 ease-out placeholder:text-white/30';

  return (
    <motion.div key="step-delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4 scroll-smooth min-h-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Which courier handles your deliveries?</h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">Connect a courier for automated shipment booking, or choose manual fulfillment.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {COURIERS.map((c) => {
            const isSelected = selected === c.id;
            const LogoComponent = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCourier(c.id)}
                className={`p-5 rounded-2xl border text-left flex flex-col gap-3 transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isSelected
                    ? 'border-white/30 bg-white/12 shadow-md shadow-black/40'
                    : 'border-white/8 bg-white/4 hover:border-white/18 hover:bg-white/8'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-white/15 shadow-inner' : 'bg-white/8'}`}>
                  <LogoComponent className="w-6 h-6 shrink-0" />
                </div>
                <div><h3 className="font-semibold text-xs text-white">{c.name}</h3><p className="text-[11px] text-white/50 mt-0.5">{c.desc}</p></div>
                {isSelected && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center self-end shadow-sm"><Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /></div>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={selectManual}
            className={`p-5 rounded-2xl border text-left flex flex-col gap-3 transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              selected === 'manual'
                ? 'border-white/30 bg-white/12 shadow-md shadow-black/40'
                : 'border-white/8 bg-white/4 hover:border-white/18 hover:bg-white/8 backdrop-blur-md'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${selected === 'manual' ? 'bg-white/15 shadow-inner' : 'bg-white/8'}`}>
              <ManualLogo className="w-5 h-5 text-white/80 shrink-0" />
            </div>
            <div><h3 className="font-semibold text-xs text-white">Manual / Own Delivery</h3><p className="text-[11px] text-white/50 mt-0.5">You handle shipping</p></div>
            {selected === 'manual' && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center self-end shadow-sm"><Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /></div>}
          </button>
        </div>
        <AnimatePresence>
          {selectedCourier && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-5 bg-white/4 rounded-2xl border border-white/8 space-y-3 backdrop-blur-md">
                <p className="text-xs text-white/50">Enter your {selectedCourier.name} API credentials. You can also do this later from Settings.</p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedCourier.fields.map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-white/80 mb-1">{(selectedCourier.fieldLabels as any)[field]}</label>
                      <input type={field.includes('secret') || field.includes('password') || field.includes('key') ? 'password' : 'text'} value={credentials[field] || ''} onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))} placeholder="Paste your API key" className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-3 pb-2 shrink-0 border-t border-white/8 mt-auto z-20 gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="text-xs font-semibold text-white/45 hover:text-white/90 px-3.5 py-2.5 rounded-full hover:bg-white/8 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Skip for now
          </button>
          <button onClick={handleContinue} disabled={!hasSelection || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
