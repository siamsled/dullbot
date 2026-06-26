import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function SettingsPage() {
  const shopSlug = 'dull-store';
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_name')
    .eq('slug', shopSlug)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Agent Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable AI Agent</label>
                <p className="text-xs text-gray-500">Let DullBot reply to customers automatically.</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded" defaultChecked />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Tier</label>
              <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-black focus:border-black sm:text-sm rounded-md">
                <option value="light">Light (Address Only)</option>
                <option value="otp_verified">OTP Verified (SMS)</option>
                <option value="prepay_verified">Prepay Verified (bKash/Nagad)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">bKash Number</label>
              <input type="text" placeholder="e.g. 017..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm" />
              <p className="mt-1 text-xs text-gray-500">The number customers should send money to for prepay verification.</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Meta Integration (Messenger & Instagram)</h2>
          <div className="space-y-4">
            {shop?.meta_page_name ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Connected Page</p>
                  <p className="text-sm text-gray-500">{shop.meta_page_name}</p>
                </div>
                <button className="text-sm text-red-600 hover:text-red-700 font-medium">Disconnect</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Connect your Facebook Page to allow DullBot to automatically reply to your customers on Messenger and Instagram.
                </p>
                <Link 
                  href="/api/auth/facebook/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                  Connect Facebook Page
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
