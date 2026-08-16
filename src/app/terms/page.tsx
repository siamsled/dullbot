import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | DullBot',
  description: 'Terms of Service for DullBot e-commerce AI assistant platform.',
};

export default function TermsPage() {
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
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold tracking-tight">DullBot Terms of Service</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Last Updated: January 1, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif">Terms of Service</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            By integrating DullBot with your Facebook Page, Instagram account, or WhatsApp Business account, you agree to comply with these terms.
          </p>
        </div>

        <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">1. Service Description</h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            DullBot provides automated AI conversational commerce, product inventory querying, comment replies, and payment verification tools for e-commerce merchants.
          </p>
        </section>

        <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">2. Acceptable Use & Meta Policies</h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Merchants using DullBot must adhere to Meta&apos;s Commercial Terms, Platform Terms, and Developer Policies. Automated messaging and comment interactions must not be used for unsolicited spam, harassment, or unlawful marketing.
          </p>
        </section>
      </main>
    </div>
  );
}
