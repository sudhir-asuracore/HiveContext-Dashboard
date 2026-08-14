'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Trash2, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/console/dashboard', label: 'Console Dashboard', icon: Home, exact: true },
    { href: '/console/analytics', label: 'Console Analytics', icon: BarChart2 },
    { href: '/console/trash', label: 'Delete Stage (Trash)', icon: Trash2 },
    { href: '/console/admin', label: 'System Settings', icon: Settings },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };



  return (
    <aside className="sticky top-0 h-screen w-16 border-r border-[#222] bg-[#0a0a0a] flex flex-col items-center py-6 gap-6 shrink-0 z-50 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col gap-3 items-center w-full px-2">
        <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider mb-1">App</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-10 h-10 rounded flex items-center justify-center transition-all duration-200 ${
                active
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'text-slate-500 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-6 items-center w-full px-2 pb-2 relative">
        {/* Large Vertical Brand Typography from Bottom to Middle */}
        <Link 
          href="/console/dashboard"
          className="text-4xl font-black uppercase tracking-[0.15em] font-mono text-slate-700/70 hover:text-red-500 transition-colors select-none rotate-180 cursor-pointer my-4 opacity-90" 
          style={{ writingMode: 'vertical-rl' }}
          title="HiveContext Console Home (Dashboard)"
        >
          HIVECONTEXT
        </Link>

      </div>
    </aside>
  );
}
