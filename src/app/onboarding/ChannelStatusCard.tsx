'use client';

import { Check, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  required?: boolean;
  connected: boolean;
  connectHref?: string;
  onConnectClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  optionalLabel?: string;
}

export default function ChannelStatusCard({
  icon,
  title,
  subtitle,
  required,
  connected,
  connectHref,
  onConnectClick,
  loading,
  disabled,
  optionalLabel,
}: Props) {
  const borderClass = connected
    ? 'border-green-500/60 bg-green-50/40'
    : required
    ? 'border-rust bg-apricot-wash/20'
    : 'border-dove/20 bg-white';

  const actionElement = loading ? (
    <Loader2 className="w-4 h-4 animate-spin text-ash" />
  ) : connected ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Connected
    </span>
  ) : connectHref ? (
    <a
      href={connectHref}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-inputs text-xs font-semibold transition-all ${
        disabled
          ? 'bg-fog text-ash cursor-not-allowed pointer-events-none'
          : required
          ? 'bg-ink text-white hover:bg-black'
          : 'bg-fog text-ink border border-dove/30 hover:bg-dove/15'
      }`}
    >
      Connect <ArrowRight className="w-3 h-3" />
    </a>
  ) : onConnectClick ? (
    <button
      onClick={onConnectClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-inputs text-xs font-semibold transition-all ${
        disabled
          ? 'bg-fog text-ash cursor-not-allowed'
          : 'bg-fog text-ink border border-dove/30 hover:bg-dove/15'
      }`}
    >
      Set up <ArrowRight className="w-3 h-3" />
    </button>
  ) : null;

  return (
    <div className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all ${borderClass}`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          connected ? 'bg-green-100 text-green-600' : 'bg-fog text-ink'
        }`}>
          {connected ? <Check className="w-5 h-5" /> : icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-ink">{title}</h3>
            {required && !connected && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-rust bg-apricot-wash px-1.5 py-0.5 rounded-full">
                Required
              </span>
            )}
            {!required && optionalLabel && !connected && (
              <span className="text-[9px] font-medium text-ash/70 bg-fog px-1.5 py-0.5 rounded-full border border-dove/20">
                {optionalLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-ash mt-0.5">{subtitle}</p>
        </div>
      </div>
      {actionElement}
    </div>
  );
}
