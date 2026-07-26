import { Suspense } from 'react';
import SandboxClient from './SandboxClient';

export const dynamic = 'force-dynamic';

export default function SandboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ash">Loading Sandbox...</div>}>
      <SandboxClient />
    </Suspense>
  );
}
