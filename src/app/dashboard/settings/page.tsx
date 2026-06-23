export default function SettingsPage() {
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

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Gemini API Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key Mode</label>
              <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-black focus:border-black sm:text-sm rounded-md">
                <option value="shared_pool">Shared Pool (Free Tier)</option>
                <option value="byo_key">Bring Your Own Key</option>
              </select>
              <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                This uses your own Google account and is subject to Google's free-tier terms, including that Google may use your prompts to improve their models.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
