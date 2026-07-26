'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, UtensilsCrossed, Sparkles, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { saveBusinessType } from '../../dashboard/actions';

const BUSINESS_TYPES = [
  { id: 'retail', title: 'Retail & E-commerce', desc: 'Boutiques, product stores, D2C brands', icon: ShoppingBag },
  { id: 'restaurant', title: 'Restaurant & Food', desc: 'Cafés, dine-in, cloud kitchens', icon: UtensilsCrossed },
  { id: 'service', title: 'Service Business', desc: 'Salons, clinics, tutoring, bookings', icon: Sparkles },
];

interface Props { shop: any; onNext: (businessType: string) => void; onBack: () => void; }

export default function StepBusinessType({ shop, onNext, onBack }: Props) {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-8">
          What kind of business do you run?
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BUSINESS_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;
            return (
              <button key={type.id} onClick={() => setSelected(type.id)} disabled={loading}
                className={`relative p-6 rounded-xl border-2 text-left flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                {isSelected && <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{type.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{type.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-white to-transparent" />
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleContinue} disabled={!selected || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
