'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquareText, Package, Settings, Sparkles, Box } from 'lucide-react';

const navItems = [
  { name: 'Live Inbox', href: '/dashboard/inbox', icon: MessageSquareText },
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Box },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Playground', href: '/dashboard/sandbox', icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-fog border-r border-dove/20 hidden md:flex md:flex-col shrink-0">
      <div className="h-20 flex items-center px-8 border-b border-dove/10">
        <span className="text-2xl font-serif font-medium tracking-tight text-ink">DullBot</span>
      </div>
      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          // Exact match for /dashboard, prefix match for others
          const isActive = item.href === '/dashboard' 
            ? pathname === item.href 
            : pathname.startsWith(item.href);
            
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-inputs text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-white text-ink shadow-subtle border border-dove/10' 
                  : 'text-ash hover:text-ink hover:bg-dove/10 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-ink' : 'text-graphite'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-dove/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-ink text-pure-white flex items-center justify-center text-xs font-bold shadow-subtle">
            DS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">Dull Store</span>
            <span className="text-xs text-ash flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
