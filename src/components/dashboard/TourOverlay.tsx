'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

const TOUR_DISMISSED_KEY = 'dullbot_tour_dismissed';

type Step = {
  id: string;
  targetId: string;
  title: string;
  description: string;
  action: 'modal' | 'navigate';
  actionLabel: string;
  actionHref?: string;
};

const TOUR_STEPS: Step[] = [
  {
    id: 'context',
    targetId: 'nav-context',
    title: 'Start here',
    description: 'Tell DullBot what you sell and how to talk to your customers.',
    action: 'modal',
    actionLabel: 'Take me there',
  },
  {
    id: 'inventory',
    targetId: 'nav-inventory',
    title: 'Add products when ready',
    description: 'Add items so the AI can suggest them during customer chats.',
    action: 'navigate',
    actionLabel: 'Go to Inventory',
    actionHref: '/dashboard/inventory',
  },
];

export default function TourOverlay({
  shop,
  onDismiss,
  onOpenContextModal,
}: {
  shop: any;
  onDismiss: () => void;
  onOpenContextModal: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const stepsDone = shop?.onboarding_steps_done || [];
  const isContextDone = stepsDone.includes('context_form');

  // Check localStorage + context form on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    if (!dismissed && !isContextDone) {
      setIsVisible(true);
    }
  }, [isContextDone]);

  // Dismiss permanently when context form is saved
  useEffect(() => {
    if (isContextDone && isVisible) {
      handleDismiss();
    }
  }, [isContextDone]);

  const step = TOUR_STEPS[currentStepIndex];

  // Track the target element's position
  const updateRect = useCallback(() => {
    const el = document.getElementById(step.targetId);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step.targetId]);

  useEffect(() => {
    if (!isVisible) return;
    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener('resize', updateRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
    };
  }, [isVisible, updateRect]);

  const handleDismiss = () => {
    localStorage.setItem(TOUR_DISMISSED_KEY, '1');
    setIsVisible(false);
    onDismiss();
  };

  const handleAction = () => {
    if (step.action === 'modal') {
      onOpenContextModal();
      // Don't advance — let the modal save trigger the final dismiss
    } else if (step.action === 'navigate' && step.actionHref) {
      window.location.href = step.actionHref;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  if (!isVisible || !targetRect) return null;

  // The callout tooltip position: to the right of the target element
  const tooltipTop = targetRect.top + targetRect.height / 2 - 80;
  const tooltipLeft = targetRect.right + 16;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 pointer-events-none">
        {/* Dim only the area to the right of the sidebar.
            We do this by placing a transparent overlay over the full screen
            then cut out the sidebar width using a gradient / clip.
            Simple approach: dim only from the sidebar width. */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // This dims everything. We'll use a clip to leave the sidebar clear.
          className="absolute inset-0 pointer-events-auto"
          style={{
            // Leave the sidebar (first ~256px) fully transparent, dim the rest
            background:
              'linear-gradient(to right, transparent 256px, rgba(15,15,15,0.45) 256px)',
          }}
          onClick={handleDismiss}
        />

        {/* Spotlight ring around the target element — sits ABOVE the backdrop */}
        <motion.div
          key={`spotlight-${step.targetId}`}
          animate={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="absolute rounded-xl pointer-events-none z-50"
          style={{
            border: '2px solid #C0392B',
            boxShadow: '0 0 0 4px rgba(192,57,43,0.18), 0 0 16px 2px rgba(192,57,43,0.12)',
          }}
        />

        {/* Tooltip callout card */}
        <motion.div
          key={`tooltip-${step.id}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="absolute z-50 w-[280px] bg-white rounded-cards shadow-xl border border-dove/20 p-5 pointer-events-auto flex flex-col gap-3"
          style={{
            top: Math.max(8, tooltipTop),
            left: tooltipLeft,
          }}
        >
          {/* Triangle pointer on left edge */}
          <div
            className="absolute -left-2 top-8 w-4 h-4 bg-white border-l border-b border-dove/20 rotate-45"
            style={{ transform: 'rotate(45deg)' }}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-serif font-semibold text-ink text-base leading-tight">
              {step.title}
            </h4>
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 text-ash hover:text-ink transition-colors rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-ash leading-relaxed">{step.description}</p>

          {/* Step dots */}
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === currentStepIndex ? 'w-4 bg-rust' : 'w-1.5 bg-dove/30'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNext}
              className="flex-1 px-3 py-2 text-xs font-medium text-ash bg-fog border border-dove/20 rounded-buttons hover:bg-dove/10 hover:text-ink transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleAction}
              className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-ink rounded-buttons hover:bg-black transition-colors flex items-center justify-center gap-1.5"
            >
              {step.actionLabel} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
