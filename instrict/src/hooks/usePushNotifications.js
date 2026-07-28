'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { requestPushPermission, onForegroundMessage } from '@/utils/firebase/client';

/**
 * @param {string} userId - the auth/profile id to key the update on
 * @param {object} options
 * @param {string} options.table - profile table name, e.g. 'vendor_profiles', 'student_profiles', 'rider_profiles'
 * @param {string} options.idColumn - column to match userId against, e.g. 'user_id' or 'id'
 */
export function usePushNotifications(userId, { table, idColumn = 'user_id' } = {}) {
  const supabase = createClient();

  useEffect(() => {
    if (!userId || !table) return;
    registerPush();
  }, [userId, table]);

  const registerPush = async () => {
    const token = await requestPushPermission();
    if (!token) return;

    await supabase
      .from(table)
      .update({ fcm_token: token })
      .eq(idColumn, userId);

    await onForegroundMessage(async (payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;

      // Chrome (and others) throw "Illegal constructor" on `new Notification()`
      // once a service worker is registered for this origin — foreground
      // notifications have to go through the SW's registration instead.
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, { body, icon: '/icon-192.png' });
      }
    });
  };
}