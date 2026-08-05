'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { saveBulkPricing, saveRestaurantLocation, saveOnboardingStep } from '../../dashboard/actions';

interface Props { shop: any; onNext: () => void; onBack: () => void; }

function RetailBranch({ shop, onNext, onBack }: Props) {
  const [bulkEnabled, setBulkEnabled] = useState(shop.bulk_pricing_enabled ?? false);
  const [bulkNote, setBulkNote] = useState(shop.bulk_pricing_note || '');
  const [loading, setLoading] = useState(false);
  const handleSave = async () => { setLoading(true); try { const r = await saveBulkPricing(shop.id, bulkEnabled, bulkEnabled ? bulkNote : null); if (r.success) onNext(); else alert(r.error); } catch (e: any) { alert(e.message); } setLoading(false); };
  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30 resize-none';
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">Let DullBot know how to handle bulk pricing questions from your customers.</p>
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-white">Bulk pricing enabled</h3><p className="text-xs text-white/40 mt-0.5">AI will reference your pricing policy.</p></div>
            <button type="button" role="switch" aria-checked={bulkEnabled} onClick={() => setBulkEnabled(!bulkEnabled)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${bulkEnabled ? 'bg-white' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black shadow transition-transform duration-200 ${bulkEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {bulkEnabled && (
            <div className="mt-4"><label className="block text-xs font-semibold text-white/80 mb-1.5">Bulk pricing rules</label>
              <textarea rows={3} value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="e.g. 10+ units → 10% off, 50+ units → 20% off" className={inputCls} /></div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleSave} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function RestaurantBranch({ shop, onNext, onBack }: Props) {
  const [address, setAddress] = useState(shop.location_address || '');
  const [mapLink, setMapLink] = useState(shop.location_map_link || '');
  const [loading, setLoading] = useState(false);
  const handleSave = async () => { setLoading(true); try { const r = await saveRestaurantLocation(shop.id, address, mapLink); if (r.success) onNext(); else alert(r.error); } catch (e: any) { alert(e.message); } setLoading(false); };
  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">Add your location so customers can find you and book tables.</p>
        <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
          <div><label className="block text-sm font-semibold text-white/80 mb-1.5">Physical Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 45 Gulshan Ave, Dhaka 1212" className={inputCls} /></div>
          <div><label className="block text-sm font-semibold text-white/80 mb-1.5">Google Maps Link <span className="text-white/40 font-normal">(optional)</span></label><input type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="https://maps.google.com/…" className={inputCls} /></div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleSave} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function ServiceBranch({ shop, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const handleContinue = async () => { setLoading(true); await saveOnboardingStep(shop.id, 'payments'); onNext(); setLoading(false); };
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">A few details specific to your industry.</h1>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">DullBot handles appointment bookings, service inquiries, and staff scheduling for you.</p>
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Booking system included</h3>
          <ul className="space-y-2">{['Staff / resource availability management', 'Customer appointment booking via Messenger or WhatsApp', 'Automatic booking confirmations sent to customers', 'Deposit collection support (optional)'].map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-white/60"><span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-white/20">✓</span>{point}</li>
          ))}</ul>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

export default function StepTypeSpecific({ shop, onNext, onBack }: Props) {
  const businessType = shop.business_type || 'retail';
  return (
    <motion.div key="step-type-specific" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full">
      {businessType === 'restaurant' ? <RestaurantBranch shop={shop} onNext={onNext} onBack={onBack} />
        : businessType === 'service' ? <ServiceBranch shop={shop} onNext={onNext} onBack={onBack} />
        : <RetailBranch shop={shop} onNext={onNext} onBack={onBack} />}
    </motion.div>
  );
}
