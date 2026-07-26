'use client';

import { motion } from 'framer-motion';

const STEPS = [
  { key: 'business_type', label: 'Type' },
  { key: 'channels', label: 'Channels' },
  { key: 'context', label: 'Context' },
  { key: 'type_specific', label: 'Details' },
  { key: 'payments', label: 'Payments' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'demo', label: 'Preview' },
];

const ORDER = STEPS.map((s) => s.key);

interface Props {
  currentStep: string;
}

export default function WizardProgress({ currentStep }: Props) {
  const currentIndex = ORDER.indexOf(currentStep);

  return (
    <div className="w-full max-w-sm mx-auto mb-6">
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col gap-1">
              <div className="relative h-1 rounded-full overflow-hidden bg-dove/15">
                <motion.div
                  className={`absolute inset-0 rounded-full ${done ? 'bg-rust' : active ? 'bg-rust/50' : 'bg-transparent'}`}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: done || active ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
              {active && (
                <span className="text-[9px] text-rust font-semibold uppercase tracking-widest text-center truncate">
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-ash/60 text-right mt-1">
        Step {Math.max(currentIndex + 1, 1)} of {STEPS.length}
      </p>
    </div>
  );
}
