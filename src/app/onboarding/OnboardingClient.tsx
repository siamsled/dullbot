'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { GravityStarsBackground } from '@/components/ui/gravity-stars-bg';
import SiriOrb from '@/components/ui/siri-orb';
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
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-black z-0">
      <GravityStarsBackground
        starsCount={100}
        starsSize={2.5}
        starsOpacity={0.8}
        glowIntensity={20}
        movementSpeed={0.35}
        mouseInfluence={120}
        gravityStrength={80}
        className="absolute inset-0 size-full text-white"
      />
      {/* Full-screen centered layout */}
      <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 sm:p-8 select-none font-sans pointer-events-none z-10">

        {/*
          ISLAND CARD
          - Fixed width: max-w-3xl (≈768px)
          - Fixed static height across steps: h-[640px]
          - Apple visionOS / iOS 18 Glassmorphism
        */}
        <div className="w-full max-w-3xl bg-[rgba(15,18,28,0.38)] backdrop-blur-[40px] saturate-[210%] rounded-[28px] shadow-[0_32px_96px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_-1px_0_0_rgba(255,255,255,0.05)] flex flex-col h-[640px] min-h-[640px] max-h-[640px] overflow-hidden text-white pointer-events-auto">

          {/* ── Card Header: Siri Orb + Logo + Creative Merchant Badge + Sleek Step Counter ── */}
          <div className="flex items-center justify-between px-8 pt-6 pb-2">
            <div className="flex items-center gap-3.5">
              {/* Siri Orb (Bigger 36px size) */}
              <SiriOrb size="36px" state="listening" className="mr-0.5" />
              
              <div className="flex items-baseline gap-2.5">
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 30,
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    color: '#ffffff',
                  }}
                >
                  dull<span style={{ fontFamily: 'sans-serif', fontWeight: 500, fontSize: 18, color: 'rgba(255, 255, 255, 0.6)' }}>bot.</span>
                </span>
                {/* Creative Merchant text placement (sleek gradient typography) */}
                <span className="text-[11px] font-semibold tracking-widest uppercase bg-gradient-to-r from-white/70 via-white/40 to-white/20 bg-clip-text text-transparent">
                  for merchants
                </span>
              </div>
            </div>

            {/* Sleek Step Counter (No 'Step' text, no green dot) */}
            <div className="flex items-center">
              <span className="text-xs tracking-wider text-white/50 uppercase font-medium tabular-nums">
                <span className="text-white font-bold text-sm">{currentIndex + 1}</span> <span className="text-white/30">/</span> {STEP_ORDER.length}
              </span>
            </div>
          </div>

          {/* ── Modern Continuous Progress Track with Glow ────── */}
          <div className="px-8 pt-1 pb-3">
            <div className="relative w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-white/60 via-white to-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / STEP_ORDER.length) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* ── Step Content area (each step handles its own scroll + pinned nav) */}
          <div className="px-8 pt-2 pb-1 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Eyebrow */}
            <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase mb-2 shrink-0">{eyebrow}</p>

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
          <div className="px-8 pt-1.5 pb-3 shrink-0">
            <p className="text-[10px] text-white/35 text-center">
              Your progress is saved. You can adjust any of this later from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
