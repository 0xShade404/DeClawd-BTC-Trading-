'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';
import type { UserRole } from '@declawd/shared';

export function Sidebar({ role }: { role: UserRole | undefined }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'ADMIN');

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-black/20 p-4 backdrop-blur-glass md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 pt-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bitcoin-500 text-sm font-bold text-black">
          D
        </span>
        <span className="text-lg font-semibold tracking-tight">DeClawd</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
