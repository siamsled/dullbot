import React from 'react';

export function SteadfastLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 68L48 16H84L58 68H22Z" fill="#00B074" />
      <path d="M48 44L72 16H84L60 44H48Z" fill="#34D399" />
      <path d="M12 84L36 36H56L32 84H12Z" fill="#059669" />
    </svg>
  );
}

export function PathaoLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 54C15 32 30 14 54 14C74 14 88 28 88 46C88 62 76 74 60 74H42L26 90V74H23C18 74 15 68 15 54Z" fill="#E2133A" />
      <path d="M52 28C40 28 30 36 30 48C30 58 38 64 52 64C64 64 72 58 72 48C72 38 64 28 52 28Z" fill="#FFFFFF" />
      <path d="M52 38C46 38 42 42 42 48C42 54 46 56 52 56C58 56 62 54 62 48C62 42 58 38 52 38Z" fill="#E2133A" />
    </svg>
  );
}

export function RedXLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 16H52C68 16 78 24 78 40C78 52 70 60 58 62L82 88H58L36 62H28V88H12V16ZM28 46H50C56 46 60 43 60 40C60 37 56 32 50 32H28V46Z" fill="#E50914" />
      <path d="M68 16L88 36L80 44L60 24L68 16Z" fill="#FF4D4D" />
    </svg>
  );
}

export function ECourierLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" fill="#00ACC1" />
      <path d="M58 68H40V60H58V68ZM68 52H36V44C36 35 43 28 52 28C61 28 68 35 68 44V52ZM44 44H60C60 39.5 56.4 36 52 36C47.6 36 44 39.5 44 44Z" fill="#FFFFFF" />
      <path d="M72 26L86 12M82 36H94" stroke="#00E5FF" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function PaperflyLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 48L88 12L52 88L40 56L10 48Z" fill="#FF6D00" />
      <path d="M40 56L88 12L52 88L40 56Z" fill="#FFA000" />
      <path d="M40 56V80L52 68" fill="#D84315" />
    </svg>
  );
}

export function CourierLogo({ provider, className = 'w-5 h-5' }: { provider: string; className?: string }) {
  const p = (provider || '').toLowerCase();
  if (p.includes('pathao')) return <PathaoLogo className={className} />;
  if (p.includes('steadfast')) return <SteadfastLogo className={className} />;
  if (p.includes('redx')) return <RedXLogo className={className} />;
  if (p.includes('paperfly')) return <PaperflyLogo className={className} />;
  if (p.includes('ecourier') || p.includes('e-courier')) return <ECourierLogo className={className} />;
  
  return (
    <div className={`rounded-md bg-white border border-dove/20 text-ink flex items-center justify-center font-bold text-xs ${className}`}>
      {provider?.[0] || 'C'}
    </div>
  );
}
