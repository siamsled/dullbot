'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquareText, Package, Settings, Sparkles, Box, Zap, LogOut, Sliders, BarChart, AlertTriangle, Megaphone, UtensilsCrossed, ArrowLeftRight, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import DullBotLogo from '@/components/ui/DullBotLogo';

const UNLOCK_ANIM_KEY = 'dullbot_unlocked_anim';
const SIDEBAR_COLLAPSED_KEY = 'dullbot_sidebar_collapsed';

export default function Sidebar({ initialShop }: { initialShop?: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Persistent collapsed state in localStorage across tab switches and refreshes
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });

  // 2. Hover state for temporary hover expansion when collapsed
  const [isHovered, setIsHovered] = useState(false);
  const [shop, setShop] = useState<any>(initialShop || null);
  const [playUnlockAnim, setPlayUnlockAnim] = useState(false);

  const togglePin = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  };

  // Detect unlock animation trigger from ?unlocked=1 query param (one-time)
  useEffect(() => {
    const shouldPlay =
      searchParams.get('unlocked') === '1' &&
      sessionStorage.getItem(UNLOCK_ANIM_KEY) !== '1';
    if (shouldPlay) {
      setPlayUnlockAnim(true);
      sessionStorage.setItem(UNLOCK_ANIM_KEY, '1');
      // Clean the URL param without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('unlocked');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

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
          if (shopRes) setShop(shopRes);
        }
      };
      fetchShop();
    }

    const channel = supabaseBrowser
      .channel('sidebar-shop-onboarding')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shops' }, (payload) => {
        if (shop && payload.new && (payload.new as any).id === shop.id) {
          setShop(payload.new);
        }
      })
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [initialShop, shop?.id]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    if (!shop?.id) return;

    const fetchCounts = async () => {
      const { data } = await supabaseBrowser
        .from('conversations')
        .select('unread_count, status, ticket_reason')
        .eq('shop_id', shop.id);

      if (data) {
        let actionNeeded = 0;
        let unread = 0;
        for (const c of data) {
          if (c.status === 'human_takeover' || c.ticket_reason) {
            actionNeeded += 1;
          } else if (c.unread_count > 0) {
            unread += c.unread_count;
          }
        }
        setActionCount(actionNeeded);
        setUnreadCount(unread);
      }
    };
    fetchCounts();

    const channel = supabaseBrowser
      .channel('sidebar-unread-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `shop_id=eq.${shop.id}` }, () => { fetchCounts(); })
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [shop?.id]);

  const handleSignOut = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'dummy';
    const key = `sb-${projectRef}-auth-token`;
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    await supabaseBrowser.auth.signOut();
    window.location.href = '/login?prompt=select_account&switched=true';
  };

  const businessType = shop?.business_type || 'retail';

  // Build nav items in logical order: Overview (Home) -> Live Inbox -> Orders -> Inventory -> Analytics -> etc.
  const baseItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, id: 'nav-overview' },
    { name: 'Live Inbox', href: '/dashboard/inbox', icon: MessageSquareText, id: 'nav-inbox' },
    { name: 'Orders', href: '/dashboard/orders', icon: Package, id: 'nav-orders' },
  ];

  if (businessType === 'restaurant') {
    baseItems.push({ name: 'Menu / Inventory', href: '/dashboard/inventory', icon: Box, id: 'nav-inventory' });
    baseItems.push({ name: 'Tables & Bookings', href: '/dashboard/services', icon: UtensilsCrossed, id: 'nav-bookings' });
  } else if (businessType === 'service') {
    baseItems.push({ name: 'Services', href: '/dashboard/services', icon: Box, id: 'nav-services' });
  } else {
    baseItems.push({ name: 'Inventory', href: '/dashboard/inventory', icon: Box, id: 'nav-inventory' });
  }

  const rawNavItems = [
    ...baseItems.map(item => ({
      ...item,
      permission: item.id === 'nav-overview' ? 'overview' : item.id === 'nav-inbox' ? 'inbox' : item.id === 'nav-orders' ? 'orders' : 'inventory',
    })),
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart, id: 'nav-analytics', permission: 'analytics' },
    { name: 'Transactions', href: '/dashboard/transactions', icon: ArrowLeftRight, id: 'nav-transactions', permission: 'orders' },
    { name: 'AI Tuning', href: '/dashboard/ai-tuning', icon: Sliders, id: 'nav-tuning', permission: 'settings' },
    { name: 'Social', href: '/dashboard/social', icon: Megaphone, id: 'nav-social', permission: 'settings' },
    { name: 'Credits', href: '/dashboard/credits', icon: Zap, id: 'nav-credits', permission: 'settings' },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, id: 'nav-settings', permission: 'settings' },
  ];

  // RBAC Permission Filter: owners see everything; staff see only their permitted routes
  const isOwner = shop?.isOwner !== false;
  const userPermissions = Array.isArray(shop?.permissions) ? shop.permissions : ['*'];

  const navItems = rawNavItems.filter(item => {
    if (isOwner || userPermissions.includes('*')) return true;
    if (item.permission === 'overview') return true; // Overview always accessible
    return userPermissions.includes(item.permission);
  });

  const getInitials = (name?: string) => {
    if (!name) return 'DB';
    return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  };

  // Effective expansion state: expanded if manually uncollapsed OR temporarily hovered
  const isEffectiveExpanded = !isCollapsed || isHovered;

  return (
    <aside
      onMouseEnter={() => {
        if (isCollapsed) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (isCollapsed) setIsHovered(false);
      }}
      className={`bg-fog border-r border-dove/20 hidden md:flex md:flex-col shrink-0 transition-all duration-300 relative z-30 ${
        isEffectiveExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top Header */}
      <div className={`h-16 flex items-center border-b border-dove/10 shrink-0 overflow-hidden transition-all duration-300 ${
        isEffectiveExpanded ? 'justify-between px-4' : 'justify-center px-0'
      }`}>
        <Link
          href="/dashboard"
          className="flex items-center text-ink hover:opacity-90 transition-opacity shrink-0"
          title="DullBot Dashboard"
        >
          <DullBotLogo collapsed={!isEffectiveExpanded} size="sm" />
        </Link>

        {isEffectiveExpanded && (
          <button
            onClick={togglePin}
            className="w-7 h-7 rounded-lg text-ash hover:text-ink hover:bg-dove/15 transition-all cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-dove/20"
            title={isCollapsed ? "Pin sidebar open" : "Collapse sidebar"}
          >
            <PanelLeftClose className="w-4 h-4 text-ash hover:text-ink transition-colors" />
          </button>
        )}
      </div>

      {/* Nav List - Flexibly Spans Whole Screen Height */}
      <nav className="p-3 flex-1 flex flex-col justify-between min-h-0 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, i) => {
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              id={item.id}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  router.push(item.href);
                }
              }}
              title={!isEffectiveExpanded ? item.name : undefined}
              className={`flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 relative cursor-pointer ${
                isActive
                  ? 'bg-white text-ink shadow-subtle border border-dove/10 font-bold'
                  : 'text-graphite hover:text-ink hover:bg-dove/10 border border-transparent'
              } ${!isEffectiveExpanded ? 'justify-center px-0' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-ink' : 'text-ash'}`} />
              <div 
                className={`flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isEffectiveExpanded ? 'w-[140px] opacity-100 ml-2.5' : 'w-0 opacity-0 ml-0'
                }`}
              >
                <span className="truncate">{item.name}</span>
              </div>
              {item.id === 'nav-inbox' && (actionCount > 0 || unreadCount > 0) && (
                <div className={`absolute transition-all duration-300 flex items-center gap-1 ${
                  !isEffectiveExpanded ? 'top-1 right-1' : 'right-2.5 top-1/2 -translate-y-1/2'
                }`}>
                  {actionCount > 0 && (
                    <span
                      title={`${actionCount} conversation(s) require human attention`}
                      className="flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse shadow-xs"
                    >
                      {actionCount}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span
                      title={`${unreadCount} unread message(s)`}
                      className="flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-blue-600 text-[9px] font-extrabold text-white shadow-xs"
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );

          if (playUnlockAnim) {
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
              >
                {linkContent}
              </motion.div>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Footer Theme Switch & Shop Profile */}
      <div className="p-3 border-t border-dove/10 shrink-0 space-y-2">
        {/* Theme Switch Row */}
        {isEffectiveExpanded ? (
          <div className="flex items-center justify-between px-1.5 py-1 text-xs">
            <span className="text-[11px] font-semibold text-graphite">Appearance</span>
            <ThemeToggle size="md" />
          </div>
        ) : (
          <div className="flex justify-center pb-1">
            <ThemeToggle size="sm" />
          </div>
        )}

        {/* User / Shop Card */}
        {isEffectiveExpanded ? (
          <div className="bg-white border border-dove/15 rounded-xl p-2 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {getInitials(shop?.staffName || shop?.name)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-ink truncate max-w-[95px]">{shop?.staffName || shop?.name || 'Dull Store'}</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-graphite capitalize">
                  {shop?.isOwner === false ? (
                    <span className="text-rust bg-apricot-wash px-1 rounded border border-rust/10 font-bold">{shop?.staffRole || 'Staff'}</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">Owner</span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out / Switch account"
              className="p-1.5 rounded-lg text-ash hover:text-rust hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center pb-1">
            <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold shadow-xs" title={shop?.name || 'Dull Store'}>
              {getInitials(shop?.name)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
