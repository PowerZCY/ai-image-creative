import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { submissionService } from '@/server/monica/services/submission.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { themeId } = await context.params;
    const body = await request.json() as { imageId?: string; title?: string; altText?: string; creationNote?: string };
    if (!body.imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }
    const publicImage = await submissionService.addGeneratedImageToTheme(user.userId, {
      imageId: body.imageId,
      themeId,
      title: body.title,
      altText: body.altText,
      creationNote: body.creationNote,
    });
    return NextResponse.json({ publicImage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
