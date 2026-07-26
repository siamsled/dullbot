'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, UtensilsCrossed, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { saveBusinessType } from '../../dashboard/actions';

const BUSINESS_TYPES = [
  {
    id: 'retail',
    title: 'Retail / Wholesale',
    desc: 'Physical products, inventory management, delivery, and automated checkout. Includes wholesale pricing support.',
    icon: ShoppingBag,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    desc: 'Table reservations, menu browsing, location info, and dine-in or delivery coordination.',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    id: 'service',
    title: 'Services',
    desc: 'Appointment bookings, staff scheduling, consulting slots, and service package information.',
    icon: Briefcase,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
];

interface Props {
  shop: any;
  onNext: (businessType: string) => void;
}

export default function StepBusinessType({ shop, onNext }: Props) {
  const [selected, setSelected] = useState<string>(shop.business_type || '');
  const [loading, setLoading] = useState(false);

  const handleSelect = async (typeId: string) => {
    setSelected(typeId);
    setLoading(true);
    try {
      const res = await saveBusinessType(shop.id, typeId);
      if (res.success) {
        onNext(typeId);
      } else {
        alert(res.error || 'Failed to save. Please try again.');
        setLoading(false);
      }
    } catch (e: any) {
      alert(e.message || 'An error occurred.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="step-business-type"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="flex flex-col"
    >
      <h1 className="font-serif text-3xl sm:text-4xl text-ink font-light text-center leading-tight mb-2 tracking-tight">
        What kind of business do you run?
      </h1>
      <p className="text-xs text-ash text-center mb-8 max-w-md mx-auto leading-relaxed">
        DullBot will configure the right automated workflows, conversation flows, and features based on your type.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;
          const isLoading = loading && selected === type.id;
          return (
            <button
              key={type.id}
              disabled={loading}
              onClick={() => handleSelect(type.id)}
              className={`p-5 rounded-cards border-2 text-left flex items-center gap-5 transition-all duration-200 group ${
                isSelected
                  ? 'border-rust bg-apricot-wash/40 shadow-subtle scale-[1.01]'
                  : 'border-dove/20 bg-white hover:border-ink/30 hover:bg-fog/60 hover:-translate-y-0.5'
              } ${loading && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-rust' : type.bg}`}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : type.color}`} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-ink mb-1">{type.title}</h3>
                <p className="text-xs text-ash leading-relaxed">{type.desc}</p>
              </div>
              <ArrowRight
                className={`w-4 h-4 shrink-0 transition-all ${
                  isSelected ? 'text-rust translate-x-1' : 'text-dove group-hover:text-ink group-hover:translate-x-0.5'
                }`}
              />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
