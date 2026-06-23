export default function UsagePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">API Usage</h1>
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-lg">
        <h3 className="text-sm font-medium text-gray-500">Gemini Calls (Current Month)</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">0 / 1,500</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-black h-2.5 rounded-full" style={{ width: '0%' }}></div>
        </div>
        <p className="mt-4 text-xs text-gray-500">Usage resets at the beginning of each calendar month. We monitor this to stay within Gemini Free Tier limits.</p>
      </div>
    </div>
  );
}
