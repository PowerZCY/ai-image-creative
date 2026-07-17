import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parsePublishThemeInput } from '@/server/monica/validators/theme.validator';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeSubmissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireMonicaAdmin();
    const { themeSubmissionId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const input = parsePublishThemeInput(body);
    const previousTheme = await themeService.findAdminThemeBySourceSubmissionId(themeSubmissionId);
    const wasOnHome = previousTheme
      ? await themeService.isCurrentHomeTheme(previousTheme.id)
      : false;
    const result = await themeService.publishFromSubmission(user.userId, themeSubmissionId, input);
    if (!result) return NextResponse.json({ error: 'Theme submission not found' }, { status: 404 });
    revalidatePath('/themes');
    revalidatePath(`/themes/${result.theme.slug}`);
    if (wasOnHome || await themeService.isCurrentHomeTheme(result.theme.id)) {
      revalidatePath('/[locale]', 'page');
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
