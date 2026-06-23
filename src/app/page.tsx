import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white selection:bg-apricot-wash selection:text-ink">
      {/* Soft warm radial gradient glow (apricot wash) for the hero context */}
      <div 
        className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--color-apricot-wash) 0%, transparent 70%)"
        }}
      />

      {/* Global Header / Navigation Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-dove/20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="font-serif text-2xl tracking-tight text-ink font-light">
              dull<span className="font-normal font-sans text-lg text-ash">bot.</span>
            </span>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-15px font-medium text-ash hover:text-ink transition-colors">Features</Link>
              <Link href="#pricing" className="text-15px font-medium text-ash hover:text-ink transition-colors">Pricing</Link>
              <Link href="/dashboard/usage" className="text-15px font-medium text-ash hover:text-ink transition-colors">Platform Status</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/settings" 
              className="text-[15px] font-medium text-ash hover:text-ink transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="rounded-full bg-ink px-5 py-2 text-[15px] font-medium text-pure-white transition-colors hover:bg-ash/90"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-[1200px] px-6 pt-24 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-apricot-wash px-3 py-1 text-xs font-semibold text-rust uppercase tracking-wider">
          Phase 1-5 Complete
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl md:text-7xl font-light leading-[1.1] tracking-tight text-ink">
          The deadpan AI sales agent that actually closes orders.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl leading-relaxed text-ash">
          No cheerful greetings. No exclamation marks. Just a competent, slightly bored assistant automating your sales, caching identical queries, and validating payments 24/7 on autopilot.
        </p>

        <div className="mt-10 flex items-center justify-center gap-6">
          <Link 
            href="/dashboard" 
            className="rounded-full bg-ink px-6 py-3 text-[16px] font-semibold text-pure-white transition-all hover:bg-ink/90 hover:scale-[1.02]"
          >
            Start Free Pilot
          </Link>
          <Link 
            href="/dashboard/settings" 
            className="text-[16px] font-semibold text-ink hover:underline"
          >
            Configure Channels &rarr;
          </Link>
        </div>

        {/* Floating Cards Showcase (Grid layout for responsive stability) */}
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {/* Card 1: Chat/Pipeline flow (Sky Wash) */}
          <div className="rounded-cards bg-sky-wash p-6 text-left shadow-subtle border border-dove/10 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-ink/60 uppercase tracking-widest">Mock Customer Chat</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="space-y-4">
                <div className="bg-white/80 rounded-xl p-3 max-w-[85%] text-[14px]">
                  <p className="text-graphite font-medium">Customer (01712...)</p>
                  <p className="text-ink mt-0.5">Is the leather jacket available in size L? How much?</p>
                </div>
                <div className="bg-ink text-white rounded-xl p-3 max-w-[85%] ml-auto text-[14px]">
                  <p className="text-dove font-medium">DullBot (AI Agent)</p>
                  <p className="text-white mt-0.5">Yes. Price is 4,500 BDT. Send delivery details to proceed. We don&apos;t do negotiations.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between">
              <span className="text-[13px] text-ink/70">Response Cache: <strong className="text-rust">Hit</strong></span>
              <span className="text-[13px] text-ink/70">Gemini Cost: <strong className="text-emerald-700">0.00 BDT</strong></span>
            </div>
          </div>

          {/* Card 2: Interactive Inventory Widget */}
          <div className="rounded-cards bg-white p-6 text-left shadow-subtle border border-dove/20 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-graphite uppercase tracking-widest">Active Inventory</span>
                <span className="text-xs text-rust font-medium bg-apricot-wash/50 px-2 py-0.5 rounded">Sync Active</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-dove/10 pb-2">
                  <div>
                    <h4 className="text-15px font-semibold text-ink">Premium Leather Jacket</h4>
                    <p className="text-[13px] text-graphite">Size: L / Color: Black</p>
                  </div>
                  <span className="font-serif text-16px font-normal text-rust">4,500 BDT</span>
                </div>
                <div className="flex items-center justify-between border-b border-dove/10 pb-2">
                  <div>
                    <h4 className="text-15px font-semibold text-ink">Minimalist Chelsea Boots</h4>
                    <p className="text-[13px] text-graphite">Size: 42 / Color: Tan</p>
                  </div>
                  <span className="font-serif text-16px font-normal text-rust">5,800 BDT</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-graphite">
              <span>Updated 3 mins ago</span>
              <Link href="/dashboard/inventory" className="text-ink font-semibold hover:underline">Manage Products &rarr;</Link>
            </div>
          </div>

          {/* Card 3: Payment Verification & Stats */}
          <div className="rounded-cards bg-apricot-wash p-6 text-left shadow-subtle border border-dove/10 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-rust uppercase tracking-widest">Payment Matcher</span>
                <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded text-ink font-semibold">bKash / Nagad</span>
              </div>
              <div className="space-y-3">
                <div className="bg-white/90 rounded-xl p-3">
                  <span className="text-[11px] text-graphite font-semibold block uppercase">Incoming SMS (bKash)</span>
                  <p className="text-[13px] font-mono text-ink mt-1 break-all">
                    TxnID: 9K88F7T654 Amount: Tk.150.00 Ref: DB-8472 Received.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 text-[13px]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Order #8472 verified automatically</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-rust/10 flex items-center justify-between">
              <span className="text-[13px] text-ink">Tier Status: <strong className="text-rust">Prepay Mode</strong></span>
              <span className="text-xs bg-white text-ink px-2 py-1 rounded-full font-semibold">100% Match Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="bg-fog py-24 border-t border-b border-dove/10">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-light tracking-tight text-ink">
              Protecting your margins on the Google Gemini Free-Tier.
            </h2>
            <p className="mt-4 text-ash leading-relaxed">
              We engineered DullBot with extreme cost constraints in mind. It uses aggressive multi-tiered caching so you don&apos;t pay a single taka in API fees.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="bg-white rounded-cards p-8 border border-dove/20 shadow-subtle">
              <h3 className="text-lg font-semibold text-ink">1. Semantic Caching</h3>
              <p className="mt-3 text-[15px] text-ash leading-relaxed">
                Before sending messages to Gemini, we check a localized database cache of common questions. Zero cost. Instant response.
              </p>
            </div>
            <div className="bg-white rounded-cards p-8 border border-dove/20 shadow-subtle">
              <h3 className="text-lg font-semibold text-ink">2. SMS Hook Parser</h3>
              <p className="mt-3 text-[15px] text-ash leading-relaxed">
                Webhook intercepts incoming forwarded SMS receipts from bKash and Nagad. Correlates transactions to orders automatically.
              </p>
            </div>
            <div className="bg-white rounded-cards p-8 border border-dove/20 shadow-subtle">
              <h3 className="text-lg font-semibold text-ink">3. Shared Spam Registry</h3>
              <p className="mt-3 text-[15px] text-ash leading-relaxed">
                Flags serial returnees and fraudulent numbers before checkout. Benefit from network effects without sharing confidential customer logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 text-center text-xs text-graphite border-t border-dove/10">
        <div className="mx-auto max-w-[1200px] px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} DullStudio. All rights reserved. Operating with zero exclamation marks.</p>
          <div className="flex gap-6">
            <Link href="/dashboard/settings" className="hover:text-ink">Settings</Link>
            <Link href="/dashboard/usage" className="hover:text-ink">Usage Metrics</Link>
            <Link href="/dashboard/inventory" className="hover:text-ink">Inventory Manager</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

