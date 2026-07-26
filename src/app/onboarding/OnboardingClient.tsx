
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import UiverseGridBackground from '@/components/ui/UiverseGridBackground';
import WizardProgress from './WizardProgress';
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

function resolveInitialStep(shop: any): WizardStep {
  const dbStep = shop?.onboarding_step;
  // If the DB step is a valid wizard step (not 'complete'), use it
  if (dbStep && STEP_ORDER.includes(dbStep as WizardStep)) {
    return dbStep as WizardStep;
  }
  // Fall back to inferring from old onboarding_steps_done array
  const done = shop?.onboarding_steps_done || [];
  if (done.includes('context_form')) return 'type_specific';
  if (done.includes('classification')) return 'channels';
  return 'business_type';
}

export default function OnboardingClient({ shop: initialShop }: { shop: any }) {
  const searchParams = useSearchParams();

  // Live-update shop state after OAuth callbacks land back
  const [shop, setShop] = useState(initialShop);

  const [step, setStep] = useState<WizardStep>(() => resolveInitialStep(initialShop));

  // Handle OAuth redirects back to onboarding with ?step= or ?messenger=connected etc.
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const messengerConnected = searchParams.get('messenger') === 'connected';
    const instagramConnected = searchParams.get('instagram') === 'connected';
    const errorParam = searchParams.get('error');

    if (stepParam === 'channels' || messengerConnected || instagramConnected) {
      setStep('channels');
      // Optimistically mark connection in shop state so channel cards render correctly
      if (messengerConnected) {
        setShop((prev: any) => ({ ...prev, meta_page_access_token: prev.meta_page_access_token || '__pending__' }));
      }
      if (instagramConnected) {
        setShop((prev: any) => ({ ...prev, instagram_business_id: prev.instagram_business_id || '__pending__' }));
      }
    }
  }, [searchParams]);

  const goToStep = (s: WizardStep) => setStep(s);
  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  return (
    <UiverseGridBackground variant="grid">
      <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center py-6 px-4 select-none font-sans relative z-10">
        <div className="max-w-[720px] w-full bg-white rounded-cards shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col my-auto">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5 border-b border-dove/10 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-serif text-2xl sm:text-3xl tracking-tight text-ink font-light">
                dull<span className="font-normal font-sans text-lg sm:text-xl text-ash">bot.</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-rust animate-pulse" />
            </div>
            <p className="text-[11px] sm:text-xs text-ash">Set up your shop assistant</p>
          </div>

          {/* Progress bar */}
          <WizardProgress currentStep={step} />

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
              />
            )}
            {step === 'channels' && (
              <StepChannels
                key="channels"
                shop={shop}
                onNext={goNext}
              />
            )}
            {step === 'context' && (
              <StepContext
                key="context"
                shop={shop}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'type_specific' && (
              <StepTypeSpecific
                key="type_specific"
                shop={shop}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'payments' && (
              <StepPayments
                key="payments"
                shop={shop}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'delivery' && (
              <StepDelivery
                key="delivery"
                shop={shop}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'demo' && (
              <StepDemo key="demo" shop={shop} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </UiverseGridBackground>
  );
}
