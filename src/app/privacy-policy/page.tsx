import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, FileText, Globe } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | DullBot',
  description: 'Privacy policy and data handling practices for DullBot e-commerce AI assistant.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] text-[#1a1a1e] dark:text-[#f0f0f4] selection:bg-emerald-500/20 selection:text-emerald-700">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-black/60 border-b border-zinc-200/60 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to DullBot</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold tracking-tight">DullBot Privacy Policy</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Effective Date: January 1, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif">Privacy Policy</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            DullBot (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is dedicated to safeguarding your privacy and ensuring transparency in how customer and store data is handled across Facebook Messenger, Instagram DMs, and WhatsApp.
          </p>
        </div>

        <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <FileText className="w-4 h-4 text-emerald-600" />
            1. Information We Collect
          </h2>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>To provide automated customer assistance, order fulfillment, and social media moderation, we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Public Profile Information:</strong> Customer name, user ID (PSID), and profile photo provided by Meta APIs.</li>
              <li><strong>Messages & Comments:</strong> Text, images, and audio notes sent by customers to connected Facebook Pages, Instagram accounts, and WhatsApp numbers.</li>
              <li><strong>Order & Transaction Data:</strong> Delivery address, phone number, payment transaction IDs, and order line items.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <Globe className="w-4 h-4 text-emerald-600" />
            2. How We Use Meta Data
          </h2>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>Data obtained via Meta APIs is used strictly to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generate intelligent, real-time AI responses to customer product inquiries.</li>
              <li>Automatically reply to public comments on merchant posts and dispatch private inbox follow-ups when requested.</li>
              <li>Detect and filter spam, toxic language, and abusive comments on store posts.</li>
              <li>Verify mobile banking payment screenshots and confirm delivery details.</li>
            </ul>
            <p className="mt-2 font-medium text-zinc-800 dark:text-zinc-200">
              We never sell, rent, or monetize your customer data or conversation logs to third-party advertising networks.
            </p>
          </div>
        </section>

        <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <Lock className="w-4 h-4 text-emerald-600" />
            3. Data Retention & Deletion
          </h2>
          <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p>
              Merchants can request complete deletion of their account data, message history, and connected page credentials at any time directly through the DullBot dashboard or by contacting us at <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-emerald-600">support@dullbot.com</code>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
