import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseThemeSubmissionDraftInput } from '@/server/monica/validators/theme.validator';

installBigIntJsonSerialization();

export async function GET(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const page = Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
    const pageSize = Number.parseInt(request.nextUrl.searchParams.get('pageSize') ?? '12', 10);
    const status = request.nextUrl.searchParams.get('status') ?? 'all';
    const result = await themeService.listSubmissions({
      userId: user.userId,
      includeAll: true,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const body = await request.json() as Record<string, unknown>;
    const input = parseThemeSubmissionDraftInput(body);
    const submission = await themeService.createSubmission(user.userId, input);

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
