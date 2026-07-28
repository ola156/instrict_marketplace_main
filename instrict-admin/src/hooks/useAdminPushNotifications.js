'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { requestPushPermission, onForegroundMessage } from '@/utils/firebase/client';

export function useAdminPushNotifications(userId) {
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    registerPush();
  }, [userId]);

  const registerPush = async () => {
    const token = await requestPushPermission();
    if (!token) return;

    // Upsert, not update — unlike vendor/student/rider profiles, there's
    // no guaranteed existing admin_notification_tokens row for this user
    // on first login.
    await supabase
      .from('admin_notification_tokens')
      .upsert({ user_id: userId, fcm_token: token, updated_at: new Date().toISOString() });

    await onForegroundMessage(async (payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;

      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, { body, icon: '/icon-192.png' });
      }
    });
  };
}