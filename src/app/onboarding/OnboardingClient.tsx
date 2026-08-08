'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { GravityStarsBackground } from '@/components/ui/gravity-stars-bg';
import SiriOrb from '@/components/ui/siri-orb';
import StepBusinessType from './steps/StepBusinessType';
import StepChannels from './steps/StepChannels';
import StepContext from './steps/StepContext';
import StepPayments from './steps/StepPayments';
import StepDelivery from './steps/StepDelivery';
import StepDemo from './steps/StepDemo';

type WizardStep = 'business_type' | 'channels' | 'context' | 'payments' | 'delivery' | 'demo';

const MAIN_STEPS: WizardStep[] = [
  'business_type', 'channels', 'context', 'payments', 'delivery',
];

const STEP_ORDER: WizardStep[] = [
  'business_type', 'channels', 'context', 'payments', 'delivery', 'demo',
];

const STEP_LABELS: Record<WizardStep, string> = {
  business_type: "LET'S START WITH THE BASICS",
  channels:      'CONNECT YOUR CHANNELS',
  context:       'YOUR IDENTITY',
  payments:      'PAYMENT SETUP',
  delivery:      'SHIPPING & DELIVERY',
  demo:          'SETUP COMPLETE · READY TO LAUNCH',
};

function resolveInitialStep(shop: any): WizardStep {
  const dbStep = shop?.onboarding_step;
  if (dbStep === 'type_specific') return 'payments';
  if (dbStep && STEP_ORDER.includes(dbStep as WizardStep)) {
    return dbStep as WizardStep;
  }
  const done = shop?.onboarding_steps_done || [];
  if (done.includes('context_form')) return 'payments';
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

  const isLaunchScreen = step === 'demo';
  const currentIndex = isLaunchScreen ? MAIN_STEPS.length - 1 : MAIN_STEPS.indexOf(step);
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
      <div className="fixed inset-0 w-full h-full flex items-center justify-center p-3 sm:p-6 md:p-8 select-none font-sans pointer-events-none z-10 overflow-y-auto">

        {/*
          ISLAND CARD
          - Responsive width: max-w-3xl (≈768px)
          - Dynamic responsive height: max-h-[calc(100vh-2rem)] sm:max-h-[720px] min-h-[520px] sm:min-h-[620px]
          - True Frosted Glass (Apple HIG Glassmorphism)
        */}
        <div className="w-full max-w-3xl bg-white/[0.07] backdrop-blur-xl saturate-[160%] rounded-[28px] border border-white/15 shadow-[0_32px_96px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.30),inset_0_-1px_0_0_rgba(255,255,255,0.08)] flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[720px] min-h-[520px] sm:min-h-[620px] h-auto overflow-hidden text-white pointer-events-auto">

          {/* ── Card Header: Siri Orb + Logo + Creative Merchant Badge + Sleek Step Counter ── */}
          <div className="relative flex items-center justify-between px-8 pt-6 pb-2 shrink-0">
            {isLaunchScreen ? (
              <>
                {/* Invisible spacer for symmetrical centering */}
                <div className="w-20 shrink-0 hidden sm:block" />

                {/* Centered Logo + Siri Orb */}
                <div className="flex items-center gap-3 mx-auto sm:mx-0">
                  <SiriOrb size="34px" state="listening" />
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 28,
                        fontWeight: 300,
                        letterSpacing: '-0.03em',
                        color: '#ffffff',
                      }}
                    >
                      dull<span style={{ fontFamily: 'sans-serif', fontWeight: 500, fontSize: 17, color: 'rgba(255, 255, 255, 0.6)' }}>bot.</span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-white/40">
                      for merchants
                    </span>
                  </div>
                </div>

                {/* Borderless Sleek Ready Text */}
                <div className="w-20 flex justify-end shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    READY
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
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
                    <span className="text-[11px] font-semibold tracking-widest uppercase bg-gradient-to-r from-white/70 via-white/40 to-white/20 bg-clip-text text-transparent">
                      for merchants
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="text-xs tracking-wider text-white/50 uppercase font-medium tabular-nums">
                    <span className="text-white font-bold text-sm">{currentIndex + 1}</span> <span className="text-white/30">/</span> {MAIN_STEPS.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Modern Continuous Progress Track with Glow ────── */}
          <div className="px-8 pt-1 pb-3 shrink-0">
            <div className="relative w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-white/60 via-white to-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: isLaunchScreen ? '100%' : `${((currentIndex + 1) / MAIN_STEPS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* ── Step Content area (each step handles its own scroll + pinned nav) */}
          <div className="px-8 pt-2 pb-2 flex-1 overflow-hidden flex flex-col min-h-0">
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
