'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Truck, Check, Package } from 'lucide-react';
import { saveCourierChoice } from '../../dashboard/actions';

const COURIERS = [
  { id: 'steadfast', name: 'Steadfast Courier', desc: 'Nationwide · fast', fields: ['api_key', 'secret_key'], fieldLabels: { api_key: 'API Key', secret_key: 'Secret Key' } },
  { id: 'pathao', name: 'Pathao Courier', desc: 'Dhaka + major cities', fields: ['client_id', 'client_secret', 'username', 'password'], fieldLabels: { client_id: 'Client ID', client_secret: 'Client Secret', username: 'Username', password: 'Password' } },
  { id: 'redx', name: 'RedX', desc: 'Nationwide', fields: ['api_key'], fieldLabels: { api_key: 'API Key' } },
  { id: 'ecourier', name: 'eCourier', desc: 'Reliable inter-city', fields: ['api_key', 'api_secret', 'username', 'password'], fieldLabels: { api_key: 'API Key', api_secret: 'API Secret', username: 'Username', password: 'Password' } },
  { id: 'paperfly', name: 'Paperfly', desc: '500+ locations', fields: ['store_id', 'api_key'], fieldLabels: { store_id: 'Store ID', api_key: 'API Key' } },
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
  const [hasSelection, setHasSelection] = useState(!!shop.courier_provider);

  const selectedCourier = COURIERS.find((c) => c.id === selected);

  const selectCourier = (id: string) => {
    setSelected(id);
    setCredentials({});
    setHasSelection(true);
  };

  const selectManual = () => {
    setSelected('manual');
    setCredentials({});
    setHasSelection(true);
  };

  const handleContinue = async () => {
    if (!hasSelection) return;
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

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400';

  return (
    <motion.div
      key="step-delivery"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
        Which courier handles your deliveries?
      </h1>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed">
        Connect a courier for automated shipment booking, or choose manual fulfillment.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {COURIERS.map((c) => {
          const isSelected = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCourier(c.id)}
              className={`p-4 rounded-xl border-2 text-left flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-slate-900">{c.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center self-end">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}

        {/* Manual */}
        <button
          type="button"
          onClick={selectManual}
          className={`p-4 rounded-xl border-2 text-left flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 ${
            selected === 'manual'
              ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            selected === 'manual' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-slate-900">Manual / Own Delivery</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">You handle shipping</p>
          </div>
          {selected === 'manual' && (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center self-end">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      </div>

      {/* Credentials for selected courier */}
      <AnimatePresence>
        {selectedCourier && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs text-slate-500">Enter your {selectedCourier.name} API credentials. You can also do this later from Settings.</p>
              <div className="grid grid-cols-2 gap-3">
                {selectedCourier.fields.map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{(selectedCourier.fieldLabels as any)[field]}</label>
                    <input
                      type={field.includes('secret') || field.includes('password') || field.includes('key') ? 'password' : 'text'}
                      value={credentials[field] || ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="Paste your API key"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasSelection || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
