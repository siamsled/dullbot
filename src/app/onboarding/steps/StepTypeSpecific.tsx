'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { saveBulkPricing, saveRestaurantLocation, saveOnboardingStep } from '../../dashboard/actions';

interface Props {
  shop: any;
  onNext: () => void;
  onBack: () => void;
}

// ── Retail / Wholesale variant ────────────────────────────────────────────────
function RetailBranch({ shop, onNext, onBack }: Props) {
  const [bulkEnabled, setBulkEnabled] = useState(shop.bulk_pricing_enabled ?? false);
  const [bulkNote, setBulkNote] = useState(shop.bulk_pricing_note || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await saveBulkPricing(shop.id, bulkEnabled, bulkEnabled ? bulkNote : null);
      if (res.success) onNext();
      else alert(res.error || 'Failed to save');
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 resize-none';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-slate-500 leading-relaxed">Let DullBot know how to handle bulk pricing questions from your customers.</p>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bulk pricing enabled</h3>
            <p className="text-xs text-slate-400 mt-0.5">If yes, the AI will reference your pricing policy.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={bulkEnabled}
            onClick={() => setBulkEnabled(!bulkEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ml-4 ${bulkEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${bulkEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {bulkEnabled && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bulk pricing rules</label>
            <textarea
              rows={3}
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="e.g. 10+ units → 10% off, 50+ units → 20% off"
              className={inputCls}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ── Restaurant variant ────────────────────────────────────────────────────────
function RestaurantBranch({ shop, onNext, onBack }: Props) {
  const [address, setAddress] = useState(shop.location_address || '');
  const [mapLink, setMapLink] = useState(shop.location_map_link || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await saveRestaurantLocation(shop.id, address, mapLink);
      if (res.success) onNext();
      else alert(res.error || 'Failed to save');
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-slate-500 leading-relaxed">Add your location so customers can find you and book tables.</p>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Physical Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 45 Gulshan Ave, Dhaka 1212" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Google Maps Link <span className="text-slate-400 font-normal">(optional)</span></label>
          <input type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="https://maps.google.com/…" className={inputCls} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ── Service variant ───────────────────────────────────────────────────────────
function ServiceBranch({ shop, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await saveOnboardingStep(shop.id, 'payments');
    onNext();
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-slate-500 leading-relaxed">DullBot handles appointment bookings, service inquiries, and staff scheduling for you.</p>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Booking system included</h3>
        <ul className="space-y-2">
          {[
            'Staff / resource availability management',
            'Customer appointment booking via Messenger or WhatsApp',
            'Automatic booking confirmations sent to customers',
            'Deposit collection support (optional)',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-500">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

export default function StepTypeSpecific({ shop, onNext, onBack }: Props) {
  const businessType = shop.business_type || 'retail';
  return (
    <motion.div
      key="step-type-specific"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {businessType === 'restaurant' ? (
        <RestaurantBranch shop={shop} onNext={onNext} onBack={onBack} />
      ) : businessType === 'service' ? (
        <ServiceBranch shop={shop} onNext={onNext} onBack={onBack} />
      ) : (
        <RetailBranch shop={shop} onNext={onNext} onBack={onBack} />
      )}
    </motion.div>
  );
}
