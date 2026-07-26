'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Truck, Check, SkipForward } from 'lucide-react';
import { saveCourierChoice } from '../../dashboard/actions';

const COURIERS = [
  {
    id: 'steadfast',
    name: 'Steadfast',
    desc: 'Automated parcel booking for Dhaka and nationwide delivery.',
    fields: ['api_key', 'secret_key'],
    fieldLabels: { api_key: 'API Key', secret_key: 'Secret Key' },
  },
  {
    id: 'pathao',
    name: 'Pathao Courier',
    desc: 'Fast urban and outstation deliveries via Pathao.',
    fields: ['client_id', 'client_secret', 'username', 'password'],
    fieldLabels: { client_id: 'Client ID', client_secret: 'Client Secret', username: 'Username', password: 'Password' },
  },
  {
    id: 'redx',
    name: 'RedX',
    desc: 'Last-mile delivery across Bangladesh with RedX.',
    fields: ['api_key'],
    fieldLabels: { api_key: 'API Key' },
  },
  {
    id: 'ecourier',
    name: 'eCourier',
    desc: 'Enterprise logistics and e-commerce delivery with eCourier.',
    fields: ['api_key', 'api_secret', 'username', 'password'],
    fieldLabels: { api_key: 'API Key', api_secret: 'API Secret', username: 'Username', password: 'Password' },
  },
  {
    id: 'paperfly',
    name: 'Paperfly',
    desc: 'Nationwide parcel delivery with Paperfly tracking.',
    fields: ['store_id', 'api_key'],
    fieldLabels: { store_id: 'Store ID', api_key: 'API Key' },
  },
];

interface Props {
  shop: any;
  onNext: () => void;
  onBack: () => void;
}

export default function StepDelivery({ shop, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string>(shop.courier_provider || '');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedCourier = COURIERS.find((c) => c.id === selected);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const res = await saveCourierChoice(
        shop.id,
        selected || 'manual',
        Object.keys(credentials).length > 0 ? credentials : undefined
      );
      if (res.success) onNext();
      else alert(res.error || 'Failed to save');
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink';

  return (
    <motion.div
      key="step-delivery"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="flex flex-col"
    >
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Delivery courier</h1>
      <p className="text-xs text-ash mb-6 leading-relaxed">Connect a courier for automated shipment booking, or skip for manual fulfillment.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {COURIERS.map((c) => {
          const isSelected = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelected(c.id); setCredentials({}); }}
              className={`p-4 rounded-cards border-2 text-left flex items-center gap-3 transition-all ${
                isSelected ? 'border-rust bg-apricot-wash/30 shadow-subtle' : 'border-dove/20 bg-white hover:border-ink/30 hover:bg-fog/60'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-rust' : 'bg-fog'}`}>
                <Truck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-ink'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs text-ink">{c.name}</h3>
                <p className="text-[11px] text-ash truncate">{c.desc}</p>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-rust shrink-0" />}
            </button>
          );
        })}

        {/* Manual / Skip */}
        <button
          type="button"
          onClick={() => { setSelected(''); setCredentials({}); }}
          className={`p-4 rounded-cards border-2 text-left flex items-center gap-3 transition-all sm:col-span-2 ${
            selected === '' ? 'border-rust bg-apricot-wash/30 shadow-subtle' : 'border-dove/20 bg-white hover:border-ink/30 hover:bg-fog/60'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected === '' ? 'bg-rust' : 'bg-fog'}`}>
            <SkipForward className={`w-4 h-4 ${selected === '' ? 'text-white' : 'text-ash'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-xs text-ink">Manual Fulfillment</h3>
            <p className="text-[11px] text-ash">I&apos;ll handle shipping and delivery tracking myself, or set up a courier later.</p>
          </div>
          {selected === '' && <Check className="w-3.5 h-3.5 text-rust shrink-0" />}
        </button>
      </div>

      {/* Credential fields for selected courier */}
      <AnimatePresence>
        {selectedCourier && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 bg-fog/60 rounded-inputs border border-dove/15 space-y-3">
              <p className="text-[11px] text-ash">Enter your {selectedCourier.name} API credentials. You can also do this later from Settings.</p>
              <div className="grid grid-cols-2 gap-3">
                {selectedCourier.fields.map((field) => (
                  <div key={field}>
                    <label className="block text-[11px] font-semibold text-ink mb-1">{(selectedCourier.fieldLabels as any)[field]}</label>
                    <input
                      type={field.includes('secret') || field.includes('password') || field.includes('key') ? 'password' : 'text'}
                      value={credentials[field] || ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleContinue}
        disabled={loading}
        className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
    </motion.div>
  );
}
