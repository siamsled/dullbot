'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight, 
  Check,
  Globe,
  Smartphone
} from 'lucide-react';
import UiverseGridBackground from '@/components/ui/UiverseGridBackground';
import { generateProfileFromFacebook } from '../dashboard/actions';
import UiverseLoader from '@/components/ui/UiverseLoader';

export default function OnboardingClient({ shop }: { shop: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState<'connect' | 'analyzing' | 'review'>('connect');
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedProfile, setGeneratedProfile] = useState<any>(null);

  useEffect(() => {
    const currentStep = searchParams.get('step');
    const err = searchParams.get('error');
    
    if (err) {
      setErrorMsg('Could not find any Facebook Pages to connect.');
    }

    if (currentStep === 'ai_analysis' && step === 'connect') {
      setStep('analyzing');
      runAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const runAnalysis = async () => {
    try {
      const res = await generateProfileFromFacebook(shop.id);
      if (res.success) {
        setGeneratedProfile(res.profile);
        setStep('review');
      } else {
        setErrorMsg(res.error || 'Failed to analyze page.');
        setStep('connect');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred.');
      setStep('connect');
    }
  };

  const handleLaunch = () => {
    router.push('/dashboard');
  };

  return (
    <UiverseGridBackground>
      <div className="min-h-screen flex items-center justify-center p-6 text-ink selection:bg-rust/20 relative z-10">
        <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-12 h-12 bg-ink text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          >
            <Sparkles size={24} className="text-apricot" />
          </motion.div>
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight mb-2"
          >
            {step === 'connect' && "Let AI build your workspace"}
            {step === 'analyzing' && "Learning your business..."}
            {step === 'review' && "Workspace Ready!"}
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-ash text-sm"
          >
            {step === 'connect' && "Connect your primary social channel. DullBot will autonomously learn your business context and configure everything for you."}
            {step === 'analyzing' && "Reading your Facebook Page to extract category, hours, and tone."}
            {step === 'review' && "Review what DullBot learned. You can edit this later in Settings."}
          </motion.p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <a
                href={`/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`}
                className="group w-full flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-ink">Connect Facebook Page</h3>
                    <p className="text-xs text-ash">Best for retail & e-commerce</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-ash group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </a>

              <div className="w-full flex items-center justify-between p-5 bg-fog/50 rounded-2xl border-2 border-transparent opacity-75 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-ink">Connect Instagram</h3>
                    <p className="text-xs text-ash">Coming soon</p>
                  </div>
                </div>
              </div>

              <div className="w-full flex items-center justify-between p-5 bg-fog/50 rounded-2xl border-2 border-transparent opacity-75 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                    <Smartphone size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-ink">Connect WhatsApp</h3>
                    <p className="text-xs text-ash">Coming soon</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <UiverseLoader />
              <p className="mt-8 text-sm font-semibold text-ink animate-pulse">
                Analyzing Page Data...
              </p>
            </motion.div>
          )}

          {step === 'review' && generatedProfile && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border border-dove/20"
            >
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-ash mb-1">Business Name</p>
                  <p className="font-semibold text-ink">{generatedProfile.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-ash mb-1">Category</p>
                  <p className="font-semibold text-ink">{generatedProfile.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-ash mb-1">AI Tone</p>
                  <p className="font-semibold text-ink capitalize">{generatedProfile.tone_template}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-ash mb-1">Overview</p>
                  <p className="text-sm text-ash leading-relaxed">{generatedProfile.business_overview}</p>
                </div>
              </div>

              <div className="mt-10">
                <button
                  onClick={handleLaunch}
                  className="w-full bg-ink text-white rounded-xl py-4 font-semibold text-sm hover:bg-ink/90 transition-all flex items-center justify-center gap-2 group"
                >
                  <Check size={18} className="text-apricot" />
                  Launch Workspace
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </UiverseGridBackground>
  );
}
