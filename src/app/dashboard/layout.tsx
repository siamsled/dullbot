import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-pure-white flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-pure-white">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

