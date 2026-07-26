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

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Retail details</h1>
        <p className="text-xs text-ash leading-relaxed">Let DullBot know how to handle bulk pricing questions from your customers.</p>
      </div>

      {/* Bulk pricing toggle */}
      <div className="bg-fog/50 rounded-cards border border-dove/15 p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-ink">Do you offer bulk / wholesale pricing?</h3>
            <p className="text-xs text-ash mt-0.5">If yes, the AI will reference your pricing policy when customers ask.</p>
          </div>
          <button
            type="button"
            onClick={() => setBulkEnabled(!bulkEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ml-4 ${bulkEnabled ? 'bg-rust' : 'bg-dove/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${bulkEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {bulkEnabled && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">Bulk Pricing Note <span className="text-ash font-normal">(optional but recommended)</span></label>
            <textarea
              rows={3}
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="e.g. 10+ pcs → 10% off, 50+ pcs → 18% off. Contact us for exact quotes."
              className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink resize-none"
            />
            <p className="text-[11px] text-ash mt-1.5 leading-relaxed">
              If left empty and a customer asks about bulk pricing, DullBot will escalate directly to your team — no guessing.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
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

  const inputCls = 'w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink';

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Restaurant details</h1>
        <p className="text-xs text-ash leading-relaxed">Add your location so customers can find you — DullBot will share these when someone asks for directions.</p>
      </div>

      <div className="bg-fog/50 rounded-cards border border-dove/15 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Physical Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 45 Gulshan Ave, Dhaka 1212"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Google Maps Link <span className="text-ash font-normal">(optional)</span></label>
          <input
            type="url"
            value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            placeholder="https://maps.google.com/…"
            className={inputCls}
          />
          <p className="text-[11px] text-ash mt-1.5">Paste the link from Google Maps Share → Copy link.</p>
        </div>
      </div>

      <p className="text-xs text-ash/70 bg-fog/50 rounded-inputs p-3 border border-dove/10 leading-relaxed">
        <strong className="text-ink">Table bookings:</strong> Set up your tables and availability from the Services page after launch — the booking system is ready for you there.
      </p>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
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
    <div className="flex flex-col gap-5">
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Service details</h1>
        <p className="text-xs text-ash leading-relaxed">DullBot handles appointment bookings, service inquiries, and staff scheduling for you.</p>
      </div>

      <div className="bg-fog/50 rounded-cards border border-dove/15 p-5">
        <h3 className="text-sm font-semibold text-ink mb-2">Booking system included</h3>
        <ul className="space-y-2">
          {[
            'Staff / resource availability management',
            'Customer appointment booking via Messenger or WhatsApp',
            'Automatic booking confirmations sent to customers',
            'Deposit collection support (optional)',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2 text-xs text-ash">
              <span className="w-4 h-4 rounded-full bg-apricot-wash text-rust flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">✓</span>
              {point}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ash/70 mt-3 leading-relaxed">
          Set up your services, staff, and availability after launch from the Services page.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={loading}
        className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

// ── Root switcher ─────────────────────────────────────────────────────────────
export default function StepTypeSpecific({ shop, onNext, onBack }: Props) {
  const businessType = shop.business_type || 'retail';

  return (
    <motion.div
      key="step-type-specific"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
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
