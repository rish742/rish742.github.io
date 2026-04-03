import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  allowedAdminEmail,
  auth,
  isAllowedAdmin,
  isFirebaseConfigured,
  signOutAdmin,
} from '@/lib/firebase';

export type AdminAccessResult =
  | { status: 'authorized'; user: User }
  | { status: 'config-missing' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized' };

type NoticeTone = 'info' | 'success' | 'error';

function setText(selector: string, value: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = value;
  });
}

function buildLoginUrl(reason?: string) {
  const url = new URL('/admin/login', window.location.origin);
  const next = `${window.location.pathname}${window.location.search}`;

  if (next && next !== '/admin/login') {
    url.searchParams.set('next', next);
  }

  if (reason) {
    url.searchParams.set('error', reason);
  }

  return `${url.pathname}${url.search}`;
}

function bindSignOutButtons() {
  document.querySelectorAll<HTMLElement>('[data-admin-signout]').forEach((button) => {
    if (button.dataset.bound === 'true') {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', async () => {
      button.setAttribute('aria-busy', 'true');

      try {
        await signOutAdmin();
      } finally {
        window.location.assign('/admin/login');
      }
    });
  });
}

function waitForAuthState() {
  if (!auth) {
    return Promise.resolve<User | null>(null);
  }

  return new Promise<User | null>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  });
}

export function getAllowedEmailLabel() {
  return allowedAdminEmail || 'PUBLIC_ALLOWED_ADMIN_EMAIL is not set';
}

export function getConfigErrorMessage() {
  if (!isFirebaseConfigured) {
    return 'Firebase client config is missing. Set the PUBLIC_FIREBASE_* variables and rebuild the site.';
  }

  if (!allowedAdminEmail) {
    return 'PUBLIC_ALLOWED_ADMIN_EMAIL is missing. Add it to your environment file and rebuild the site.';
  }

  return '';
}

export function getNextPath(defaultPath = '/admin') {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') ? next : defaultPath;
}

export function setAdminMessage(
  target: HTMLElement | null,
  message: string,
  tone: NoticeTone = 'info',
) {
  if (!target) {
    return;
  }

  target.hidden = false;
  target.dataset.tone = tone;
  target.textContent = message;
}

export function clearAdminMessage(target: HTMLElement | null) {
  if (!target) {
    return;
  }

  target.hidden = true;
  target.textContent = '';
  delete target.dataset.tone;
}

export function setButtonBusy(
  button: HTMLButtonElement | null,
  busy: boolean,
  busyLabel?: string,
  idleLabel?: string,
) {
  if (!button) {
    return;
  }

  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = idleLabel || button.textContent || '';
  }

  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.textContent = busy ? busyLabel || button.dataset.idleLabel || '' : button.dataset.idleLabel || '';
}

export function syncAdminChrome(user: User | null, stateLabel?: string) {
  setText('[data-admin-email]', user?.email || 'Guest');
  setText('[data-admin-state-label]', stateLabel || (user ? 'Authorized account' : 'Sign-in required'));

  document.querySelectorAll<HTMLElement>('[data-admin-signout]').forEach((button) => {
    button.hidden = !user;
  });

  bindSignOutButtons();
}

export async function ensureAdminAccess(options?: { redirectToLogin?: boolean }) {
  const redirectToLogin = options?.redirectToLogin ?? true;

  if (!isFirebaseConfigured || !allowedAdminEmail) {
    syncAdminChrome(null, 'Configuration required');
    return { status: 'config-missing' } satisfies AdminAccessResult;
  }

  const user = await waitForAuthState();

  if (!user) {
    syncAdminChrome(null, 'Sign-in required');

    if (redirectToLogin) {
      window.location.replace(buildLoginUrl());
    }

    return { status: 'unauthenticated' } satisfies AdminAccessResult;
  }

  if (!isAllowedAdmin(user)) {
    syncAdminChrome(null, 'Unauthorized account');
    await signOutAdmin();

    if (redirectToLogin) {
      window.location.replace(buildLoginUrl('unauthorized'));
    }

    return { status: 'unauthorized' } satisfies AdminAccessResult;
  }

  syncAdminChrome(user, 'Authorized account');
  return { status: 'authorized', user } satisfies AdminAccessResult;
}
