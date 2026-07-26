'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Sparkles } from 'lucide-react';
import StepBusinessType from './steps/StepBusinessType';
import StepChannels from './steps/StepChannels';
import StepContext from './steps/StepContext';
import StepTypeSpecific from './steps/StepTypeSpecific';
import StepPayments from './steps/StepPayments';
import StepDelivery from './steps/StepDelivery';
import StepDemo from './steps/StepDemo';

type WizardStep = 'business_type' | 'channels' | 'context' | 'type_specific' | 'payments' | 'delivery' | 'demo';

const STEP_ORDER: WizardStep[] = [
  'business_type', 'channels', 'context', 'type_specific', 'payments', 'delivery', 'demo',
];

const STEP_LABELS: Record<WizardStep, { eyebrow: string; count: number }> = {
  business_type: { eyebrow: "LET'S START WITH THE BASICS", count: 1 },
  channels:      { eyebrow: 'CONNECT YOUR CHANNELS', count: 2 },
  context:       { eyebrow: 'YOUR IDENTITY', count: 3 },
  type_specific: { eyebrow: 'FINE-TUNE THE SETUP', count: 4 },
  payments:      { eyebrow: 'PAYMENT SETUP', count: 5 },
  delivery:      { eyebrow: 'SHIPPING & DELIVERY', count: 6 },
  demo:          { eyebrow: 'TEST DRIVE · ALMOST THERE', count: 7 },
};

function resolveInitialStep(shop: any): WizardStep {
  const dbStep = shop?.onboarding_step;
  if (dbStep && STEP_ORDER.includes(dbStep as WizardStep)) {
    return dbStep as WizardStep;
  }
  const done = shop?.onboarding_steps_done || [];
  if (done.includes('context_form')) return 'type_specific';
  if (done.includes('classification')) return 'channels';
  return 'business_type';
}

export default function OnboardingClient({ shop: initialShop }: { shop: any }) {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState(initialShop);
  const [step, setStep] = useState<WizardStep>(() => resolveInitialStep(initialShop));

  useEffect(() => {
    const stepParam = searchParams.get('step');
    const messengerConnected = searchParams.get('messenger') === 'connected';
    const instagramConnected = searchParams.get('instagram') === 'connected';

    if (stepParam === 'channels' || messengerConnected || instagramConnected) {
      setStep('channels');
      if (messengerConnected) {
        setShop((prev: any) => ({ ...prev, meta_page_access_token: prev.meta_page_access_token || '__pending__' }));
      }
      if (instagramConnected) {
        setShop((prev: any) => ({ ...prev, instagram_business_id: prev.instagram_business_id || '__pending__' }));
      }
    }
  }, [searchParams]);

  const currentIndex = STEP_ORDER.indexOf(step);
  const { eyebrow, count } = STEP_LABELS[step];

  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col select-none font-sans relative z-10">

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">DullBot</p>
              <p className="text-[11px] text-slate-500 leading-tight">for merchants</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-500">{count} of {STEP_ORDER.length}</span>
        </div>

        {/* ── Segmented Progress Bar ──────────────────────────────── */}
        <div className="bg-white/80 backdrop-blur-sm px-0 flex gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 transition-colors duration-500 ${
                i <= currentIndex ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* ── Card ────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-start justify-center py-8 px-4">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">

            {/* Card inner */}
            <div className="p-8 sm:p-10">
              {/* Eyebrow */}
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">{eyebrow}</p>

              {/* Step content */}
              <AnimatePresence mode="wait">
                {step === 'business_type' && (
                  <StepBusinessType
                    key="business_type"
                    shop={shop}
                    onNext={(businessType) => {
                      setShop((prev: any) => ({ ...prev, business_type: businessType }));
                      goNext();
                    }}
                    onBack={goBack}
                  />
                )}
                {step === 'channels' && (
                  <StepChannels key="channels" shop={shop} onNext={goNext} onBack={goBack} />
                )}
                {step === 'context' && (
                  <StepContext key="context" shop={shop} onNext={goNext} onBack={goBack} />
                )}
                {step === 'type_specific' && (
                  <StepTypeSpecific key="type_specific" shop={shop} onNext={goNext} onBack={goBack} />
                )}
                {step === 'payments' && (
                  <StepPayments key="payments" shop={shop} onNext={goNext} onBack={goBack} />
                )}
                {step === 'delivery' && (
                  <StepDelivery key="delivery" shop={shop} onNext={goNext} onBack={goBack} />
                )}
                {step === 'demo' && (
                  <StepDemo key="demo" shop={shop} onBack={goBack} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-500/80 pb-6">
          Your progress is saved. You can adjust any of this later from your dashboard.
        </p>
      </div>
    </AuroraBackground>
  );
}
