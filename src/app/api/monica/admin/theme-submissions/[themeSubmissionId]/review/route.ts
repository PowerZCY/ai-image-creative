import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseThemeReviewInput } from '@/server/monica/validators/theme.validator';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeSubmissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireMonicaAdmin();
    const { themeSubmissionId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const input = parseThemeReviewInput(body);
    const submission = await themeService.reviewSubmission(user.userId, themeSubmissionId, input.action, input.reason);
    if (!submission) return NextResponse.json({ error: 'Theme submission not found' }, { status: 404 });
    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
