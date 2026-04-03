import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const requiredKeys = Object.values(config);

export const isFirebaseConfigured = requiredKeys.every(Boolean);
export const allowedAdminEmail = (import.meta.env.PUBLIC_ALLOWED_ADMIN_EMAIL || '').toLowerCase();

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

export const googleProvider = new GoogleAuthProvider();

export function isAllowedAdmin(user: User | null) {
  return Boolean(user?.email && user.email.toLowerCase() === allowedAdminEmail);
}

export async function signInAsAdmin() {
  if (!auth) {
    throw new Error('Firebase Auth is not configured.');
  }

  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);

  if (!isAllowedAdmin(result.user)) {
    await signOut(auth);
    throw new Error('This account is not authorized for admin access.');
  }

  return result.user;
}

export async function signOutAdmin() {
  if (!auth) {
    return;
  }

  await signOut(auth);
}
