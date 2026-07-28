import { Package, Truck, History, Wallet, User, MessageSquare } from 'lucide-react';

export const RUNNER_NAV_ITEMS = [
  { href: '/jobs', label: 'Jobs', icon: Package },
  { href: '/active', label: 'Active', icon: Truck, badgeKey: 'hasActiveJob' },
  { href: '/runner/history', label: 'History', icon: History },
  { href: '/runner/earnings', label: 'Earnings', icon: Wallet },
  // desktopOnly: shown in the sidebar, deliberately left out of the
  // mobile bottom nav — riders are often mid-delivery on a phone, and a
  // social feed competing for space with Jobs/Active isn't great there.
  { href: '/runner/community', label: 'Community', icon: MessageSquare, desktopOnly: true },
  { href: '/runner/profile', label: 'Profile', icon: User },
];