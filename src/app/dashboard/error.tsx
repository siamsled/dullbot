'use client';

import { useEffect } from 'react';
import { RotateCw, ArrowLeft, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error captured:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] p-6 bg-[#fbfbfa] dark:bg-[#09090b]">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-lg text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
          <LayoutDashboard className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Dashboard View Couldn&apos;t Load
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            A temporary connection issue occurred while loading this view. Your store data and settings remain safe.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              Reference: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}
