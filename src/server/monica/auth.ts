import { getOptionalServerAuthUser, type AuthResult } from '@windrun-huaiin/backend-core/auth/server';
import { anonymousAggregateService } from '@windrun-huaiin/backend-core/aggregate';
import { UserStatus } from '@windrun-huaiin/backend-core/database';
import { extractFingerprintFromNextRequest } from '@windrun-huaiin/third-ui/fingerprint/server';
import type { NextRequest } from 'next/server';

export type MonicaActor = Pick<AuthResult, 'user'> & { isAnonymous: boolean };

export class MonicaLoginRequiredError extends Error {}

export async function resolveMonicaActor(request: NextRequest): Promise<MonicaActor> {
  const authenticated = await getOptionalServerAuthUser();
  if (authenticated) {
    return { user: authenticated.user, isAnonymous: false };
  }

  const fingerprintId = extractFingerprintFromNextRequest(request);
  if (!fingerprintId) {
    throw new MonicaLoginRequiredError('Create an account to continue.');
  }

  const anonymous = await anonymousAggregateService.getOrCreateByFingerprintId(fingerprintId);
  if (anonymous.user.status !== UserStatus.ANONYMOUS) {
    throw new MonicaLoginRequiredError('Create an account to continue.');
  }

  return { user: anonymous.user, isAnonymous: true };
}

export function getMonicaAdminClerkIds() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isMonicaAdmin(clerkUserId?: string | null) {
  return Boolean(clerkUserId && getMonicaAdminClerkIds().has(clerkUserId));
}

export async function requireMonicaAdmin() {
  const authenticated = await getOptionalServerAuthUser();
  if (!authenticated || !isMonicaAdmin(authenticated.providerUserId)) {
    throw new MonicaLoginRequiredError('Administrator access is required.');
  }
  return authenticated;
}
