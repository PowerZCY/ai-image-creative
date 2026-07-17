'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { useCallback } from 'react';
import { useFingerprintContextSafe } from '@windrun-huaiin/third-ui/fingerprint';
import { appConfig } from '@/lib/appConfig';

const clerkAuthModalAppearance = {
  elements: {
    modalContent: '!items-start !pt-16 sm:!pt-24',
    cardBox: '!mt-0',
  },
};

export function useMonicaSignUp() {
  const { openSignUp, redirectToSignUp } = useClerk();
  const { isSignedIn } = useUser();
  const fingerprint = useFingerprintContextSafe();

  const openMonicaSignUp = useCallback(async () => {
    if (isSignedIn) return;
    if (!fingerprint?.isInitialized && fingerprint?.fingerprintId) {
      await fingerprint.initializeAnonymousUser();
    }

    if (!appConfig.style.clerkAuthInModal) {
      redirectToSignUp();
      return;
    }

    openSignUp({
      appearance: clerkAuthModalAppearance,
      unsafeMetadata: {
        user_id: fingerprint?.xUser?.userId ?? null,
        fingerprint_id: fingerprint?.fingerprintId ?? null,
      },
    });
  }, [fingerprint, isSignedIn, openSignUp, redirectToSignUp]);

  return { isSignedIn: Boolean(isSignedIn), openMonicaSignUp };
}
