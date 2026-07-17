'use client';

import { useState, useTransition } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { Settings, MessageCircle, Link2, ShieldCheck, CreditCard, ChevronRight, Sparkles, Lock } from 'lucide-react';
import { disconnectFacebook, saveSettings } from './actions';

export default function SettingsClient({ 
  shop
}: { 
  shop: any; 
}) {
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  
  const [agentEnabled, setAgentEnabled] = useState(shop?.agent_enabled ?? true);
  const [confirmationTier, setConfirmationTier] = useState<'light' | 'otp_verified' | 'prepay_verified'>(
    shop?.confirmation_tier ?? 'light'
  );
  const [bkashNumber, setBkashNumber] = useState(shop?.bkash_number ?? '');

  const [paymentVerificationMethod, setPaymentVerificationMethod] = useState<'none' | 'merchant_api' | 'notification_app'>(
    shop?.payment_verification_method ?? 'none'
  );

  // bKash Merchant Config
  const [bkashAppKey, setBkashAppKey] = useState(shop?.bkashConfig?.app_key ?? '');
  const [bkashAppSecret, setBkashAppSecret] = useState(shop?.bkashConfig?.app_secret ?? '');
  const [bkashUsername, setBkashUsername] = useState(shop?.bkashConfig?.username ?? '');
  const [bkashPassword, setBkashPassword] = useState(shop?.bkashConfig?.password ?? '');
  const [bkashSandbox, setBkashSandbox] = useState(shop?.bkashConfig?.sandbox ?? true);

  // Nagad Merchant Config
  const [nagadMerchantId, setNagadMerchantId] = useState(shop?.nagadConfig?.merchant_id ?? '');
  const [nagadPrivateKey, setNagadPrivateKey] = useState(shop?.nagadConfig?.private_key ?? '');
  const [nagadPublicKey, setNagadPublicKey] = useState(shop?.nagadConfig?.public_key ?? '');

  // Courier Config
  const [courierProvider, setCourierProvider] = useState(shop?.courier_provider ?? 'none');
  const [courierClientId, setCourierClientId] = useState(shop?.courierConfig?.client_id ?? '');
  const [courierClientSecret, setCourierClientSecret] = useState(shop?.courierConfig?.client_secret ?? '');
  const [courierUsername, setCourierUsername] = useState(shop?.courierConfig?.username ?? '');
  const [courierPassword, setCourierPassword] = useState(shop?.courierConfig?.password ?? '');
  const [courierStoreId, setCourierStoreId] = useState(shop?.courierConfig?.store_id ?? '');
  const [courierApiKey, setCourierApiKey] = useState(shop?.courierConfig?.api_key ?? '');

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect Facebook?")) {
      startTransition(async () => {
        await disconnectFacebook();
      });
    }
  };

  const handleSave = () => {
    startSaveTransition(async () => {
      const res = await saveSettings(shop.id, {
        confirmationTier,
        bkashNumber,
        agentEnabled,
        paymentVerificationMethod,
        bkashConfig: {
          app_key: bkashAppKey,
          app_secret: bkashAppSecret,
          username: bkashUsername,
          password: bkashPassword,
          sandbox: bkashSandbox
        },
        nagadConfig: {
          merchant_id: nagadMerchantId,
          private_key: nagadPrivateKey,
          public_key: nagadPublicKey
        },
        courierProvider,
        courierConfig: {
          client_id: courierClientId,
          client_secret: courierClientSecret,
          username: courierUsername,
          password: courierPassword,
          store_id: courierStoreId,
          api_key: courierApiKey
        }
      });
      if (res.success) {
        alert("Settings saved successfully!");
      } else {
        alert(`Failed to save settings: ${res.error}`);
      }
    });
  };

  // variants for staggered animation
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Workspace Settings</h1>
        <p className="text-ash text-lg">Manage your DullBot integrations and AI configurations.</p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Connect Meta Integration Card (Wide Card) */}
        <motion.div variants={item} className="md:col-span-2 bg-white rounded-cards shadow-subtle p-8 flex flex-col justify-between overflow-hidden relative group border border-transparent hover:border-dove/20 transition-colors">
          <div className="relative z-10">
            <div className="h-12 w-12 bg-sky-wash text-blue-600 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-ink mb-3">Meta Integrations</h2>
            
            {shop?.meta_page_name ? (
              <div className="mt-6">
                <div className="flex items-center justify-between p-5 bg-fog rounded-inputs border border-dove/30">
                  <div className="flex items-center gap-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-ink">Connected Page</p>
                      <p className="text-sm text-ash">{shop.meta_page_name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="text-sm text-rust hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-ash text-sm mb-6 max-w-md leading-relaxed">
                  Connect your Facebook Page to allow DullBot to automatically reply to your customers on Messenger and Instagram.
                </p>
                <Link 
                  href="/api/auth/facebook/login"
                  className="inline-flex items-center px-6 py-3 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-colors"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect Facebook Page
                </Link>
              </div>
            )}
          </div>
          {/* Decorative background element */}
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-wash/50 rounded-full blur-3xl group-hover:bg-sky-wash transition-colors duration-700" />
        </motion.div>

        {/* AI Agent Toggle (Square Card) */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-8 flex flex-col relative overflow-hidden group border border-transparent hover:border-dove/20 transition-colors">
          <div className="h-12 w-12 bg-apricot-wash text-rust rounded-full flex items-center justify-center mb-6">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-ink mb-3">AI Autopilot</h2>
          <p className="text-ash text-sm mb-8 flex-grow leading-relaxed">Let DullBot handle customer queries automatically in the background while you focus on fulfillment.</p>
          
          <div className="flex items-center justify-between mt-auto p-4 bg-fog rounded-inputs">
            <span className="text-sm font-medium text-ink">Status: {agentEnabled && shop?.onboarding_complete ? 'Active' : 'Paused'}</span>
            {!shop?.onboarding_complete ? (
              <span className="text-xs text-rust font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Locked
              </span>
            ) : (
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={agentEnabled}
                  onChange={e => setAgentEnabled(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink"></div>
              </label>
            )}
          </div>
        </motion.div>



        {/* Verification Settings */}
        <motion.div variants={item} className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Confirmation Tier</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">Choose how rigorous you want order confirmations to be before packing.</p>
            <select 
              value={confirmationTier}
              onChange={e => setConfirmationTier(e.target.value as any)}
              className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all cursor-pointer"
            >
              <option value="light">Light (Address Only)</option>
              <option value="otp_verified">OTP Verified (SMS)</option>
              <option value="prepay_verified">Prepay Verified (bKash/Nagad)</option>
            </select>
          </div>

          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Prepay Number</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">The bKash or Nagad number for collecting customer pre-payments.</p>
            <input 
              type="text" 
              value={bkashNumber}
              onChange={e => setBkashNumber(e.target.value)}
              placeholder="e.g. 01712345678" 
              className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove/70" 
            />
          </div>

          {/* Payment Verification Section */}
          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Payment Verification Integration</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">Select how payment confirmations are processed. Real-time Merchant API verifies transactions on checkout.</p>
            <select 
              value={paymentVerificationMethod}
              onChange={e => setPaymentVerificationMethod(e.target.value as any)}
              className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all cursor-pointer mb-6"
            >
              <option value="none">None (Manual Checking)</option>
              <option value="merchant_api">Merchant API (bKash/Nagad)</option>
              <option value="notification_app">Android Notification Companion App</option>
            </select>

            {paymentVerificationMethod === 'merchant_api' && (
              <div className="space-y-6 border-t border-dove/10 pt-6">
                <div>
                  <h4 className="text-md font-semibold text-ink mb-4">bKash Merchant Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={bkashAppKey} onChange={e => setBkashAppKey(e.target.value)} placeholder="bKash App Key" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                    <input type="password" value={bkashAppSecret} onChange={e => setBkashAppSecret(e.target.value)} placeholder="bKash App Secret" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                    <input type="text" value={bkashUsername} onChange={e => setBkashUsername(e.target.value)} placeholder="bKash API Username" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                    <input type="password" value={bkashPassword} onChange={e => setBkashPassword(e.target.value)} placeholder="bKash API Password" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                  </div>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={bkashSandbox} onChange={e => setBkashSandbox(e.target.checked)} className="rounded text-ink focus:ring-ink" />
                    <span className="text-xs text-ash">Enable Sandbox Mode</span>
                  </label>
                </div>
                
                <div className="border-t border-dove/10 pt-6">
                  <h4 className="text-md font-semibold text-ink mb-4">Nagad Merchant Settings</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="text" value={nagadMerchantId} onChange={e => setNagadMerchantId(e.target.value)} placeholder="Nagad Merchant ID" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                    <textarea value={nagadPrivateKey} onChange={e => setNagadPrivateKey(e.target.value)} placeholder="Nagad Private Key (PEM format)" rows={3} className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                    <textarea value={nagadPublicKey} onChange={e => setNagadPublicKey(e.target.value)} placeholder="Nagad Public Key (PEM format)" rows={3} className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Courier Integration Section */}
          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Courier Integration</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">Configure courier delivery booking automatically on order confirmation.</p>
            <select 
              value={courierProvider}
              onChange={e => setCourierProvider(e.target.value)}
              className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all cursor-pointer mb-6"
            >
              <option value="none">None (Manual Booking)</option>
              <option value="pathao">Pathao Courier</option>
              <option value="steadfast">Steadfast</option>
              <option value="redx">RedX</option>
              <option value="paperfly">Paperfly</option>
              <option value="ecourier">eCourier</option>
            </select>

            {courierProvider !== 'none' && (
              <div className="space-y-6 border-t border-dove/10 pt-6">
                <h4 className="text-md font-semibold text-ink mb-2 capitalize">{courierProvider} Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(courierProvider === 'pathao' || courierProvider === 'ecourier') && (
                    <>
                      <input type="text" value={courierClientId} onChange={e => setCourierClientId(e.target.value)} placeholder="Client ID / API Key" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                      <input type="password" value={courierClientSecret} onChange={e => setCourierClientSecret(e.target.value)} placeholder="Client Secret / Secret Key" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                      <input type="text" value={courierUsername} onChange={e => setCourierUsername(e.target.value)} placeholder="Username" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                      <input type="password" value={courierPassword} onChange={e => setCourierPassword(e.target.value)} placeholder="Password" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                      <input type="text" value={courierStoreId} onChange={e => setCourierStoreId(e.target.value)} placeholder="Store / Warehouse ID" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full md:col-span-2" />
                    </>
                  )}
                  {(courierProvider === 'steadfast' || courierProvider === 'redx' || courierProvider === 'paperfly') && (
                    <>
                      <input type="text" value={courierApiKey} onChange={e => setCourierApiKey(e.target.value)} placeholder="API Key / Token" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full md:col-span-2" />
                      {courierProvider === 'paperfly' && (
                        <>
                          <input type="text" value={courierUsername} onChange={e => setCourierUsername(e.target.value)} placeholder="Paperfly Username" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                          <input type="password" value={courierPassword} onChange={e => setCourierPassword(e.target.value)} placeholder="Paperfly Password" className="bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm w-full" />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </motion.div>

      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 flex justify-end"
      >
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3.5 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
