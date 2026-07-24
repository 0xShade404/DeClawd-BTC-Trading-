import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  LineChart,
  History,
  ShieldCheck,
  ArrowUpFromLine,
  Settings,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Markets', href: '/markets', icon: LineChart },
  { label: 'History', href: '/history', icon: History },
  { label: 'Vault', href: '/vault', icon: ShieldCheck },
  { label: 'Withdraw', href: '/withdraw', icon: ArrowUpFromLine },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help', href: '/help', icon: HelpCircle },
  { label: 'Admin', href: '/admin', icon: ShieldAlert, adminOnly: true },
];

/** Bottom nav on mobile only shows the most-used items to avoid crowding. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0]!,
  NAV_ITEMS[1]!,
  NAV_ITEMS[2]!,
  NAV_ITEMS[3]!,
  NAV_ITEMS[5]!,
];
