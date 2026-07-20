'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquareText, Package, Settings, Sparkles, Box, Zap, LogOut, Sliders, BarChart, AlertTriangle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function Sidebar({ initialShop }: { initialShop?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [shop, setShop] = useState<any>(initialShop || null);

  useEffect(() => {
    if (initialShop) {
      setShop(initialShop);
    } else {
      const fetchShop = async () => {
        const { data: userRes } = await supabaseBrowser.auth.getUser();
        if (userRes?.user) {
          const { data: shopRes } = await supabaseBrowser
            .from('shops')
            .select('*')
            .eq('owner_id', userRes.user.id)
            .single();
          if (shopRes) {
            setShop(shopRes);
          }
        }
      };
      fetchShop();
    }

    // Subscribe to changes to update sidebar instantly when they go live
    const channel = supabaseBrowser
      .channel('sidebar-shop-onboarding')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shops' },
        (payload) => {
          if (shop && payload.new && (payload.new as any).id === shop.id) {
            setShop(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [initialShop, shop?.id]);

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.push('/login');
  };

  const businessType = shop?.business_type || 'retail';

  // Build nav items dynamically
  const baseItems = [
    { name: 'Live Inbox', href: '/dashboard/inbox', icon: MessageSquareText, id: 'nav-inbox' },
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, id: 'nav-overview' },
    { name: 'Orders', href: '/dashboard/orders', icon: Package, id: 'nav-orders' },
  ];

  if (businessType === 'service') {
    baseItems.push({ name: 'Services', href: '/dashboard/services', icon: Box, id: 'nav-services' });
  } else {
    baseItems.push({ name: 'Inventory', href: '/dashboard/inventory', icon: Box, id: 'nav-inventory' });
  }

  const navItems = [
    ...baseItems,
    { name: 'Complaints', href: '/dashboard/complaints', icon: AlertTriangle, id: 'nav-complaints' },
    { name: 'AI Tuning', href: '/dashboard/ai-tuning', icon: Sliders, id: 'nav-tuning' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart, id: 'nav-analytics' },
    { name: 'Credits', href: '/dashboard/credits', icon: Zap, id: 'nav-credits' },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, id: 'nav-settings' },
    { name: 'Playground', href: '/dashboard/sandbox', icon: Sparkles, id: 'nav-sandbox' },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'DB';
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <aside className={`bg-fog border-r border-dove/20 hidden md:flex md:flex-col shrink-0 transition-all duration-300 relative z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-20 flex items-center px-4 border-b border-dove/10 relative">
        {!isCollapsed && <span className="text-2xl font-serif font-medium tracking-tight text-ink px-4">DullBot</span>}
        {isCollapsed && <span className="text-2xl font-serif font-bold tracking-tight text-ink w-full text-center">DB</span>}
      </div>
      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard' 
            ? pathname === item.href 
            : pathname.startsWith(item.href);
            
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              id={item.id}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-inputs text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-white text-ink shadow-subtle border border-dove/10' 
                  : 'text-ash hover:text-ink hover:bg-dove/10 border border-transparent'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-ink' : 'text-graphite'}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className="border-t border-dove/10 flex flex-col justify-center p-4 gap-4">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-full p-2 text-ash hover:text-ink hover:bg-dove/10 rounded-lg transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg 
            viewBox="0 0 24 24" 
            width="18" 
            height="18" 
            stroke="currentColor" 
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="w-8 h-8 shrink-0 rounded-full bg-ink text-pure-white flex items-center justify-center text-xs font-bold shadow-subtle">
            {getInitials(shop?.name)}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-ink truncate">{shop?.name || 'Dull Store'}</span>
                <span className="text-xs text-ash flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 shrink-0 rounded-lg text-dove hover:text-rust hover:bg-apricot-wash transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        
        {isCollapsed && (
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center justify-center w-full p-2 text-dove hover:text-rust hover:bg-apricot-wash rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
