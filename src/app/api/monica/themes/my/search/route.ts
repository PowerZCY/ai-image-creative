import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalServerAuthUser } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import type { MonicaPagedRequest } from '@/server/monica/types/pagination';
import { MONICA_ERROR_CODE, monicaError } from '@/server/monica/api-error';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authenticated = await getOptionalServerAuthUser();
    if (!authenticated) {
      return monicaError(MONICA_ERROR_CODE.LOGIN_REQUIRED, 'Create an account to view your submissions.', 403);
    }
    const body = await request.json() as MonicaPagedRequest;
    const result = await themeService.searchSubmissions({
      ...body,
      currentUserId: authenticated.user.userId,
      includeAll: false,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
