'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';



import { loadDbFromEnv } from '@/app/lib/loadDbFromEnv';

let authInstance: any;

export function getFirebaseAuth() {
  if (authInstance) return authInstance;

  const { firebaseConfig } = loadDbFromEnv();

  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];

  authInstance = getAuth(app);
  return authInstance;
}


