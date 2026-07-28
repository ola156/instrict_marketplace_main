import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let adminMessaging = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      '[firebaseAdmin] Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY — ' +
      'push notifications are disabled until these are set. This must never crash the app.'
    );
  } else {
    const app = getApps().length ? getApps()[0] : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    adminMessaging = getMessaging(app);
  }
} catch (err) {
  // Firebase config problems must NEVER take down routes that import this
  // file (checkout, payment verify, etc.) — this ran once and crashed the
  // whole payment verification route because the throw happened at
  // module-import time, before any request-specific code even ran.
  console.error('[firebaseAdmin] Failed to initialize, push notifications disabled:', err);
}

// Callers (sendPush.js) already check for a falsy adminMessaging before
// using it, so this export is safe to be null.
export { adminMessaging };