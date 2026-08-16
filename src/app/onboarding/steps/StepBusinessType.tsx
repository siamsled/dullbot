'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Utensils, Scissors, ArrowRight, Check, Loader2 } from 'lucide-react';
import { saveBusinessType } from '../../dashboard/actions';

const BUSINESS_TYPES = [
  { id: 'retail', title: 'Retail & E-commerce', desc: 'Boutiques, clothing, gadget & D2C shops', icon: Store, available: true },
  { id: 'restaurant', title: 'Restaurant & Food', desc: 'Cafés, cloud kitchens, food delivery', icon: Utensils, available: false },
  { id: 'service', title: 'Service Business', desc: 'Salons, parlors, clinics, tutoring & bookings', icon: Scissors, available: false },
];

interface Props { shop: any; onNext: (businessType: string) => void; onBack: () => void; }

export default function StepBusinessType({ shop, onNext }: Props) {
  const [selected, setSelected] = useState<string>(
    shop.business_type && shop.business_type === 'retail' ? 'retail' : 'retail'
  );
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await saveBusinessType(shop.id, selected);
      if (res.success) { onNext(selected); }
      else { alert(res.error || 'Failed to save.'); setLoading(false); }
    } catch (e: any) { alert(e.message); setLoading(false); }
  };

  return (
    <motion.div key="step-business-type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      {/* Scrollable content */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto pb-4 scroll-smooth">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-6">
            What kind of business do you run?
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUSINESS_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selected === type.id && type.available;
              const isAvailable = type.available;

              return (
                <button
                  key={type.id}
                  onClick={() => {
                    if (isAvailable) setSelected(type.id);
                  }}
                  disabled={!isAvailable || loading}
                  className={`relative p-6 rounded-2xl border text-left flex flex-col gap-4 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    !isAvailable
                      ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed select-none'
                      : isSelected
                      ? 'border-white/30 bg-white/12 shadow-md shadow-black/40 active:scale-[0.98]'
                      : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/8 active:scale-[0.98]'
                  }`}
                >
                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    </div>
                  )}

                  {/* Coming Soon Pill */}
                  {!isAvailable && (
                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-semibold text-white/70 tracking-wide uppercase">
                      Coming Soon
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                    !isAvailable
                      ? 'bg-white/5 text-white/30'
                      : isSelected
                      ? 'bg-white text-black'
                      : 'bg-white/8 text-white/70'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm mb-1 ${!isAvailable ? 'text-white/60' : 'text-white'}`}>{type.title}</h3>
                    <p className={`text-xs leading-relaxed ${!isAvailable ? 'text-white/30' : 'text-white/50'}`}>{type.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Pinned nav (No Back button on Step 1) */}
      <div className="flex items-center justify-end pt-3 pb-2 shrink-0 border-t border-white/8 mt-auto z-20">
        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
