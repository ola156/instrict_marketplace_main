importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// These are the NEXT_PUBLIC_ Firebase values — safe to inline since they're
// already public in the client bundle. Initializing synchronously here
// (top-level, not inside install/activate) guarantees this runs every time
// the service worker executes, including when it wakes up SOLELY to
// handle an incoming push event. install/activate only fire once per SW
// version, so anything needed for push handling can't live only in there.
firebase.initializeApp({
  apiKey: 'AIzaSyDyJ9Q62nkAGc6gRloNovgRT4HefXoJZQs',
  authDomain: 'instrict-82844.firebaseapp.com',
  projectId: 'instrict-82844',
  storageBucket: 'instrict-82844.firebasestorage.app',
  messagingSenderId: '523608889363',
  appId: '1:523608889363:web:bea4de55588bdcbf42c7e6',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'New notification', {
    body: body || '',
    icon: icon || '/logo.svg',
    badge: '/logo.svg',
  });
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});