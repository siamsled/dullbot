'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Truck, Check, Package } from 'lucide-react';
import { saveCourierChoice } from '../../dashboard/actions';

const COURIERS = [
  { id: 'steadfast', name: 'Steadfast Courier', desc: 'Nationwide · fast', fields: ['api_key', 'secret_key'], fieldLabels: { api_key: 'API Key', secret_key: 'Secret Key' } },
  { id: 'pathao', name: 'Pathao Courier', desc: 'Dhaka + major cities', fields: ['client_id', 'client_secret', 'username', 'password'], fieldLabels: { client_id: 'Client ID', client_secret: 'Client Secret', username: 'Username', password: 'Password' } },
  { id: 'redx', name: 'RedX', desc: 'Nationwide', fields: ['api_key'], fieldLabels: { api_key: 'API Key' } },
  { id: 'ecourier', name: 'eCourier', desc: 'Reliable inter-city', fields: ['api_key', 'api_secret', 'username', 'password'], fieldLabels: { api_key: 'API Key', api_secret: 'API Secret', username: 'Username', password: 'Password' } },
  { id: 'paperfly', name: 'Paperfly', desc: '500+ locations', fields: ['store_id', 'api_key'], fieldLabels: { store_id: 'Store ID', api_key: 'API Key' } },
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

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-200 ease-out placeholder:text-white/30';

  return (
    <motion.div key="step-delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4 scroll-smooth">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Which courier handles your deliveries?</h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">Connect a courier for automated shipment booking, or choose manual fulfillment.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {COURIERS.map((c) => {
            const isSelected = selected === c.id;
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-white text-black' : 'bg-white/8 text-white/70'}`}><Truck className="w-4 h-4" /></div>
                <div><h3 className="font-semibold text-xs text-white">{c.name}</h3><p className="text-[11px] text-white/50 mt-0.5">{c.desc}</p></div>
                {isSelected && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center self-end shadow-sm"><Check className="w-3 h-3 text-black stroke-[2.5]" /></div>}
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${selected === 'manual' ? 'bg-white text-black' : 'bg-white/8 text-white/70'}`}><Package className="w-4 h-4" /></div>
            <div><h3 className="font-semibold text-xs text-white">Manual / Own Delivery</h3><p className="text-[11px] text-white/50 mt-0.5">You handle shipping</p></div>
            {selected === 'manual' && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center self-end shadow-sm"><Check className="w-3 h-3 text-black stroke-[2.5]" /></div>}
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
      <div className="flex items-center justify-between pt-3 pb-0.5 shrink-0 border-t border-white/8 mt-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!hasSelection || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
