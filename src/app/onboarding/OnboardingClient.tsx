'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { PixelLiquidBg } from '@/components/ui/pixel-liquid-bg';
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

const STEP_LABELS: Record<WizardStep, string> = {
  business_type: "LET'S START WITH THE BASICS",
  channels:      'CONNECT YOUR CHANNELS',
  context:       'YOUR IDENTITY',
  type_specific: 'FINE-TUNE THE SETUP',
  payments:      'PAYMENT SETUP',
  delivery:      'SHIPPING & DELIVERY',
  demo:          'TEST DRIVE · ALMOST THERE',
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
  const eyebrow = STEP_LABELS[step];

  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  return (
    <PixelLiquidBg
      pixelSize={14}
      resolution={0.45}
      mouseForce={3.5}
      cursorSize={75}
      autoDemo={false}
      className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-black z-0 flex items-center justify-center"
    >
      {/* Full-screen centered layout */}
      <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4 sm:p-8 select-none font-sans pointer-events-auto">

        {/*
          ISLAND CARD
          - Fixed width: max-w-3xl (≈768px)
          - Fixed static height across steps: h-[640px]
          - Progress bar is the very first thing INSIDE the card
        */}
        <div className="w-full max-w-3xl bg-[rgba(10,12,20,0.82)] backdrop-blur-[36px] saturate-[180%] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.75)] border border-white/15 flex flex-col h-[640px] min-h-[640px] max-h-[640px] overflow-hidden text-white">

          {/* ── Card Header: Logo + Step counter ─────────────────── */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 22,
                  fontWeight: 300,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}
              >
                dull<span style={{ fontFamily: 'sans-serif', fontWeight: 500, fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' }}>bot.</span>
              </span>
              <span className="text-[11px] text-white/40 font-medium ml-1">for merchants</span>
            </div>
            <span className="text-xs font-semibold text-white/40 tabular-nums">
              {currentIndex + 1} of {STEP_ORDER.length}
            </span>
          </div>

          {/* ── Segmented Progress Bar (attached inside card) ────── */}
          <div className="flex gap-1.5 px-8 pb-5">
            {STEP_ORDER.map((s, i) => (
              <motion.div
                key={s}
                className="h-1 flex-1 rounded-full overflow-hidden bg-white/10"
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: i <= currentIndex ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </motion.div>
            ))}
          </div>

          {/* ── Divider ───────────────────────────────────────────── */}
          <div className="h-px bg-white/10 mx-8" />

          {/* ── Step Content area (each step handles its own scroll + pinned nav) */}
          <div className="px-8 py-6 flex-1 overflow-hidden flex flex-col">
            {/* Eyebrow */}
            <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase mb-3">{eyebrow}</p>

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

          {/* ── Card Footer ───────────────────────────────────────── */}
          <div className="px-8 py-4 border-t border-white/10">
            <p className="text-[11px] text-white/40 text-center">
              Your progress is saved. You can adjust any of this later from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </PixelLiquidBg>
  );
}
