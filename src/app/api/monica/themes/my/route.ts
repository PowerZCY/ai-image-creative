import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalServerAuthUser } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseThemeSubmissionInput } from '@/server/monica/validators/theme.validator';
import { MONICA_ERROR_CODE, monicaError } from '@/server/monica/api-error';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authenticated = await getOptionalServerAuthUser();
    if (!authenticated) {
      return monicaError(MONICA_ERROR_CODE.LOGIN_REQUIRED, 'Create an account to submit a theme.', 403);
    }
    const body = await request.json() as Record<string, unknown>;
    const input = parseThemeSubmissionInput(body);
    const result = await themeService.createSubmission(authenticated.user.userId, input);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
