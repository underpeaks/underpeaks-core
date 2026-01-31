import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let authInstance: Auth | null = null;
let appInstance: App | null = null;

function getServiceAccount() {
  const raw = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error(
      'Missing NEXT_DB_FIREBASE_SERVICE_ACCOUNT in environment'
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'NEXT_DB_FIREBASE_SERVICE_ACCOUNT is not valid JSON'
    );
  }
}

export function getFirebaseAdminAuth(configJson?: Record<string, any>): Auth {
  if (authInstance) return authInstance;

  const serviceAccount = configJson || getServiceAccount();

  appInstance =
    getApps().length === 0
      ? initializeApp({
          credential: cert(serviceAccount),
        })
      : getApps()[0];

  authInstance = getAuth(appInstance);
  return authInstance;
}

