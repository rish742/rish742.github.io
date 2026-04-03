import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  isAllowedAdmin,
  isFirebaseConfigured,
  signInAsAdmin,
  signOutAdmin,
} from '@/lib/firebase';
import {
  getAllowedEmailLabel,
  getConfigErrorMessage,
  getNextPath,
  setAdminMessage,
  setButtonBusy,
  syncAdminChrome,
} from './admin-auth';

function getErrorMessage() {
  const value = new URLSearchParams(window.location.search).get('error');

  if (value === 'unauthorized') {
    return 'That Google account is not allowed to access the admin area.';
  }

  return '';
}

export function initAdminLoginPage() {
  const button = document.getElementById('admin-google-signin') as HTMLButtonElement | null;
  const feedback = document.getElementById('admin-login-feedback');
  const helper = document.getElementById('admin-login-helper');

  if (helper) {
    helper.textContent = `Allowed admin email: ${getAllowedEmailLabel()}. Google sign-in is enabled for this admin surface.`;
  }

  const initialError = getErrorMessage();
  if (initialError) {
    setAdminMessage(feedback, initialError, 'error');
  }

  if (!isFirebaseConfigured || !auth) {
    setAdminMessage(feedback, getConfigErrorMessage(), 'error');
    syncAdminChrome(null, 'Configuration required');

    if (button) {
      button.disabled = true;
    }

    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user && isAllowedAdmin(user)) {
      syncAdminChrome(user, 'Authorized account');
      window.location.replace(getNextPath('/admin'));
      return;
    }

    if (user && !isAllowedAdmin(user)) {
      await signOutAdmin();
      setAdminMessage(feedback, 'That Google account is not allowed to access the admin area.', 'error');
    }

    syncAdminChrome(null, 'Awaiting sign-in');
  });

  button?.addEventListener('click', async () => {
    setButtonBusy(button, true, 'Signing in...');

    try {
      await signInAsAdmin();
      window.location.assign(getNextPath('/admin'));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sign in with Google right now. Please try again.';
      setAdminMessage(feedback, message, 'error');
      syncAdminChrome(null, 'Sign-in failed');
    } finally {
      setButtonBusy(button, false);
    }
  });
}
