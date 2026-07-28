'use client';

import { useRunner } from '../context/RunnerProvider';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function RunnerMainContent({ children }) {
  const { showNotifications } = useRunner();
  return showNotifications ? <NotificationCenter /> : children;
}