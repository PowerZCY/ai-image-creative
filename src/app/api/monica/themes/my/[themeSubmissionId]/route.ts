import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseThemeSubmissionUpdateInput } from '@/server/monica/validators/theme.validator';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeSubmissionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { themeSubmissionId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const input = parseThemeSubmissionUpdateInput(body);
    const submission = await themeService.updateOwnedDraft(user.userId, themeSubmissionId, input);

    if (!submission) {
      return NextResponse.json({ error: 'Theme submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
