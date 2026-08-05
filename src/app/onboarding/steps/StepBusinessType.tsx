'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Utensils, Scissors, ArrowRight, Check, Loader2 } from 'lucide-react';
import { saveBusinessType } from '../../dashboard/actions';

const BUSINESS_TYPES = [
  { id: 'retail', title: 'Retail & E-commerce', desc: 'Boutiques, clothing, gadget & D2C shops', icon: Store },
  { id: 'restaurant', title: 'Restaurant & Food', desc: 'Cafés, cloud kitchens, food delivery', icon: Utensils },
  { id: 'service', title: 'Service Business', desc: 'Salons, parlors, clinics, tutoring & bookings', icon: Scissors },
];

interface Props { shop: any; onNext: (businessType: string) => void; onBack: () => void; }

export default function StepBusinessType({ shop, onNext }: Props) {
  const [selected, setSelected] = useState<string>(shop.business_type || '');
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
    <motion.div key="step-business-type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content with fade hint */}
      <div className="relative flex-1 min-h-0">
      <div className="h-full overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-8">
          What kind of business do you run?
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BUSINESS_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;
            return (
              <button key={type.id} onClick={() => setSelected(type.id)} disabled={loading}
                className={`relative p-6 rounded-xl border text-left flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? 'border-white bg-white/15 shadow-lg shadow-white/5' : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'}`}>
                {isSelected && <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center"><Check className="w-3.5 h-3.5 text-black" /></div>}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">{type.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">{type.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[rgba(10,12,20,0.85)] to-transparent" />
      </div>
      {/* Pinned nav (No Back button on Step 1) */}
      <div className="flex items-center justify-end pt-4 border-t border-white/10 shrink-0">
        <button onClick={handleContinue} disabled={!selected || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
