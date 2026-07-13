import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parsePublishThemeInput } from '@/server/monica/validators/theme.validator';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeSubmissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { themeSubmissionId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const input = parsePublishThemeInput(body);
    const result = await themeService.publishFromSubmission(user.userId, themeSubmissionId, input);
    if (!result) return NextResponse.json({ error: 'Theme submission not found' }, { status: 404 });
    revalidatePath('/themes');
    revalidatePath(`/themes/${result.theme.slug}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
